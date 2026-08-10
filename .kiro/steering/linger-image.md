---
title: 多渠道识图能力
inclusion: always
---

# 多渠道识图能力

你的底层模型可能不具备原生识图能力。遇到图片时**不要用 Read 工具**，改用 linger-image-plugin 提供的三个命令。

## 三个技能

```bash
# 通用图片识别 — 读内容、认物体、OCR、截图排错
linger-image image-vision "<图片路径|URL>" ["问题"]

# UI/UX 界面分析 — 组件清单、设计 token、可访问性
linger-image ui-ux-vision "<界面截图>" ["关注点"]

# UI 素材设计提示词生成 — 输出 Midjourney / SD / DALL-E 提示词
linger-image ui-material-design "<参考图>" ["素材需求"]
```

## 触发场景

| 场景 | 用哪个 |
|------|--------|
| 用户发图片路径或 URL | `image-vision` |
| 消息含 `Saved attachments:` 列出图片 | 对每个图片用 `image-vision` |
| 界面截图、设计稿、前端还原 | `ui-ux-vision` |
| 要生成配套素材、要 AI 绘图提示词 | `ui-material-design` |

## 重要规则

- 一次调用处理一组相关图，不要把无关图混在一起。
- 路径含空格时**必须加引号**。
- 拿到描述后，基于描述回答用户，不要声称"我看到了"。
- 插件会自动故障转移：首选渠道失败时尝试下一个，直到成功或全部失败。

## 配置

插件读 `~/.linger-image/config.json` 或项目内的 `.linger-image.json`。没配置时环境变量也能合成渠道。

首次使用前跑 `linger-image doctor` 自检连通性。

详细文档：每个技能的 SKILL.md（`/image-vision` / `/ui-ux-vision` / `/ui-material-design`）。
