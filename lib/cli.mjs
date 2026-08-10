/**
 * linger-image-plugin CLI 核心。
 *
 *   linger-image <skill> <图片...> [问题] [选项]
 *   linger-image channels
 *   linger-image config --channel qwen
 *   linger-image doctor
 *
 * 选项:
 *   --channel <name>   指定渠道（默认用 defaultChannel）
 *   --json             输出 JSON（供程序消费）
 *   --no-failover      单渠道失败即退出，不尝试其他渠道
 *   --quiet            不打印渠道调试信息
 */

import fs from "node:fs";
import path from "node:path";
import {
  loadConfig,
  resolveChannelOrder,
  validateChannel,
  CHANNEL_PRESETS,
  USER_CONFIG_PATH,
} from "./config.mjs";
import { analyze, encodeImage } from "./vision.mjs";
import { getPromptForSkill, SKILL_PROMPTS } from "./prompts.mjs";

const SKILLS = Object.keys(SKILL_PROMPTS);
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|tiff?|avif|heic)$/i;

export function parseArgs(argv) {
  const out = { command: "", images: [], question: "", channel: "", json: false, failover: null, quiet: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--channel" || a === "-c") out.channel = argv[++i] || "";
    else if (a.startsWith("--channel=")) out.channel = a.slice(10);
    else if (a === "--json") out.json = true;
    else if (a === "--no-failover") out.failover = false;
    else if (a === "--quiet" || a === "-q") out.quiet = true;
    else if (a === "--help" || a === "-h") out.command = out.command || "help";
    else if (a === "--version" || a === "-v") out.command = "version";
    else rest.push(a);
  }
  if (!out.command || out.command === "help") {
    if (rest.length && SKILLS.includes(rest[0])) out.command = rest.shift();
    else if (
      rest.length &&
      ["channels", "config", "doctor", "help", "skills", "install", "uninstall"].includes(rest[0])
    )
      out.command = rest.shift();
    else if (!out.command) out.command = rest.length ? "image-vision" : "help";
  }

  // 图片 vs 问题：存在的文件 / URL / 图片扩展名算图片，其余拼成问题
  for (const token of rest) {
    const looksLikeImage =
      /^https?:\/\//i.test(token) ||
      /^data:image\//i.test(token) ||
      IMAGE_EXT.test(token) ||
      (!out.question && safeExists(token));
    if (looksLikeImage && !out.question) out.images.push(token);
    else out.question = out.question ? `${out.question} ${token}` : token;
  }
  return out;
}

function safeExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function maskKey(k) {
  if (!k) return "(未设置)";
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}****${k.slice(-4)}`;
}

const HELP = `linger-image-plugin — 给没有原生识图能力的 Agent 加上识图能力

用法:
  linger-image <技能> <图片...> [问题] [选项]

技能:
  image-vision         通用图片识别（默认）
  ui-ux-vision         UI/UX 界面分析，输出组件清单和设计 token
  ui-material-design   根据参考图生成 UI 素材设计提示词

其他命令:
  channels             列出已配置的渠道及其状态
  config [--channel X] 生成/追加用户级配置文件
  doctor               自检配置和连通性
  install              安装插件到已检测到的 Agent (--agent X 手动指定, --all 全部, --local 项目级)
  uninstall            卸载插件 (--agent X, --all)
  help                 显示本帮助

选项:
  -c, --channel <name> 指定渠道
      --json           输出 JSON
      --no-failover    不做故障转移
  -q, --quiet          安静模式

示例:
  linger-image image-vision ./shot.png
  linger-image ui-ux-vision ./design.png "重点看导航和栅格"
  linger-image ui-material-design ./ref.jpg "生成深色系图标素材提示词"
  linger-image image-vision --url https://example.com/a.png
  linger-image image-vision ./a.png --channel openai --json

安装:
  npx linger-image-plugin install              # 自动检测已装的 Agent
  npx linger-image-plugin install --all        # 装到所有支持的 Agent
  npx linger-image-plugin install --agent claude,kiro
  npx linger-image-plugin uninstall --all

配置（优先级从高到低）:
  1. $LINGER_IMAGE_CONFIG 指向的文件
  2. 向上查找的 .linger-image.json
  3. ${USER_CONFIG_PATH}
  4. 环境变量 LINGER_VISION_API_KEY / _BASE_URL / _MODEL
