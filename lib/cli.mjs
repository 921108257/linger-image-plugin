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

// 简单的终端颜色（仅支持基础的 ANSI，不引入依赖）
const color = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

// 根据环境决定是否使用颜色（CI/pipe 时禁用）
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
function c(code, text) {
  return useColor ? `${code}${text}${color.reset}` : text;
}

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

const HELP = `${c(color.bright, "linger-image-plugin")} ${c(color.dim, "— 给没有原生识图能力的 Agent 加上识图能力")}

${c(color.bright, "用法:")}
  linger-image ${c(color.cyan, "<技能>")} ${c(color.dim, "<图片...> [问题] [选项]")}

${c(color.bright, "技能:")}
  ${c(color.cyan, "image-vision")}         通用图片识别（默认）
  ${c(color.cyan, "ui-ux-vision")}         UI/UX 界面分析，输出组件清单和设计 token
  ${c(color.cyan, "ui-material-design")}   根据参考图生成 UI 素材设计提示词
  ${c(color.cyan, "diagram-vision")}       技术图表分析（架构图/流程图/ER图），输出 Mermaid
  ${c(color.cyan, "error-diagnosis")}      报错截图诊断，提取错误信息并给出修复方案

${c(color.bright, "其他命令:")}
  ${c(color.cyan, "channels")}             列出已配置的渠道及其状态
  ${c(color.cyan, "config")} [--channel X] 生成/追加用户级配置文件
  ${c(color.cyan, "doctor")}               自检配置和连通性
  ${c(color.cyan, "install")}              安装插件到已检测到的 Agent (--agent X 手动指定, --all 全部, --local 项目级)
  ${c(color.cyan, "uninstall")}            卸载插件 (--agent X, --all)
  ${c(color.cyan, "help")}                 显示本帮助

${c(color.bright, "选项:")}
  -c, --channel <name> 指定渠道
      --json           输出 JSON
      --no-failover    不做故障转移
  -q, --quiet          安静模式

${c(color.bright, "示例:")}
  ${c(color.dim, "linger-image image-vision ./shot.png")}
  ${c(color.dim, "linger-image ui-ux-vision ./design.png \"重点看导航和栅格\"")}
  ${c(color.dim, "linger-image ui-material-design ./ref.jpg \"生成深色系图标素材提示词\"")}
  ${c(color.dim, "linger-image image-vision --url https://example.com/a.png")}
  ${c(color.dim, "linger-image image-vision ./a.png --channel openai --json")}

${c(color.bright, "安装:")}
  ${c(color.dim, "npx linger-image-plugin install              # 自动检测已装的 Agent")}
  ${c(color.dim, "npx linger-image-plugin install --all        # 装到所有支持的 Agent")}
  ${c(color.dim, "npx linger-image-plugin install --agent claude,kiro")}
  ${c(color.dim, "npx linger-image-plugin uninstall --all")}

${c(color.bright, "配置（优先级从高到低）:")}
  1. ${c(color.dim, "$LINGER_IMAGE_CONFIG 指向的文件")}
  2. ${c(color.dim, "向上查找的 .linger-image.json")}
  3. ${c(color.dim, USER_CONFIG_PATH)}
  4. ${c(color.dim, "环境变量 LINGER_VISION_API_KEY / _BASE_URL / _MODEL")}
`;

