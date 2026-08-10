/**
 * postinstall 钩子。npm/pnpm/yarn/bun install 时自动触发。
 * 静默探测：有 Agent 时给提示，没有时静默退出（避免在 CI / docker build 里报错）。
 */

import { detectAgents } from "./install.mjs";

const detected = detectAgents();
if (!detected.length) process.exit(0);

process.stdout.write(`
linger-image-plugin 已下载。检测到: ${detected.join(", ")}

下一步安装:
  npx linger-image-plugin install              # 安装到已检测的 Agent
  npx linger-image-plugin install --list       # 看支持的 Agent 列表

或先配置后安装:
  npx linger-image-plugin config --channel qwen
  npx linger-image-plugin doctor
  npx linger-image-plugin install

`);
