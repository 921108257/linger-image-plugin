---
command: error-diagnosis
description: 报错截图诊断，提取错误信息并给出修复方案
---

# error-diagnosis — 报错截图诊断

专门分析报错截图，提取错误信息、定位根因、给出修复方案。

## 用法

```bash
npx linger-image-plugin error-diagnosis <报错截图> [上下文]
```

## 示例

```bash
npx linger-image-plugin error-diagnosis ./console-error.png
npx linger-image-plugin error-diagnosis ./crash.png "这是在 npm install 时报的"
npx linger-image-plugin error-diagnosis ./500-page.png "生产环境突然出现的"
```

## 输出内容

1. 错误摘要（类型/错误码/位置）
2. 根因分析
3. 修复方案（按优先级）
4. 相关资源链接

详细文档: `~/.opencode/command/error-diagnosis.md`
