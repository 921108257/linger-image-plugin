# linger-image-plugin

多渠道识图插件，为没有原生识图能力的 Agent 提供图片识别、UI/UX 界面分析、设计提示词生成、技术图表分析、报错诊断等能力。

[![npm version](https://img.shields.io/npm/v/linger-image-plugin.svg)](https://www.npmjs.com/package/linger-image-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 特性

- **五个技能**：通用识图、UI/UX 界面分析、UI 素材设计提示词、技术图表分析、报错诊断
- **多渠道配置**：OpenAI 兼容格式，支持阿里云百炼、OpenAI、智谱、硅基流动、Ollama 等
- **故障转移**：首选渠道失败时自动切换到下一个
- **跨 Agent 安装**：一行命令装到 Claude Code、Cursor、Windsurf、Kiro、opencode 等
- **零依赖**：纯 Node.js 标准库，不装 axios / openai-sdk / dotenv

---

## 快速开始

**新用户？** 5 分钟上手指南：[QUICKSTART.md](QUICKSTART.md)

### 1. 安装

```bash
npm install -g linger-image-plugin
# 或
npx linger-image-plugin install
```

### 2. 配置渠道

```bash
linger-image config --channel qwen
```

生成 `~/.linger-image/config.json`，编辑填入 API key 或设置环境变量：

```bash
export DASHSCOPE_API_KEY=sk-your-key
```

### 3. 自检

```bash
linger-image doctor
```

### 4. 使用

```bash
# 通用识图
linger-image image-vision ./screenshot.png

# UI 界面分析
linger-image ui-ux-vision ./design.png "重点看导航和栅格"

# 生成 UI 素材提示词
linger-image ui-material-design ./ref.jpg "生成深色系图标素材提示词"

# 技术图表分析
linger-image diagram-vision ./arch.png "转成 Mermaid 代码"

# 报错截图诊断
linger-image error-diagnosis ./error.png
```

---

## 五个技能

| 技能 | 用途 | 触发场景 |
|------|------|---------|
| **image-vision** | 通用图片识别 | 读内容、认物体、OCR、截图排错 |
| **ui-ux-vision** | UI/UX 界面分析 | 组件清单、设计 token、可访问性、前端还原 |
| **ui-material-design** | UI 素材设计提示词生成 | 根据参考图输出 Midjourney / SD / DALL-E 提示词 |
| **diagram-vision** | 技术图表分析 | 架构图、流程图、ER 图，输出 Mermaid 代码 |
| **error-diagnosis** | 报错截图诊断 | 提取错误信息、定位根因、给出修复方案 |

详细说明见各技能的 `SKILL.md`。

---

## 安装到 Agent

插件支持跨 Agent 安装，一行命令装到：

- **Claude Code** / **Codex** — 复制 `skills/` 目录
- **Cursor** / **Windsurf** — 复制 `rules/` 文件
- **Kiro** — 复制 `steering/` 文件
- **opencode** — 复制 `command/` 目录
- **Gemini CLI** — 复制 `AGENTS.md`

```bash
# 自动检测已装的 Agent
npx linger-image-plugin install

# 手动指定
npx linger-image-plugin install --agent claude,kiro

# 装到所有支持的 Agent
npx linger-image-plugin install --all

# 项目级安装（写到项目内而非用户目录）
npx linger-image-plugin install --local

# 列出支持的 Agent
npx linger-image-plugin install --list
```

安装后重启 Agent 让技能生效。

---

## 配置

### 配置优先级（从高到低）

1. `$LINGER_IMAGE_CONFIG` 指向的文件
2. 向上查找的 `.linger-image.json`（到仓库根 / 文件系统根为止）
3. `~/.linger-image/config.json`
4. 环境变量合成的单渠道（`LINGER_VISION_API_KEY` / `_BASE_URL` / `_MODEL`）

### 配置示例

```json
{
  "defaultChannel": "qwen",
  "failover": true,
  "channels": [
    {
      "name": "qwen",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "model": "qwen-vl-max",
      "apiKey": "env:DASHSCOPE_API_KEY",
      "maxTokens": 2048,
      "skills": {
        "ui-ux-vision": { "maxTokens": 4096 },
        "ui-material-design": { "maxTokens": 4096 }
      }
    },
    {
      "name": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4o-mini",
      "apiKey": "env:OPENAI_API_KEY",
      "maxTokens": 2048,
      "detail": "high"
    }
  ]
}
```

### 环境变量

```bash
# 最省事的用法：只设环境变量，不写配置文件
export LINGER_VISION_API_KEY=sk-your-key
export LINGER_VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
export LINGER_VISION_MODEL=qwen-vl-max

# 厂商专用变量（用于配置文件里的 env: 引用）
export DASHSCOPE_API_KEY=sk-xxx        # 阿里云百炼
export OPENAI_API_KEY=sk-xxx           # OpenAI
export ZHIPU_API_KEY=xxx               # 智谱 GLM
export SILICONFLOW_API_KEY=sk-xxx      # 硅基流动

# 临时切换渠道 / 关掉故障转移 / 指定配置文件
export LINGER_VISION_CHANNEL=openai
export LINGER_VISION_FAILOVER=0
export LINGER_IMAGE_CONFIG=/abs/path/to/config.json
```

### 渠道字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✓ | 渠道标识，用于 `--channel` 指定 |
| `baseUrl` | ✓ | API 地址（不含 `/chat/completions` 后缀） |
| `model` | ✓ | 模型名，必须是 vision 型号 |
| `apiKey` | ✓ | API key，支持 `env:VAR_NAME` 间接引用 |
| `maxTokens` | - | 默认 2048 |
| `temperature` | - | 可选 |
| `detail` | - | OpenAI 的图片 detail 参数（`low` / `high` / `auto`） |
| `timeoutMs` | - | 默认 120000（2 分钟） |
| `maxImageBytes` | - | 默认 10MB |
| `headers` | - | 自定义请求头 |
| `skills` | - | 按技能覆盖 `model` / `maxTokens` / `detail` / `system` |

### 按技能覆盖配置

```json
{
  "name": "qwen",
  "model": "qwen-vl-plus",
  "skills": {
    "ui-ux-vision": {
      "model": "qwen-vl-max",
      "maxTokens": 4096
    }
  }
}
```

这样 `ui-ux-vision` 用 `qwen-vl-max` 和 4096 token，其他技能用渠道默认配置。

---

## CLI 命令

```bash
# 技能调用
linger-image <技能> <图片...> [问题] [选项]

# 其他命令
linger-image channels             # 列出已配置的渠道
linger-image config --channel X   # 生成/追加配置
linger-image doctor               # 自检连通性
linger-image install              # 安装到 Agent
linger-image uninstall            # 卸载

# 选项
--channel <name>   指定渠道
--json             输出 JSON
--no-failover      不做故障转移
--quiet            安静模式
```

---

## 支持的渠道

OpenAI 兼容格式的任意 vision 模型：

| 渠道 | 模型 | 备注 |
|------|------|------|
| 阿里云百炼（推荐） | `qwen-vl-max` / `qwen-vl-plus` / `qwen3.5-omni-plus` | 新用户 100 万 token 免费 |
| OpenAI | `gpt-4o-mini` / `gpt-4o` | 需海外支付 |
| 智谱 GLM | `glm-4v-flash` / `glm-4v` | 国内可用 |
| 硅基流动 | `Qwen/Qwen2.5-VL-72B-Instruct` | 按量付费 |
| Ollama | `llama3.2-vision` | 本地运行，无需 key |
| 其他 | 兼容 `/v1/chat/completions` 的服务 | 改 `baseUrl` 和 `model` |

推荐阿里云百炼：新用户有 100 万 token 免费额度，约 0.02 元/次。

申请地址：[https://bailian.console.aliyun.com/](https://bailian.console.aliyun.com/)

---

## 验证安装

### Mock 模式（无需 API key）

```bash
node .claude/skills/run-linger-image-plugin/driver.mjs --mock
```

启动本地 mock vision API，依次调用三个技能并测试故障转移。

输出示例：

```
启动 mock vision API...
  mock API: http://127.0.0.1:xxxxx/v1

测试三个技能:

  ✓ image-vision
  ✓ ui-ux-vision
  ✓ ui-material-design

测试故障转移:

  ✓ 故障转移成功

总计: 4/4 通过
```

Mock 模式验证的是调用链和故障转移逻辑，不验证真实模型的输出质量。

### 真实连通性自检（需要 API key）

```bash
linger-image doctor
```

逐个渠道发 1x1 红点测试图，报告延迟和错误。

---

## 使用示例

### 通用识图

```bash
# 识别截图内容
linger-image image-vision ./screenshot.png

# 追问
linger-image image-vision ./error.png "这个报错是什么原因"

# URL 图片
linger-image image-vision https://example.com/chart.png

# 多张图对比
linger-image image-vision ./before.png ./after.png "这两张图有什么差异"
```

### UI/UX 界面分析

```bash
# 默认六维度分析：布局、组件、设计 token、交互、响应式、可访问性
linger-image ui-ux-vision ./design.png

# 指定关注点
linger-image ui-ux-vision ./page.png "重点看导航和栅格系统"

# 前端还原前的读稿
linger-image ui-ux-vision ./figma-export.png > ui-spec.md
# 然后基于 ui-spec.md 写代码，而不是基于"我猜这个图长什么样"
```

输出示例（节选）：

```markdown
## 组件清单

- 顶部导航：Logo + 主导航（5 项）+ 搜索 + 用户头像
- Hero 区：标题 + 副标题 + CTA 按钮
- 卡片网格：3 列，每卡片含缩略图、标题、描述、标签

## 设计 Token（CSS 变量形式）

--color-primary: #3B82F6
--color-bg: #0F172A
--font-display: 'Inter', sans-serif
--radius-card: 12px
--shadow-card: 0 4px 16px rgba(0,0,0,0.12)

## 改进建议

- 导航项间距偏小（当前约 16px），建议 24px 提升触控友好度
- Hero 区标题对比度 3.2:1，未达 WCAG AA（4.5:1），建议调浅
```

### UI 素材设计提示词生成

```bash
# 根据参考图生成提示词
linger-image ui-material-design ./ref.jpg

# 指定素材需求
linger-image ui-material-design ./style.png "生成深色系的应用图标素材"
```

输出示例（节选）：

```markdown
## 核心提示词

modern app icon design, dark mode palette, gradient mesh overlay, 
glassmorphic effect, minimalist geometric shapes, neon accent highlights, 
3D depth subtle shadows, cyberpunk aesthetic, high contrast, clean edges

## 参数建议

- 推荐模型：Midjourney v6 / SDXL 1.0
- 比例：`--ar 1:1`（图标）或 `--ar 16:9`（banner）
- 风格化：`--stylize 500`
- 质量：`--quality 2`

## 变体方向

### 变体 1：冷色调

deep blue gradient #1E3A8A to #3B82F6, cyan accents #06B6D4, 
icy highlights, tech-forward mood

### 变体 2：暖色调

amber gradient #F59E0B to #EF4444, warm orange accents, 
energetic vibe, sunset palette

### 变体 3：中性极简

monochrome grayscale, single neon accent #10B981, 
ultra minimal geometric, brutalist layout
```

---

## Troubleshooting

| 问题 | 排查 |
|------|------|
| `linger-image: command not found` | `npm install -g linger-image-plugin` 或用 `npx linger-image` |
| `没有配置任何识图渠道` | 跑 `linger-image config --channel qwen`，填 key，再 `doctor` |
| `apiKey（env:DASHSCOPE_API_KEY 未设置）` | 配置文件里 `"apiKey": "env:DASHSCOPE_API_KEY"` 要么改成明文 key，要么设环境变量 |
| `HTTP 401 / 403` | API key 错了或没权限，去对应平台检查 key |
| `HTTP 404` | `baseUrl` 或 `model` 名字不对 |
| `HTTP 429` | 触发限流或余额不足 |
| `返回空内容` | 模型不是 vision 型号，检查 `model` 字段是否带 `-vl` / `-vision` / `-v` |
| 故障转移不生效 | 确认配置里 `"failover": true`，且环境变量没设 `LINGER_VISION_FAILOVER=0` |
| Windows 路径报错 | 路径含空格或反斜杠时**必须加引号**：`"C:\Users\你\Desktop\图.png"` |
| 图片体积超限 | 默认上限 10MB（base64 后更大），改用图片 URL 或先压缩 |

---

## 开发

```bash
# 克隆仓库
git clone https://github.com/BaseLinger/linger-image-plugin.git
cd linger-image-plugin

# 运行测试
npm test

# Mock 模式验证
node .claude/skills/run-linger-image-plugin/driver.mjs --mock

# 本地 link 测试
npm link
linger-image doctor
```

---

## License

MIT © [BaseLinger](https://github.com/BaseLinger)

---

## 相关链接

- [GitHub 仓库](https://github.com/BaseLinger/linger-image-plugin)
- [npm 包](https://www.npmjs.com/package/linger-image-plugin)
- [问题反馈](https://github.com/BaseLinger/linger-image-plugin/issues)
