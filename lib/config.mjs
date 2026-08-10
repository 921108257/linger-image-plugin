/**
 * 多渠道配置解析。零依赖。
 *
 * 配置来源，按优先级从高到低：
 *   1. $LINGER_IMAGE_CONFIG 指向的文件
 *   2. 从 cwd 向上查找的 .linger-image.json（到仓库根 / 文件系统根为止）
 *   3. ~/.linger-image/config.json
 *   4. 环境变量合成的单渠道（LINGER_VISION_* / DASHSCOPE_* / OPENAI_*）
 *
 * 多个来源会合并：渠道按 name 去重，高优先级的来源覆盖同名渠道。
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const USER_CONFIG_PATH = path.join(os.homedir(), ".linger-image", "config.json");
export const PROJECT_CONFIG_NAME = ".linger-image.json";

/** 预置渠道模板，install --channel qwen 时用来生成骨架 */
export const CHANNEL_PRESETS = {
  qwen: {
    name: "qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-vl-max",
    apiKey: "env:DASHSCOPE_API_KEY",
  },
  openai: {
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKey: "env:OPENAI_API_KEY",
  },
  zhipu: {
    name: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4v-flash",
    apiKey: "env:ZHIPU_API_KEY",
  },
  siliconflow: {
    name: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-VL-72B-Instruct",
    apiKey: "env:SILICONFLOW_API_KEY",
  },
  ollama: {
    name: "ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3.2-vision",
    apiKey: "ollama",
  },
  custom: {
    name: "custom",
    baseUrl: "https://your-endpoint.example.com/v1",
    model: "your-vision-model",
    apiKey: "env:LINGER_VISION_API_KEY",
  },
};

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return { data: JSON.parse(raw), file };
  } catch (err) {
    if (err.code === "ENOENT") return null;
    if (err instanceof SyntaxError) {
      throw new Error(`配置文件 JSON 语法错误: ${file}\n  ${err.message}`);
    }
    throw err;
  }
}

/** 从 startDir 向上找 .linger-image.json，遇到仓库根就停 */
function findProjectConfig(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, PROJECT_CONFIG_NAME);
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(path.join(dir, ".git"))) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** 环境变量合成渠道。没有可用 key 时返回 null */
function channelFromEnv(env) {
  const key =
    env.LINGER_VISION_API_KEY ||
    env.DASHSCOPE_API_KEY ||
    env.OPENAI_API_KEY ||
    env.ZHIPU_API_KEY ||
    env.SILICONFLOW_API_KEY;
  if (!key) return null;

  let baseUrl = env.LINGER_VISION_BASE_URL;
  let model = env.LINGER_VISION_MODEL;
  if (!baseUrl) {
    if (env.LINGER_VISION_API_KEY) baseUrl = CHANNEL_PRESETS.openai.baseUrl;
    else if (env.DASHSCOPE_API_KEY) baseUrl = CHANNEL_PRESETS.qwen.baseUrl;
    else if (env.OPENAI_API_KEY) baseUrl = CHANNEL_PRESETS.openai.baseUrl;
    else if (env.ZHIPU_API_KEY) baseUrl = CHANNEL_PRESETS.zhipu.baseUrl;
    else baseUrl = CHANNEL_PRESETS.siliconflow.baseUrl;
  }
  if (!model) {
    if (env.DASHSCOPE_API_KEY) model = CHANNEL_PRESETS.qwen.model;
    else if (env.ZHIPU_API_KEY) model = CHANNEL_PRESETS.zhipu.model;
    else if (env.SILICONFLOW_API_KEY) model = CHANNEL_PRESETS.siliconflow.model;
    else model = CHANNEL_PRESETS.openai.model;
  }
  return { name: "env", baseUrl, model, apiKey: key, _source: "环境变量" };
}

/** apiKey 支持 "env:VAR_NAME" 间接引用，这样配置文件可以进版本库 */
function resolveApiKey(value, env) {
  if (typeof value !== "string") return "";
  const m = /^env:(.+)$/.exec(value.trim());
  if (!m) return value;
  return env[m[1].trim()] || "";
}

