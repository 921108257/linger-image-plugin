---
description: 多渠道识图能力 — 通用图片识别
---

调用 `linger-image image-vision "<图片路径|URL>" ["问题"]` 识别图片内容。你的底层模型可能不具备原生识图能力，遇到图片时不要用 Read 工具（Read 只会读到二进制乱码），改用这个命令。用户发图片路径、图片 URL、或消息含 `Saved attachments:` 时触发。拿到文字描述后基于描述回答，不要声称"我看到了图片"。路径含空格时加引号。多张图一次传：`linger-image image-vision ./a.png ./b.png "对比这两张图"`。首次使用前跑 `linger-image doctor` 自检。详见 `/image-vision`。
