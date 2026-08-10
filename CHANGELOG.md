# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-10

### Added

- 三个识图技能：
  - `image-vision`: 通用图片识别（读内容、认物体、OCR、截图排错）
  - `ui-ux-vision`: UI/UX 界面分析（组件清单、设计 token、可访问性）
  - `ui-material-design`: UI 素材设计提示词生成（Midjourney / SD / DALL-E）
- 多渠道配置与故障转移（OpenAI 兼容格式）
- 跨 Agent 安装器，支持：
  - Claude Code / Codex（复制 `skills/` 目录）
  - Cursor（复制 `.cursor/rules/` 文件）
  - Windsurf（复制 `.windsurf/rules/` 文件）
  - Kiro（复制 `.kiro/steering/` 文件）
  - opencode（复制 `.opencode/command/` 目录）
  - Gemini CLI（复制 `AGENTS.md`）
- CLI 命令：
  - `linger-image <技能> <图片> [问题] [选项]`
  - `linger-image channels` 列出已配置渠道
  - `linger-image config --channel X` 生成配置骨架
  - `linger-image doctor` 自检连通性
  - `linger-image install` 安装到 Agent
  - `linger-image uninstall` 卸载
- 配置优先级：`$LINGER_IMAGE_CONFIG` → `.linger-image.json` → `~/.linger-image/config.json` → 环境变量
- 按技能覆盖配置（`skills` 段可为单个技能指定 `model` / `maxTokens` / `detail` / `system`）
- Mock vision API 服务器用于离线测试
- 测试套件（27 个测试用例，覆盖配置加载、渠道选择、故障转移、图片编码、HTTP 请求）
- `/run` 技能驱动器（`driver.mjs --mock` 全链路验证）
- 完整文档（README.md、三个技能的 SKILL.md、AGENTS.md）
- MIT 许可证

### Features

- 零依赖（纯 Node.js 标准库，不装 axios / openai-sdk / dotenv）
- 支持本地文件路径和图片 URL
- 多图一次传入（对比、批量识别）
- JSON 输出模式（`--json`）
- 安静模式（`--quiet`）
- API key 支持 `env:VAR_NAME` 间接引用（配置文件可进版本库）
- 自动探测已安装的 Agent（`install` 无参数时）
- 项目级安装（`install --local`）
- postinstall 钩子静默提示

### Supported Channels

- 阿里云百炼（qwen-vl-max / qwen-vl-plus / qwen3.5-omni-plus）
- OpenAI（gpt-4o-mini / gpt-4o）
- 智谱 GLM（glm-4v-flash / glm-4v）
- 硅基流动（Qwen/Qwen2.5-VL-72B-Instruct）
- Ollama（llama3.2-vision）
- 其他 OpenAI 兼容服务

[1.0.0]: https://github.com/BaseLinger/linger-image-plugin/releases/tag/v1.0.0