function normalizeChannel(raw, source, env) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || raw.id || "").trim();
  if (!name) return null;
  const baseUrl = String(raw.baseUrl || raw.base_url || raw.endpoint || "").trim();
  const model = String(raw.model || "").trim();
  return {
    name,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    apiKey: resolveApiKey(raw.apiKey ?? raw.api_key ?? "", env),
    apiKeyRef: typeof raw.apiKey === "string" && raw.apiKey.startsWith("env:") ? raw.apiKey : null,
    maxTokens: Number(raw.maxTokens ?? raw.max_tokens ?? 2048),
    temperature: raw.temperature ?? undefined,
    timeoutMs: Number(raw.timeoutMs ?? raw.timeout_ms ?? 120000),
    detail: raw.detail ?? undefined,
    maxImageBytes: Number(raw.maxImageBytes ?? 10 * 1024 * 1024),
    headers: raw.headers && typeof raw.headers === "object" ? raw.headers : {},
    skills: raw.skills && typeof raw.skills === "object" ? raw.skills : {},
    _source: source,
  };
}

/**
 * 解析配置。
 * @returns {{channels: Array, defaultChannel: string|null, sources: string[], failover: boolean}}
 */
export function loadConfig({ cwd = process.cwd(), env = process.env, userConfigPath = USER_CONFIG_PATH } = {}) {
  const layers = [];

  const explicit = env.LINGER_IMAGE_CONFIG;
  if (explicit) {
    const hit = readJson(path.resolve(explicit));
    if (!hit) throw new Error(`LINGER_IMAGE_CONFIG 指向的文件不存在: ${explicit}`);
    layers.push(hit);
  }

  const projectFile = findProjectConfig(cwd);
  if (projectFile && (!explicit || path.resolve(explicit) !== projectFile)) {
    const hit = readJson(projectFile);
    if (hit) layers.push(hit);
  }

  const userHit = readJson(userConfigPath);
  if (userHit) layers.push(userHit);

  // 低优先级在前地合并，后面的层覆盖前面的层
  const byName = new Map();
  let defaultChannel = null;
  let failover = true;
  const sources = [];

  for (const layer of [...layers].reverse()) {
    sources.push(layer.file);
    const raw = layer.data || {};
    const list = Array.isArray(raw.channels)
      ? raw.channels
      : raw.channels && typeof raw.channels === "object"
        ? Object.entries(raw.channels).map(([name, v]) => ({ name, ...v }))
        : [];
    for (const item of list) {
      const ch = normalizeChannel(item, layer.file, env);
      if (ch) byName.set(ch.name, ch);
    }
    if (raw.defaultChannel) defaultChannel = String(raw.defaultChannel);
    if (typeof raw.failover === "boolean") failover = raw.failover;
  }

  const envChannel = channelFromEnv(env);
  if (envChannel && !byName.has("env")) {
    const ch = normalizeChannel(envChannel, "环境变量", env);
    ch.apiKey = envChannel.apiKey;
    byName.set(ch.name, ch);
    if (!sources.length) sources.push("环境变量");
  }

  // 显式环境变量覆盖优先渠道
  if (env.LINGER_VISION_CHANNEL) defaultChannel = env.LINGER_VISION_CHANNEL;
  if (env.LINGER_VISION_FAILOVER === "0") failover = false;

  const channels = [...byName.values()];
  if (defaultChannel && !byName.has(defaultChannel)) {
    // 指定了不存在的渠道，保留原值让调用方报清晰的错
  } else if (!defaultChannel && channels.length) {
    defaultChannel = channels[0].name;
  }

  return { channels, defaultChannel, sources, failover };
}

/**
 * 按调用顺序返回渠道列表：首选渠道在前，其余作为故障转移候选。
 * @param {object} cfg loadConfig 的返回值
 * @param {string=} preferred --channel 指定的渠道名
 */
export function resolveChannelOrder(cfg, preferred) {
  if (!cfg.channels.length) {
    throw new Error(
      "没有配置任何识图渠道。\n" +
        `  运行 npx linger-image-plugin config --channel qwen 生成 ${USER_CONFIG_PATH}\n` +
        "  或设置环境变量 LINGER_VISION_API_KEY / LINGER_VISION_BASE_URL / LINGER_VISION_MODEL",
    );
  }
  const want = preferred || cfg.defaultChannel;
  const head = cfg.channels.filter((c) => c.name === want);
  if (want && !head.length) {
    throw new Error(
      `渠道 "${want}" 不存在。已配置: ${cfg.channels.map((c) => c.name).join(", ")}`,
    );
  }
  const rest = cfg.failover ? cfg.channels.filter((c) => c.name !== want) : [];
  return [...head, ...rest];
}

/** 渠道自身缺什么，返回人话 */
export function validateChannel(ch) {
  const missing = [];
  if (!ch.baseUrl) missing.push("baseUrl");
  if (!ch.model) missing.push("model");
  if (!ch.apiKey) {
    missing.push(ch.apiKeyRef ? `apiKey（${ch.apiKeyRef} 未设置）` : "apiKey");
  }
  return missing;
}
