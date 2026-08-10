---
name: ui-material-design
description: >
  根据参考图生成 UI 素材的 AI 绘图提示词（Midjourney / Stable Diffusion / DALL-E）。
  输出核心提示词、参数建议、三个变体方向，可直接复制进生成器。
  适用于：用户发参考图并要求"生成这种风格的素材""给我提示词""我要做类似的图标"
  "照这个风格出一套""帮我写 midjourney 提示词""这个风格怎么描述""要一套配套的插画"。
  分析界面结构请改用 ui-ux-vision，单纯识别图片内容请改用 image-vision。
argument-hint: "<参考图路径|URL> [素材需求]"
license: MIT
---

# ui-material-design — UI 素材设计提示词生成

输入一张参考图，输出可直接用的绘图提示词。解决的是"我知道我要什么风格，但不知道怎么用英文描述给生成器"。

## 怎么用

```bash
npx linger-image ui-material-design "<参考图>" ["素材需求"]
```

```bash
linger-image ui-material-design "./ref.jpg"
linger-image ui-material-design "./style.png" "生成深色系的应用图标素材"
linger-image ui-material-design "./hero.png" "要一套配套的空状态插画，扁平风"
```

## 默认输出什么

三段结构：

1. **核心提示词**（30-50 词英文）— 主题、风格（flat / neumorphic / glassmorphism / 3D）、配色、关键元素、艺术修饰词
2. **参数建议** — 推荐模型（SDXL / MJ v6 / DALL-E 3）、比例 `--ar`、`--stylize` / `--chaos` / `--quality`
3. **三个变体方向** — 换配色（暖/冷/中性）、换风格（扁平/渐变/拟物）、换密度（极简/丰富）

每个变体单独成块，直接复制即可。带上素材需求参数时，需求会替换默认提示词。

## 重要规则

- 参考图是**风格来源**，不是要复刻的内容。想要"和这张图一样的图"用图生图，不是这个技能。
- 说清素材类型（图标 / 插画 / 背景 / banner），类型不同参数差别很大，尤其是 `--ar`。
- 提示词是英文的，这是生成器的要求，不是漏译。
- 商用前自己确认生成器的授权条款，这个技能不处理版权问题。

## 渠道

提示词生成需要更长输出，建议单独提高 `maxTokens`：

```json
{
  "name": "qwen",
  "model": "qwen-vl-max",
  "skills": {
    "ui-material-design": { "maxTokens": 4096 }
  }
}
```
