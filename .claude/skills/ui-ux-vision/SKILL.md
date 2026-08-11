---
name: ui-ux-vision
description: >
  UI/UX 界面截图专用分析。从设计系统角度拆解界面：组件层级、栅格与间距、
  设计 token（色彩/字体/圆角/阴影）、交互模式、可访问性问题。
  适用于：用户发来界面截图、设计稿、Figma 导出图、网页截图、App 截图，并要求
  "分析这个界面""这个 UI 怎么样""提取设计规范""还原这个页面""照着这个图写前端"
  "这个设计有什么问题""帮我看下这个交互"。也用于前端还原前的读稿环节。
  纯内容识别（读文字、认物体）请改用 image-vision，
  生成 AI 绘图提示词请改用 ui-material-design。
argument-hint: "<界面截图路径|URL> [关注点]"
license: MIT
---

# ui-ux-vision — UI/UX 界面分析

比 `image-vision` 更专的一档：同一张图，这里问的是"这个界面是怎么搭出来的"，而不是"图里有什么"。

## 怎么用

```bash
npx npx linger-image-plugin ui-ux-vision "<界面截图>" ["关注点"]
```

```bash
npx linger-image-plugin ui-ux-vision "./design.png"
npx linger-image-plugin ui-ux-vision "./page.png" "重点看导航和栅格系统"
npx linger-image-plugin ui-ux-vision "./mobile.png" "这个表单的可访问性问题"
```

## 默认输出什么

不带关注点时，固定按六个维度分析：

1. **布局与层级** — 栅格、间距节奏、视觉层次
2. **组件识别** — 导航、卡片、按钮、表单及其状态
3. **设计系统** — 色彩/字体/圆角/阴影，以 CSS 变量形式给出
4. **交互模式** — 可推断的悬停、点击、滚动行为
5. **响应式** — 当前屏幕尺寸，是否有断点适配迹象
6. **可访问性** — 对比度、触控目标尺寸、信息密度

带关注点时，关注点**完全替换**默认提示词，只答你问的。

## 典型工作流：照图写前端

```bash
# 1. 先读稿，拿到组件清单和 design token
npx linger-image-plugin ui-ux-vision "./ref.png" > /tmp/ui-spec.md

# 2. 基于 spec 写代码，而不是基于"我猜这个图长什么样"
```

先跑这一步的意义：拿到的是结构化的组件清单和 token，而不是一段散文描述。写代码时对着 token 表填值，比反复问"这个蓝色是什么蓝"省事。

## 重要规则

- 一次传一个界面。多个页面分开调用，否则模型会把不同页面的组件混在一起。
- 长页面截图（超长滚动图）先切分，多数渠道对单图分辨率有上限，整张糊了 token 提取会不准。
- 设计稿和实现截图放一起比对时，用 `image-vision` 做差异对比，这个技能更适合单张深挖。
- 大图先确认体积：超过渠道上限会直接报错，`maxImageBytes` 默认 10MB。

## 渠道

UI 分析吃 token 更多，建议给这个技能单独配大模型和更高的 `maxTokens`：

```json
{
  "name": "qwen",
  "model": "qwen-vl-plus",
  "skills": {
    "ui-ux-vision": { "model": "qwen-vl-max", "maxTokens": 4096 }
  }
}
```

`skills` 段按技能覆盖 `model` / `maxTokens` / `detail` / `system`，其余字段继承渠道本身。
