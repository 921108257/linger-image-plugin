/**
 * 跨 Agent 安装器。
 *
 *   npx linger-image-plugin install            # 自动探测已装的 Agent
 *   npx linger-image-plugin install --agent claude,kiro
 *   npx linger-image-plugin install --all      # 装到所有支持的 Agent
 *   npx linger-image-plugin install --local    # 装到当前项目而非用户目录
 *   npx linger-image-plugin uninstall
 *
 * 每个 Agent 的落地方式不同：Claude Code 和 Codex 认 skills 目录，
 * Cursor/Windsurf/Kiro 认 rules/steering 文件，opencode 认 command 目录。
 * 安装器把包内对应的文件复制到目标位置，并记录清单以便卸载。
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = os.homedir();
const MANIFEST = path.join(HOME, ".linger-image", "installed.json");

/**
 * 每个目标：
 *   detect  用户目录下是否存在这个 Agent 的痕迹
 *   entries 复制清单 [包内相对路径, 目标绝对路径]
 */
const TARGETS = {
  claude: {
    label: "Claude Code",
    detect: () => fs.existsSync(path.join(HOME, ".claude")),
    userDir: () => path.join(HOME, ".claude"),
    localDir: (cwd) => path.join(cwd, ".claude"),
    entries: (root) => [
      ["skills/image-vision", path.join(root, "skills", "image-vision")],
      ["skills/ui-ux-vision", path.join(root, "skills", "ui-ux-vision")],
      ["skills/ui-material-design", path.join(root, "skills", "ui-material-design")],
    ],
  },
  codex: {
    label: "Codex",
    detect: () => fs.existsSync(path.join(HOME, ".codex")),
    userDir: () => path.join(HOME, ".codex"),
    localDir: (cwd) => path.join(cwd, ".codex"),
    entries: (root) => [
      ["skills/image-vision", path.join(root, "skills", "image-vision")],
      ["skills/ui-ux-vision", path.join(root, "skills", "ui-ux-vision")],
      ["skills/ui-material-design", path.join(root, "skills", "ui-material-design")],
    ],
  },
  cursor: {
    label: "Cursor",
    detect: () => fs.existsSync(path.join(HOME, ".cursor")),
    userDir: () => path.join(HOME, ".cursor"),
    localDir: (cwd) => path.join(cwd, ".cursor"),
    entries: (root) => [
      [".cursor/rules/linger-image.mdc", path.join(root, "rules", "linger-image.mdc")],
    ],
  },
  windsurf: {
    label: "Windsurf",
    detect: () => fs.existsSync(path.join(HOME, ".windsurf")) || fs.existsSync(path.join(HOME, ".codeium")),
    userDir: () => path.join(HOME, ".windsurf"),
    localDir: (cwd) => path.join(cwd, ".windsurf"),
    entries: (root) => [
      [".windsurf/rules/linger-image.md", path.join(root, "rules", "linger-image.md")],
    ],
  },
  kiro: {
    label: "Kiro",
    detect: () => fs.existsSync(path.join(HOME, ".kiro")),
    userDir: () => path.join(HOME, ".kiro"),
    localDir: (cwd) => path.join(cwd, ".kiro"),
    entries: (root) => [
      [".kiro/steering/linger-image.md", path.join(root, "steering", "linger-image.md")],
    ],
  },
  opencode: {
    label: "opencode",
    detect: () =>
      fs.existsSync(path.join(HOME, ".config", "opencode")) || fs.existsSync(path.join(HOME, ".opencode")),
    userDir: () => path.join(HOME, ".config", "opencode"),
    localDir: (cwd) => path.join(cwd, ".opencode"),
    entries: (root) => [
      [".opencode/command/image-vision.md", path.join(root, "command", "image-vision.md")],
      [".opencode/command/ui-ux-vision.md", path.join(root, "command", "ui-ux-vision.md")],
      [".opencode/command/ui-material-design.md", path.join(root, "command", "ui-material-design.md")],
    ],
  },
  gemini: {
    label: "Gemini CLI",
    detect: () => fs.existsSync(path.join(HOME, ".gemini")),
    userDir: () => path.join(HOME, ".gemini"),
    localDir: (cwd) => path.join(cwd, ".gemini"),
    entries: (root) => [["AGENTS.md", path.join(root, "AGENTS.md")]],
  },
};

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    return { installs: [] };
  }
}

function writeManifest(m) {
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, `${JSON.stringify(m, null, 2)}\n`, "utf8");
}

export function detectAgents() {
  return Object.entries(TARGETS)
    .filter(([, t]) => {
      try {
        return t.detect();
      } catch {
        return false;
      }
    })
    .map(([id]) => id);
}

