# linger-image-plugin — 多渠道识图能力

为没有原生识图能力的 Agent 提供图片识别、UI/UX 界面分析和 UI 素材设计提示词生成。

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

- 用户发图片路径、图片 URL、消息含 `Saved attachments:` → `image-vision`
- 界面截图、设计稿、前端还原 → `ui-ux-vision`
- 要生成素材、要 AI 绘图提示词 → `ui-material-design`

## 重要规则

- 你的底层模型可能不具备原生识图能力，遇到图片时**不要用 Read 工具**（Read 只会读到二进制乱码或直接失败），改用 `linger-image` 命令。
- 路径含空格时**必须加引号**。
- 拿到文字描述后，基于描述回答用户，不要声称"我看到了图片"。
- 插件自动故障转移：首选渠道失败时尝试下一个，直到成功或全部失败。

## 配置

插件按优先级读配置：

1. `$LINGER_IMAGE_CONFIG` 指向的文件
2. 向上查找的 `.linger-image.json`（到仓库根或文件系统根为止）
3. `~/.linger-image/config.json`
4. 环境变量合成的单渠道（`LINGER_VISION_API_KEY` / `_BASE_URL` / `_MODEL`）

没配置时：

```bash
linger-image config --channel qwen     # 生成用户级配置，填阿里云百炼骨架
linger-image config --channel openai   # 生成 OpenAI 骨架
```

配置示例见仓库内的 `example.linger-image.json`。

首次使用前跑 `linger-image doctor` 自检连通性。

## 支持的渠道

OpenAI 兼容格式的任意 vision 模型：

- 阿里云百炼（`qwen-vl-max` / `qwen-vl-plus`）— 推荐，新用户有 100 万 token 免费额度
- OpenAI（`gpt-4o-mini` / `gpt-4o`）
- 智谱（`glm-4v-flash` / `glm-4v`）
- 硅基流动（`Qwen/Qwen2.5-VL-72B-Instruct`）
- Ollama（`llama3.2-vision`）
- 其他兼容 `/v1/chat/completions` 的服务

配置多个渠道时，首选失败自动转移到下一个。

详细文档：每个技能的 `SKILL.md`（调用对应的 slash command：`/image-vision` / `/ui-ux-vision` / `/ui-material-design`）。
