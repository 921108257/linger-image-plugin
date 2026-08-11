---
name: ui-material-design-image
description: >
  根据参考图生成专用于 gpt-image-2、seedream、qwen-image-3.0 等 AI 绘图模型的
  UI 素材提示词。输出核心提示词、模型参数、三个变体方向，可直接用于素材生成。
  适用于：用户发参考图要求"生成这种风格的图标""给我 seedream 提示词"
  "用 gpt-image-2 做一套插画""qwen-image 能生成这种效果吗"。
  通用绘图提示词改用 ui-material-design，界面结构分析改用 ui-ux-vision。
argument-hint: "<参考图路径|URL> [素材需求与目标模型]"
license: MIT
---

# ui-material-design-image — AI 绘图模型专用素材提示词

输入参考图，输出针对 **gpt-image-2**、**seedream**、**qwen-image-3.0** 等 AI 绘图模型优化的提示词。

## 怎么用

```bash
npx npx linger-image-plugin ui-material-design-image "<参考图>" ["素材需求"]
```

```bash
npx linger-image-plugin ui-material-design-image "./ref.jpg"
npx linger-image-plugin ui-material-design-image "./icon.png" "用 gpt-image-2 生成深色系应用图标"
npx linger-image-plugin ui-material-design-image "./hero.png" "seedream 生成扁平风空状态插画"
npx linger-image-plugin ui-material-design-image "./ui.jpg" "qwen-image-3.0 做配套的 banner 素材"
```

## 默认输出

三段结构：

1. **核心提示词**（简体中文 + 英文关键词）— 主题、风格（扁平/渐变/玻璃拟态/3D）、配色方案、核心元素、艺术风格
2. **模型参数** — 推荐模型（gpt-image-2 / seedream / qwen-image-3.0）、尺寸、风格权重、种子值范围
3. **三个变体方向** — 配色变化（暖/冷/中性）、风格切换（简约/丰富/立体）、比例调整（方形/宽屏/竖版）

每个变体独立成块，附带对应模型的参数建议。

## 重要规则

- **中文优先**：这些模型对中文提示词的响应更准确，英文关键词仅作补充
- **参考图是风格源**，不是要复刻的对象；需要图生图请用模型的原生功能
- **说清素材类型**：图标/插画/背景/UI 组件，类型影响尺寸和细节密度
- **模型特性**：
  - `gpt-image-2`：擅长扁平矢量风格，色彩鲜明，适合图标和插画
  - `seedream`：擅长写实与渐变，光影细腻，适合氛围背景和插画
  - `qwen-image-3.0`：中文理解强，风格多样，通用性高
- 商用前确认模型授权条款

## 渠道配置

提示词生成需更长输出，建议单独提高 `maxTokens`：

```json
{
  "name": "qwen",
  "model": "qwen-vl-max",
  "skills": {
    "ui-material-design-image": { "maxTokens": 4096 }
  }
}
```