`;

function cmdChannels(cfg, json) {
  if (json) {
    return JSON.stringify(
      {
        defaultChannel: cfg.defaultChannel,
        failover: cfg.failover,
        sources: cfg.sources,
        channels: cfg.channels.map((c) => ({
          name: c.name,
          baseUrl: c.baseUrl,
          model: c.model,
          hasKey: Boolean(c.apiKey),
          missing: validateChannel(c),
        })),
      },
      null,
      2,
    );
  }
  if (!cfg.channels.length) {
    return `没有配置任何渠道。\n运行: linger-image config --channel qwen\n配置文件位置: ${USER_CONFIG_PATH}`;
  }
  const lines = [`已配置 ${cfg.channels.length} 个渠道（默认: ${cfg.defaultChannel || "无"}，故障转移: ${cfg.failover ? "开" : "关"}）`, ""];
  for (const c of cfg.channels) {
    const missing = validateChannel(c);
    const mark = missing.length ? "✗" : "✓";
    const star = c.name === cfg.defaultChannel ? " ←默认" : "";
    lines.push(`${mark} ${c.name}${star}`);
    lines.push(`    模型: ${c.model || "(未设置)"}`);
    lines.push(`    地址: ${c.baseUrl || "(未设置)"}`);
    lines.push(`    密钥: ${maskKey(c.apiKey)}${c.apiKeyRef ? ` ← ${c.apiKeyRef}` : ""}`);
    if (missing.length) lines.push(`    缺少: ${missing.join(", ")}`);
    lines.push(`    来源: ${c._source}`);
  }
  if (cfg.sources.length) lines.push("", `配置来源: ${cfg.sources.join(", ")}`);
  return lines.join("\n");
}

function cmdConfig(channelName) {
  const preset = CHANNEL_PRESETS[channelName] || CHANNEL_PRESETS.custom;
  fs.mkdirSync(path.dirname(USER_CONFIG_PATH), { recursive: true });

  let existing = { channels: [] };
  if (fs.existsSync(USER_CONFIG_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(USER_CONFIG_PATH, "utf8"));
    } catch {
      throw new Error(`已存在的配置文件 JSON 语法错误，先修好再运行: ${USER_CONFIG_PATH}`);
    }
  }
  if (!Array.isArray(existing.channels)) existing.channels = [];
  if (existing.channels.some((c) => c.name === preset.name)) {
    return `渠道 "${preset.name}" 已存在，未改动。\n编辑: ${USER_CONFIG_PATH}`;
  }
  existing.channels.push({ ...preset, maxTokens: 2048 });
  if (!existing.defaultChannel) existing.defaultChannel = preset.name;
  if (existing.failover === undefined) existing.failover = true;
  fs.writeFileSync(USER_CONFIG_PATH, `${JSON.stringify(existing, null, 2)}\n`, "utf8");

  const keyVar = preset.apiKey.startsWith("env:") ? preset.apiKey.slice(4) : null;
  return [
    `已写入渠道 "${preset.name}" → ${USER_CONFIG_PATH}`,
    "",
    "下一步:",
    keyVar
      ? `  设置环境变量 ${keyVar}=你的key，或把配置里的 "apiKey" 直接改成明文 key`
      : `  编辑 ${USER_CONFIG_PATH} 填入 apiKey`,
    `  然后运行: linger-image doctor`,
  ].join("\n");
}

async function cmdDoctor(cfg) {
  const lines = ["linger-image-plugin 自检", ""];
  lines.push(`Node: ${process.version}`);
  lines.push(`配置来源: ${cfg.sources.length ? cfg.sources.join(", ") : "无（仅环境变量）"}`);
  lines.push(`渠道数: ${cfg.channels.length}`);
  if (!cfg.channels.length) {
    lines.push("", "✗ 没有渠道。运行: linger-image config --channel qwen");
    return { text: lines.join("\n"), ok: false };
  }
  let ok = false;
  const px = encodeImage(
    // 1x1 红点 PNG，用来做最小连通性探测
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AH9AwHkAAAAAElFTkSuQmCC",
  );
  for (const ch of cfg.channels) {
    const missing = validateChannel(ch);
    if (missing.length) {
      lines.push(`✗ ${ch.name}: 配置不完整（缺 ${missing.join(", ")}）`);
      continue;
    }
    try {
      const r = await analyze({
        channels: [ch],
        images: [px],
        prompt: "这是什么颜色？只答颜色名。",
        system: "简洁回答。",
      });
      lines.push(`✓ ${ch.name}: 连通（${r.model}, ${r.ms}ms）→ ${r.text.slice(0, 40).replace(/\s+/g, " ")}`);
      ok = true;
    } catch (err) {
      lines.push(`✗ ${ch.name}: ${err.message.split("\n")[0]}`);
    }
  }
  return { text: lines.join("\n"), ok };
}

/** 渠道可以给单个技能覆盖 model/maxTokens/system */
function applySkillOverride(channel, skill) {
  const o = channel.skills?.[skill];
  if (!o) return channel;
  return {
    ...channel,
    model: o.model || channel.model,
    maxTokens: Number(o.maxTokens ?? channel.maxTokens),
    detail: o.detail ?? channel.detail,
    _skillSystem: o.system,
  };
}

export async function run(argv, io = {}) {
  const out = io.out || ((s) => process.stdout.write(`${s}\n`));
  const err = io.err || ((s) => process.stderr.write(`${s}\n`));

  // install/uninstall 自带一套选项，绕开通用 parseArgs 直接透传
  if (argv[0] === "install" || argv[0] === "uninstall") {
    const mod = await import("../install/install.mjs");
    const fn = argv[0] === "install" ? mod.runInstall : mod.runUninstall;
    return await fn(argv.slice(1), out);
  }

  const args = parseArgs(argv);

  if (args.command === "help") {
    out(HELP);
    return 0;
  }
  if (args.command === "version") {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    out(pkg.version);
    return 0;
  }
  if (args.command === "skills") {
    out(SKILLS.join("\n"));
    return 0;
  }

  const env = { ...process.env };
  if (args.failover === false) env.LINGER_VISION_FAILOVER = "0";
  const cfg = loadConfig({ env });

  if (args.command === "channels") {
    out(cmdChannels(cfg, args.json));
    return 0;
  }
  if (args.command === "config") {
    out(cmdConfig(args.channel));
    return 0;
  }
  if (args.command === "doctor") {
    const r = await cmdDoctor(cfg);
    out(r.text);
    return r.ok ? 0 : 1;
  }

  if (!args.images.length) {
    err(`没有指定图片。\n用法: linger-image ${args.command} <图片路径|URL> [问题]`);
    return 2;
  }

  const order = resolveChannelOrder(cfg, args.channel);
  const { system, prompt } = getPromptForSkill(args.command, args.question);
  const channels = order.map((c) => applySkillOverride(c, args.command));

  const images = args.images.map((src) =>
    encodeImage(src, { maxImageBytes: channels[0].maxImageBytes }),
  );

  if (!args.quiet && !args.json) {
    const desc = images
      .map((i) => (i.kind === "file" ? `${path.basename(i.path)} ${(i.bytes / 1024).toFixed(0)}KB` : i.kind))
      .join(", ");
    err(`[${args.command}] ${images.length} 张图 (${desc}) → 渠道 ${channels.map((c) => c.name).join(" → ")}`);
  }

  const result = await analyze({
    channels,
    images,
    prompt,
    system: channels[0]._skillSystem || system,
    onAttempt: ({ channel, status, error }) => {
      if (args.quiet || args.json) return;
      if (status === "fail") err(`  渠道 ${channel} 失败，转移中: ${error.split("\n")[0]}`);
    },
  });

  if (args.json) {
    out(
      JSON.stringify(
        {
          skill: args.command,
          channel: result.channel,
          model: result.model,
          ms: result.ms,
          usage: result.usage,
          failedAttempts: result.attempts,
          images: images.map((i) => (i.kind === "file" ? i.path : i.url.slice(0, 80))),
          text: result.text,
        },
        null,
        2,
      ),
    );
  } else {
    out(result.text);
    if (!args.quiet) err(`\n[${result.channel}/${result.model} ${result.ms}ms]`);
  }
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    return await run(argv);
  } catch (e) {
    process.stderr.write(`错误: ${e.message}\n`);
    return 1;
  }
}
