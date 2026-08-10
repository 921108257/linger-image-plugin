---
name: image-vision
description: >
  识别图片内容并用文字描述。当你的底层模型没有原生识图能力时，用它代替 Read 工具读图。
  适用于：用户发来图片路径或图片 URL、消息里出现 "Saved attachments:" 并列出图片文件、
  用户要求"看看这张图""描述这张图片""识别图里的文字""图里写了什么""这个截图是什么"。
  也用于截图排错（读日志截图、报错弹窗、终端截图）。
  UI 界面分析请改用 ui-ux-vision，生成设计素材提示词请改用 ui-material-design。
argument-hint: "<图片路径|URL> [问题]"
license: MIT
---

# image-vision — 通用图片识别

**你的底层模型可能不具备识图能力。遇到图片时不要用 Read 工具**，Read 读图片只会得到二进制乱码或直接失败。改用本技能。

## 怎么用

```bash
npx linger-image image-vision "<图片路径>" ["问题"]
```

插件已安装时可直接用短命令：

```bash
linger-image image-vision "./screenshot.png"
linger-image image-vision "./error.png" "这个报错是什么原因"
linger-image image-vision "https://example.com/chart.png" "图里的数值趋势"
```

## 触发场景

| 场景 | 动作 |
|------|------|
| 用户发本地图片路径 | 直接把路径传给命令 |
| 用户发图片 URL | 直接传 URL，插件不会下载，交给模型侧拉取 |
| 消息含 `Saved attachments:` | 对**每一个**列出的图片依次执行，全部拿到描述后再回复 |
| 用户要求分析/描述/识别图片 | 传路径，把用户的问题作为第二个参数 |

多张图一次传：

```bash
linger-image image-vision ./a.png ./b.png "对比这两张图的差异"
```

## 重要规则

- 图片路径含空格时**必须加引号**，Windows 路径同理。
- 一次调用只处理一组图，**不要**把多个不相关的图混在一次调用里。
- 拿到文字描述后，基于描述回答用户，不要声称"我看到了图片"。
- 需要机器消费结果时加 `--json`，会输出 `{skill, channel, model, ms, usage, text}`。
- 报错先跑 `linger-image doctor` 自检，它会逐个渠道测连通性。

## 渠道

不指定时用配置里的 `defaultChannel`，失败自动转移到其他渠道。指定渠道：

```bash
linger-image image-vision ./a.png --channel openai
linger-image channels          # 看有哪些渠道、各自缺什么
```