export function installTo(agentId, { local = false, cwd = process.cwd(), dryRun = false } = {}) {
  const target = TARGETS[agentId];
  if (!target) throw new Error(`不支持的 Agent: ${agentId}。可选: ${Object.keys(TARGETS).join(", ")}`);
  const root = local ? target.localDir(cwd) : target.userDir();
  const written = [];
  for (const [rel, dest] of target.entries(root)) {
    const src = path.join(PKG_ROOT, rel);
    if (!fs.existsSync(src)) throw new Error(`包内缺少文件: ${rel}（安装包可能不完整）`);
    if (!dryRun) copyRecursive(src, dest);
    written.push(dest);
  }
  return { agent: agentId, label: target.label, root, written, scope: local ? "project" : "user" };
}

export function uninstallFrom(agentId, { local = false, cwd = process.cwd() } = {}) {
  const target = TARGETS[agentId];
  if (!target) throw new Error(`不支持的 Agent: ${agentId}`);
  const root = local ? target.localDir(cwd) : target.userDir();
  const removed = [];
  for (const [, dest] of target.entries(root)) {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
      removed.push(dest);
    }
  }
  return { agent: agentId, label: target.label, removed };
}

function parseInstallArgs(argv) {
  const out = { agents: [], all: false, local: false, dryRun: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent" || a === "-a") out.agents.push(...String(argv[++i] || "").split(","));
    else if (a.startsWith("--agent=")) out.agents.push(...a.slice(8).split(","));
    else if (a === "--all") out.all = true;
    else if (a === "--local" || a === "--project") out.local = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--list") out.list = true;
  }
  out.agents = out.agents.map((s) => s.trim()).filter(Boolean);
  return out;
}

export async function runInstall(argv, log = (s) => process.stdout.write(`${s}\n`)) {
  const args = parseInstallArgs(argv);

  if (args.list) {
    log("支持的 Agent:");
    for (const [id, t] of Object.entries(TARGETS)) {
      let detected = false;
      try {
        detected = t.detect();
      } catch {}
      log(`  ${detected ? "●" : "○"} ${id.padEnd(10)} ${t.label}${detected ? "  (已检测到)" : ""}`);
    }
    log("\n● = 已检测到  ○ = 未检测到");
    return 0;
  }

  let agents = args.agents;
  if (args.all) agents = Object.keys(TARGETS);
  if (!agents.length) {
    agents = detectAgents();
    if (!agents.length) {
      log("没检测到任何支持的 Agent。\n");
      log("查看支持列表:");
      log("  npx linger-image-plugin install --list\n");
      log("手动指定 Agent:");
      log("  npx linger-image-plugin install --agent claude");
      log("  npx linger-image-plugin install --agent cursor,windsurf");
      return 1;
    }
    log(`自动检测到: ${agents.join(", ")}`);
  }

  const unknown = agents.filter((a) => !TARGETS[a]);
  if (unknown.length) {
    log(`不支持的 Agent: ${unknown.join(", ")}`);
    log(`可选: ${Object.keys(TARGETS).join(", ")}`);
    return 1;
  }

  const manifest = readManifest();
  const results = [];
  for (const id of agents) {
    try {
      const r = installTo(id, { local: args.local, dryRun: args.dryRun });
      results.push(r);
      log(`${args.dryRun ? "[试运行] " : "✓ "}${r.label} → ${r.root}  (${r.written.length} 项)`);
      if (!args.dryRun) {
        manifest.installs = manifest.installs.filter(
          (x) => !(x.agent === id && x.scope === r.scope && x.root === r.root),
        );
        manifest.installs.push({ agent: id, scope: r.scope, root: r.root, at: new Date().toISOString() });
      }
    } catch (err) {
      log(`✗ ${id}: ${err.message}`);
    }
  }
  if (!args.dryRun && results.length) writeManifest(manifest);

  if (results.length) {
    log("");
    log("下一步:");
    log("  1. 配置渠道:  npx linger-image config --channel qwen");
    log("  2. 填 API Key（配置文件里的 apiKey 或对应环境变量）");
    log("  3. 自检:      npx linger-image doctor");
    log("  4. 重启 Agent 让技能生效");
  }
  return results.length ? 0 : 1;
}

export async function runUninstall(argv, log = (s) => process.stdout.write(`${s}\n`)) {
  const args = parseInstallArgs(argv);
  const manifest = readManifest();

  let agents = args.agents;
  if (args.all) agents = Object.keys(TARGETS);
  if (!agents.length) {
    agents = [...new Set(manifest.installs.map((i) => i.agent))];
    if (!agents.length) {
      log("清单里没有安装记录。用 --agent claude 手动指定，或 --all 清所有。");
      return 1;
    }
  }

  let total = 0;
  for (const id of agents) {
    try {
      const r = uninstallFrom(id, { local: args.local });
      total += r.removed.length;
      log(r.removed.length ? `✓ ${r.label}: 移除 ${r.removed.length} 项` : `- ${r.label}: 无内容`);
    } catch (err) {
      log(`✗ ${id}: ${err.message}`);
    }
  }
  manifest.installs = manifest.installs.filter((i) => !agents.includes(i.agent));
  writeManifest(manifest);
  log("");
  log(`共移除 ${total} 项。配置文件 ~/.linger-image/config.json 保留，需要的话手动删。`);
  return 0;
}

export { TARGETS };
