# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2026-08-11

### Fixed

- 修复用户通过 `npx linger-image-plugin install` 安装新版本时技能目录未完全更新的问题
- 安装前自动清理旧版本目录，避免旧文件残留导致的缓存问题

## [1.1.3] - 2026-08-11

### Fixed

- 修复 Qoder Agent 调用技能时直接使用 `linger-image` 命令导致找不到命令的问题
- 批量替换所有技能文档中的 `linger-image` 为 `npx linger-image-plugin`
- 确保所有 Agent 工具（Claude Code/Codex/opencode/Qoder/Kiro/Windsurf）都使用统一的 npx 命令格式

## [1.1.2] - 2026-08-11

### Changed

- 统一所有技能文档的命令示例，仅保留 `npx linger-image-plugin` 格式
- 移除开发模式的 `node bin/linger-image.js` 示例路径
- 确保所有 Agent 工具（包括非 Claude Code/Codex 的）都能正确执行命令，避免执行错误的 `node xxx` 路径命令

### Fixed

- 修复技能文档中混合命令格式可能导致非 Claude Code/Codex Agent 执行错误命令的问题

## [1.1.1] - 2026-08-11

### Added

- 新增技能 `ui-material-design-image`: 针对 gpt-image-2、seedream、qwen-image-3.0 等 AI 绘图模型的提示词生成
- 技能总数从 5 个增加到 6 个
- 支持 Qoder Agent 的安装（作为 Agent 工具，而非识图渠道）

### Changed

- 更新所有文档（README.md、AGENTS.md、CLI 帮助）反映 6 个技能
- `ui-material-design` 现在明确定位为通用绘图工具（MJ/SD/DALL-E）提示词生成
- `ui-material-design-image` 专用于 AI 绘图模型（gpt-image-2/seedream/qwen-image-3.0）提示词生成
- example.linger-image.json 添加新技能的 maxTokens 配置示例

## [1.1.0] - 2026-08-10

### Added

- 新增两个识图技能：
  - `diagram-vision`: 技术图表分析（架构图、流程图、ER 图，输出 Mermaid 代码）
  - `error-diagnosis`: 报错截图诊断（提取错误信息、定位根因、给出修复方案）
- 测试套件扩展到 28 个用例，覆盖新增技能
- Mock 驱动器现在测试 5 个技能（从 3 个扩展到 5 个）

### Changed

- 改进测试隔离：`loadConfig` 现在接受 `userConfigPath` 参数，避免测试污染用户配置
- 更新帮助文档，反映 5 个技能
- 更新 README.md 和 SKILL.md，包含新增技能的说明

### Improved

- 改进 HTTP 400 错误提示：检测到图片格式/尺寸相关错误时，自动提示"调整图片大小或格式"
- 错误信息更精准，覆盖 image/size/dimension/resolution/format 等关键词

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

[1.1.0]: https://github.com/921108257/linger-image-plugin/releases/tag/v1.1.0
[1.0.0]: https://github.com/921108257/linger-image-plugin/releases/tag/v1.0.0
