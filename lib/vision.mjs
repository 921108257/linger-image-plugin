/**
 * OpenAI 兼容 vision 客户端。零依赖，用 node:fetch。
 * 负责：图片编码、请求构造、多渠道故障转移。
 */

import fs from "node:fs";
import path from "node:path";
import { validateChannel } from "./config.mjs";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".avif": "image/avif",
  ".heic": "image/heic",
};

/** 从文件头识别真实类型，扩展名不可信（截图工具经常给 .png 起个 .jpg 名） */
function sniffMime(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (buf.length > 6 && buf.subarray(0, 6).toString("latin1").startsWith("GIF8")) return "image/gif";
  if (buf.length > 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" &&
      buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.length > 2 && buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  if (buf.length > 12 && buf.subarray(4, 12).toString("latin1").includes("ftyp")) {
    const brand = buf.subarray(8, 12).toString("latin1");
    if (brand.startsWith("avif")) return "image/avif";
    if (brand.startsWith("heic") || brand.startsWith("mif1")) return "image/heic";
  }
  return null;
}

/**
 * 把图片来源变成 image_url 可用的值。
 * http(s) URL 直接透传；本地文件读成 data URL。
 */
export function encodeImage(source, { maxImageBytes = 10 * 1024 * 1024 } = {}) {
  if (/^https?:\/\//i.test(source)) return { url: source, kind: "url" };
  if (/^data:image\//i.test(source)) return { url: source, kind: "data" };

  // Windows 上路径可能带引号或 file:// 前缀
  let file = source.trim().replace(/^["']|["']$/g, "");
  if (/^file:\/\//i.test(file)) file = decodeURIComponent(new URL(file).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`图片不存在: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) throw new Error(`这是目录，不是图片: ${resolved}`);
  if (stat.size === 0) throw new Error(`图片是空文件: ${resolved}`);
  if (stat.size > maxImageBytes) {
    throw new Error(
      `图片 ${(stat.size / 1048576).toFixed(1)}MB 超过上限 ${(maxImageBytes / 1048576).toFixed(1)}MB。` +
        `\n  多数渠道对 base64 请求体有限制，先压缩或改用图片 URL。`,
    );
  }
  const buf = fs.readFileSync(resolved);
  const mime = sniffMime(buf) || MIME[path.extname(resolved).toLowerCase()] || "image/jpeg";
  return {
    url: `data:${mime};base64,${buf.toString("base64")}`,
    kind: "file",
    bytes: stat.size,
    mime,
    path: resolved,
  };
}

function buildMessages({ images, prompt, system, detail }) {
  const content = [];
  for (const img of images) {
    const image_url = { url: img.url };
    if (detail) image_url.detail = detail;
    content.push({ type: "image_url", image_url });
  }
  content.push({ type: "text", text: prompt });
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content });
  return messages;
}

/** 从 OpenAI 兼容响应里抽文本，不同厂商结构有差异 */
function extractText(json) {
  const msg = json?.choices?.[0]?.message;
  if (!msg) return null;
  if (typeof msg.content === "string" && msg.content.trim()) return msg.content;
  // 有些渠道（含部分 qwen 版本）返回数组形式的 content
  if (Array.isArray(msg.content)) {
    const text = msg.content
      .map((p) => (typeof p === "string" ? p : p?.text || ""))
      .join("")
      .trim();
    if (text) return text;
  }
  // 推理模型可能只给 reasoning_content
  if (typeof msg.reasoning_content === "string" && msg.reasoning_content.trim()) {
    return msg.reasoning_content;
  }
  return null;
}

async function callChannel(channel, { images, prompt, system, signal }) {
  const missing = validateChannel(channel);
  if (missing.length) {
    throw new Error(`渠道 "${channel.name}" 配置不完整，缺少: ${missing.join(", ")}`);
  }
  const url = `${channel.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const body = {
    model: channel.model,
    messages: buildMessages({ images, prompt, system, detail: channel.detail }),
    max_tokens: channel.maxTokens,
    stream: false,
  };
  if (channel.temperature !== undefined) body.temperature = channel.temperature;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(new Error("timeout")), channel.timeoutMs);
  if (signal) signal.addEventListener("abort", () => ac.abort(), { once: true });

  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.apiKey}`,
        "Content-Type": "application/json",
        ...channel.headers,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (ac.signal.aborted) {
      throw new Error(`渠道 "${channel.name}" 超时（${channel.timeoutMs}ms）`);
    }
    throw new Error(`渠道 "${channel.name}" 网络错误: ${err.message}`);
  }
  clearTimeout(timer);

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw.slice(0, 400);
    try {
      const j = JSON.parse(raw);
      detail = j?.error?.message || j?.message || detail;
    } catch {}
    const hint =
      res.status === 401 || res.status === 403
        ? "（API Key 无效或无权限）"
        : res.status === 404
          ? "（baseUrl 或模型名不对）"
          : res.status === 429
            ? "（触发限流或余额不足）"
            : "";
    throw new Error(`渠道 "${channel.name}" HTTP ${res.status}${hint}: ${detail}`);
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`渠道 "${channel.name}" 返回了非 JSON: ${raw.slice(0, 200)}`);
  }
  const text = extractText(json);
  if (!text) {
    throw new Error(
      `渠道 "${channel.name}" 返回空内容。模型可能不支持图片输入，检查 model 是否是 vision 型号。` +
        `\n  原始响应: ${raw.slice(0, 300)}`,
    );
  }
  return {
    text,
    channel: channel.name,
    model: channel.model,
    ms: Date.now() - started,
    usage: json.usage || null,
  };
}

/**
 * 按渠道顺序依次尝试，第一个成功即返回。
 * @returns {Promise<{text,channel,model,ms,usage,attempts}>}
 */
export async function analyze({ channels, images, prompt, system, signal, onAttempt }) {
  const attempts = [];
  for (const channel of channels) {
    try {
      onAttempt?.({ channel: channel.name, model: channel.model, status: "start" });
      const out = await callChannel(channel, { images, prompt, system, signal });
      return { ...out, attempts };
    } catch (err) {
      attempts.push({ channel: channel.name, error: err.message });
      onAttempt?.({ channel: channel.name, status: "fail", error: err.message });
    }
  }
  const detail = attempts.map((a) => `  - ${a.error}`).join("\n");
  throw new Error(`所有渠道都失败了（尝试 ${attempts.length} 个）:\n${detail}`);
}
