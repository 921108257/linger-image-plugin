---
name: run-linger-image-plugin
description: >
  验证 linger-image-plugin 插件的安装和配置。启动 mock 服务测试五个技能的调用链
  以及故障转移，或检查真实配置的连通性。用于"测试识图插件""跑通识图""验证安装"
  "npx linger-image-plugin 能用吗""识图配置对不对"。
---

# run-linger-image-plugin

验证插件是否正确安装和配置。两种模式：mock 模式跑全链路冒烟测试（不需要真实 key），或检查真实配置。

## Prerequisites

Node.js 18+。插件已通过 `npm install linger-image-plugin` 或 `npx` 可用。

## 验证方式

**方式一：mock 模式（推荐，无需 API key）**

启动本地 mock vision API，依次调用三个技能并测试故障转移：

```bash
node .claude/skills/run-linger-image-plugin/driver.mjs --mock
```

输出示例：

```
启动 mock vision API...
  mock API: http://127.0.0.1:xxxxx/v1

测试五个技能:

  ✓ image-vision
  ✓ ui-ux-vision
  ✓ ui-material-design
  ✓ diagram-vision
  ✓ error-diagnosis

测试故障转移:

  ✓ 故障转移成功

总计: 6/6 通过
```

mock 模式验证的是：
- CLI 参数解析
- 配置加载与渠道选择
- 图片编码（base64 / URL）
- HTTP 请求构造
- 五个技能的提示词轮廓
- 多渠道故障转移逻辑

**方式二：检查真实配置**

读取实际配置并报告渠道状态（不发真实请求）：

```bash
node .claude/skills/run-linger-image-plugin/driver.mjs --config
```

输出：

```
检查配置:

  配置来源: /path/to/.linger-image.json
  渠道数: 2
  默认渠道: qwen
  故障转移: 开
```

**方式三：连通性自检（需要真实 key）**

跑真实 API 请求：

```bash
npx linger-image-plugin doctor
```

逐个渠道发 1x1 红点测试图，报告延迟和错误。这一步需要配置里的 API key 可用。

## 快速开始（首次使用）

```bash
# 1. 安装到 Claude Code
npx linger-image-plugin install

# 2. 生成配置骨架（阿里云百炼）
npx linger-image-plugin config --channel qwen

# 3. 填 API key
#    编辑 ~/.linger-image/config.json，把 "env:DASHSCOPE_API_KEY" 改成真实 key
#    或设置环境变量: export DASHSCOPE_API_KEY=sk-xxx

# 4. 自检连通性
npx linger-image-plugin doctor

# 5. mock 模式验证（无需 key）
node .claude/skills/run-linger-image-plugin/driver.mjs --mock
```

## 三个技能

| 技能 | 用途 |
|------|------|
| `image-vision` | 通用图片识别 — 读内容、认物体、OCR、截图排错 |
| `ui-ux-vision` | UI/UX 界面分析 — 组件清单、设计 token、可访问性 |
| `ui-material-design` | UI 素材设计提示词生成 — 输出 Midjourney / SD / DALL-E 提示词 |
| `diagram-vision` | 技术图表分析 — 架构图、流程图、ER 图，输出 Mermaid 代码 |
| `error-diagnosis` | 报错截图诊断 — 提取错误信息、定位根因、给出修复方案 |

调用示例：

```bash
npx linger-image-plugin image-vision ./screenshot.png
npx linger-image-plugin ui-ux-vision ./design.png "重点看导航"
npx linger-image-plugin ui-material-design ./ref.jpg "生成深色系图标提示词"
npx linger-image-plugin diagram-vision ./arch.png "转成 Mermaid"
npx linger-image-plugin error-diagnosis ./error.png
```

## Troubleshooting

| 问题 | 排查 |
|------|------|
| `linger-image: command not found` | `npm install -g linger-image-plugin` 或用 `npx linger-image` |
| `没有配置任何识图渠道` | 跑 `npx linger-image-plugin config --channel qwen`，填 key，再 `doctor` |
| `apiKey（env:DASHSCOPE_API_KEY 未设置）` | 配置文件里 `"apiKey": "env:DASHSCOPE_API_KEY"` 要么改成明文 key，要么设环境变量 |
| `HTTP 401 / 403` | API key 错了或没权限，去对应平台检查 key |
| `HTTP 404` | `baseUrl` 或 `model` 名字不对 |
| `HTTP 429` | 触发限流或余额不足 |
| `返回空内容` | 模型不是 vision 型号，检查 `model` 字段 |
| 故障转移不生效 | 确认 `"failover": true`，或环境变量没设 `LINGER_VISION_FAILOVER=0` |

## Gotchas

- 配置文件支持 `"apiKey": "env:VAR_NAME"` 间接引用，这样配置可以进版本库。
- 配置按优先级合并：`$LINGER_IMAGE_CONFIG` 文件 → 向上查找的 `.linger-image.json` → `~/.linger-image/config.json` → 环境变量。高优先级的来源覆盖同名渠道。
- 渠道可为单个技能覆盖 `model` / `maxTokens` / `detail` / `system`，用 `skills` 段配置。
- Windows 路径含反斜杠和空格时**必须加引号**：`npx linger-image-plugin image-vision "C:\Users\你\Desktop\图.png"`。
- 图片体积默认上限 10MB（base64 后更大），超过直接报错，用图片 URL 代替或先压缩。
- mock 模式的 API 响应格式固定，只验证调用链通不通，不验证真实模型的输出质量。
- `doctor` 自检用的是 1x1 红点测试图，走的是最小 token 请求，延迟和真实大图请求不同。

文档：[GitHub BaseLinger/linger-image-plugin](https://github.com/BaseLinger/linger-image-plugin)
