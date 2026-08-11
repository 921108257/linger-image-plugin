---
command: diagram-vision
description: 技术图表分析（架构图/流程图/ER图），输出 Mermaid 代码
---

# diagram-vision — 技术图表分析

识别架构图、流程图、时序图、ER 图、UML 图等技术文档图表，输出结构化的 Mermaid 语法。

## 用法

```bash
npx linger-image-plugin diagram-vision <图表截图> [关注点]
```

## 示例

```bash
npx linger-image-plugin diagram-vision ./architecture.png
npx linger-image-plugin diagram-vision ./flow.png "重点看异常处理分支"
npx linger-image-plugin diagram-vision ./er-diagram.png "提取表关系"
```

## 输出内容

1. 图表类型识别
2. Mermaid 代码（可直接渲染）
3. 核心实体清单
4. 数据流/控制流
5. 技术栈推断

详细文档: `~/.opencode/command/diagram-vision.md`