function cmdChannels(cfg, json) {
  if (json) {
    return JSON.stringify(
      {
        defaultChannel: cfg.defaultChannel,
        failover: cfg.failover,
        sources: cfg.sources,
        channels: cfg.channels.map((ch) => ({
          name: ch.name,
          baseUrl: ch.baseUrl,
          model: ch.model,
          hasKey: Boolean(ch.apiKey),
          missing: validateChannel(ch),
        })),
      },
      null,
      2,
    );
  }
  if (!cfg.channels.length) {
    return `${c(color.red, "✗")} 没有配置任何渠道。\n\n运行: ${c(color.cyan, "linger-image config --channel qwen")}\n配置文件位置: ${c(color.dim, USER_CONFIG_PATH)}`;
  }
  const lines = [
    c(color.bright, `已配置 ${cfg.channels.length} 个渠道`) +
    c(color.dim, ` (默认: ${cfg.defaultChannel || "无"}，故障转移: ${cfg.failover ? "开" : "关"})`),
    ""
  ];
  for (const ch of cfg.channels) {
    const missing = validateChannel(ch);
    const mark = missing.length ? c(color.red, "✗") : c(color.green, "✓");
    const star = ch.name === cfg.defaultChannel ? c(color.yellow, " ← 默认") : "";
    lines.push(`${mark} ${c(color.bright, ch.name)}${star}`);
    lines.push(`    模型: ${ch.model || c(color.dim, "(未设置)")}`);
    lines.push(`    地址: ${ch.baseUrl || c(color.dim, "(未设置)")}`);
    lines.push(`    密钥: ${maskKey(ch.apiKey)}${ch.apiKeyRef ? c(color.dim, ` ← ${ch.apiKeyRef}`) : ""}`);
    if (missing.length) lines.push(`    ${c(color.red, `缺少: ${missing.join(", ")}`)}`);
    lines.push(`    ${c(color.dim, `来源: ${ch._source}`)}`);
  }
  if (cfg.sources.length) lines.push("", c(color.dim, `配置来源: ${cfg.sources.join(", ")}`));
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
    return `${c(color.yellow, "⚠")} 渠道 "${c(color.bright, preset.name)}" 已存在，未改动。\n编辑: ${c(color.dim, USER_CONFIG_PATH)}`;
  }
  existing.channels.push({ ...preset, maxTokens: 2048 });
  if (!existing.defaultChannel) existing.defaultChannel = preset.name;
  if (existing.failover === undefined) existing.failover = true;
  fs.writeFileSync(USER_CONFIG_PATH, `${JSON.stringify(existing, null, 2)}\n`, "utf8");

  const keyVar = preset.apiKey.startsWith("env:") ? preset.apiKey.slice(4) : null;
  return [
    `${c(color.green, "✓")} 已写入渠道 "${c(color.bright, preset.name)}" → ${c(color.dim, USER_CONFIG_PATH)}`,
    "",
    c(color.bright, "下一步:"),
    keyVar
      ? `  设置环境变量 ${c(color.cyan, `${keyVar}=你的key`)}，或把配置里的 "apiKey" 直接改成明文 key`
      : `  编辑 ${c(color.cyan, USER_CONFIG_PATH)} 填入 apiKey`,
    `  然后运行: ${c(color.cyan, "linger-image doctor")}`,
  ].join("\n");
}

async function cmdDoctor(cfg) {
  const lines = [c(color.bright, "linger-image-plugin 自检"), ""];
  lines.push(`Node: ${c(color.dim, process.version)}`);
  lines.push(`配置来源: ${c(color.dim, cfg.sources.length ? cfg.sources.join(", ") : "无（仅环境变量）")}`);
  lines.push(`渠道数: ${c(color.bright, cfg.channels.length.toString())}`);
  if (!cfg.channels.length) {
    lines.push("", `${c(color.red, "✗")} 没有渠道。运行: ${c(color.cyan, "linger-image config --channel qwen")}`);
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
      lines.push(`${c(color.red, "✗")} ${c(color.bright, ch.name)}: 配置不完整（缺 ${missing.join(", ")}）`);
      continue;
    }
    try {
      const r = await analyze({
        channels: [ch],
        images: [px],
        prompt: "这是什么颜色？只答颜色名。",
        system: "简洁回答。",
      });
      lines.push(`${c(color.green, "✓")} ${c(color.bright, ch.name)}: 连通 ${c(color.dim, `(${r.model}, ${r.ms}ms)`)} → ${c(color.dim, r.text.slice(0, 40).replace(/\s+/g, " "))}`);
      ok = true;
    } catch (err) {
      lines.push(`${c(color.red, "✗")} ${c(color.bright, ch.name)}: ${c(color.dim, err.message.split("\n")[0])}`);
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
    // Windows Node 24 的 HTTP cleanup bug workaround
    if (r.ok) setTimeout(() => process.exit(0), 100);
    else process.exit(1);
    return;
  }

  if (!args.images.length) {
    err(`${c(color.red, "✗")} 没有指定图片。\n\n用法: ${c(color.cyan, `linger-image ${args.command} <图片路径|URL> [问题]`)}`);
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
    const channelChain = channels.map((c) => c.name).join(" → ");
    err(c(color.dim, `[${args.command}] ${images.length} 张图 (${desc}) → 渠道 ${channelChain}`));
  }

  const result = await analyze({
    channels,
    images,
    prompt,
    system: channels[0]._skillSystem || system,
    onAttempt: ({ channel, status, error }) => {
      if (args.quiet || args.json) return;
      if (status === "fail") {
        const errMsg = error.split("\n")[0];
        err(c(color.yellow, `  ⚠ 渠道 ${channel} 失败，转移中`), c(color.dim, `: ${errMsg}`));
      }
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
    if (!args.quiet) {
      const meta = `[${result.channel}/${result.model} ${result.ms}ms]`;
      err(`\n${c(color.dim, meta)}`);
    }
  }
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    return await run(argv);
  } catch (e) {
    const errMsg = c(color.red, "✗ 错误:");
    const detail = e.message;
    process.stderr.write(`${errMsg} ${detail}\n`);
    if (e.stack && process.env.DEBUG) {
      process.stderr.write(c(color.dim, `\n${e.stack}\n`));
    }
    return 1;
  }
}
