---
name: error-diagnosis
description: 报错截图诊断，提取错误信息并给出修复方案。当用户发来报错截图、异常堆栈、控制台错误、编译失败信息时调用。
tags: [vision, error, debug, diagnosis, troubleshooting]
---

# error-diagnosis — 报错截图诊断

专门处理"看不懂这个报错"的场景 — 提取错误信息、定位根因、给出可执行的修复方案。

## 怎么用

**开发模式（本地未发布）**：
```bash
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" error-diagnosis "<报错截图>" ["关注点"]
```

**发布后（用户安装后）**：
```bash
npx linger-image-plugin error-diagnosis "<报错截图>" ["关注点"]
```

示例：

```bash
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" error-diagnosis "./ts-error.png"
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" error-diagnosis "./500-error.png" "重点看请求头和响应体"
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" error-diagnosis "./build-fail.png" "这是哪个依赖的问题"
```

## 默认输出什么

不带关注点时，固定按四个维度诊断：

1. **错误摘要** — 错误类型（语法/运行时/编译/网络/权限）、错误码、触发位置
2. **根因分析** — 直接原因、深层原因、相关上下文（环境/配置/依赖）
3. **修复方案** — 立即可行的修复（代码/命令）、需验证的假设、预防措施
4. **相关资源** — 官方文档链接、Stack Overflow 关键词

**输出格式**：Markdown，代码用语法高亮块

带关注点时，关注点**完全替换**默认提示词，只答你问的。

## 典型工作流：报错 → 修复

```bash
# 1. 截图报错信息（控制台/终端/IDE）
# 2. 诊断
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" error-diagnosis ./error.png > diagnosis.md

# 3. 看 "立即修复" 部分，复制命令或代码
# 4. 验证修复是否生效
```

## 支持的错误类型

| 错误类型 | 示例 | 识别点 |
|---------|------|--------|
| **语法错误** | `SyntaxError: Unexpected token` | 编译阶段、解析失败 |
| **类型错误** | `TS2339: Property 'x' does not exist` | TypeScript 编译错误 |
| **运行时错误** | `TypeError: Cannot read property 'x' of null` | 执行阶段、空指针 |
| **网络错误** | `HTTP 404 / 500 / CORS error` | API 请求失败 |
| **权限错误** | `EACCES: permission denied` | 文件/端口权限 |
| **依赖错误** | `MODULE_NOT_FOUND` | npm/pip/cargo 依赖缺失 |
| **编译错误** | `error: linker command failed` | C/C++/Rust 编译失败 |
| **数据库错误** | `Duplicate entry / Foreign key constraint` | SQL 执行失败 |

## 重要规则

1. **逐字提取** — 错误码、文件路径、行号必须精确，不能改写
2. **根因优先** — 先说深层原因（为什么会这样），再说表面原因（what went wrong）
3. **可执行修复** — 给命令就直接能跑，给代码就直接能粘贴，不要伪代码
4. **分优先级** — 最可能的修复排最前，低概率的排后面
5. **环境上下文** — 从截图推断 Node 版本/OS/框架/依赖版本，标注"推测"

## 触发场景

| 场景 | 动作 |
|------|------|
| 用户发终端报错截图 | 提取错误码和堆栈，给出命令修复 |
| 用户发 IDE 编译错误 | 提取类型/语法错误，给出代码修复 |
| 用户发浏览器 console 错误 | 提取 JS 异常，分析网络请求 |
| 用户发 500 错误截图 | 提取状态码和响应体，推断后端问题 |
| 用户说"这个报错怎么办" | 完整诊断流程 |
| 用户说"为什么编译失败" | 重点分析编译错误和依赖 |

## 与其他技能的区别

| 截图内容 | 用哪个技能 |
|---------|----------|
| 报错信息（红色/堆栈/异常） | `error-diagnosis` |
| 正常日志（info/debug） | `image-vision`（通用识图） |
| 代码截图（无报错） | `image-vision` + "提取代码" |
| 网络请求（无报错） | `image-vision` + "分析请求" |

**简单判断**：红色高亮或带 `Error`/`Exception`/错误码 → `error-diagnosis`；正常输出 → `image-vision`。

## Gotchas

- 堆栈信息可能被截断，优先分析最顶部的错误（最接近触发点）
- 有些错误是连锁反应（A 失败导致 B 失败），找最早的那个
- Windows 路径反斜杠、Linux 正斜杠，从路径格式推断 OS
- `npm ERR!` 后面通常有真正的错误原因，往下翻
- 网络错误看请求头和响应体，CORS 错误看 `Access-Control-Allow-Origin`
- TypeScript 错误码看前缀：`TS2xxx` 是类型错误，`TS1xxx` 是语法错误
- 截图模糊时，优先提取可见的关键信息（错误码/文件名），其他标注"无法识别"

## 输出示例

**输入**：一张 TypeScript 编译错误截图

**输出**：

```markdown
## 错误摘要

- **错误类型**：TypeScript 编译错误
- **错误码**：`TS2339`
- **触发位置**：`src/utils/api.ts:27:18`
- **错误信息**：`Property 'data' does not exist on type 'Response'.`

## 根因分析

**直接原因**：
代码试图访问 `response.data`，但 `fetch` 返回的 `Response` 对象上没有 `data` 属性。

**深层原因**：
1. `fetch` API 返回的是 `Response` 对象，需要先调用 `.json()` 或 `.text()` 解析响应体
2. 开发者可能混淆了 `axios` 的响应格式（`axios` 直接返回 `response.data`）和原生 `fetch`
3. 缺少类型守卫，未检查响应体的实际结构

**相关上下文**（从截图推断）：
- TypeScript 版本：4.9+（从错误格式推断）
- 编译模式：`strict: true`（否则不会报此错误）
- 运行环境：可能是 Node.js 或浏览器（`fetch` 是通用 API）

## 修复方案

### 1. 立即修复（最常见）

```typescript
// 修复前（错误代码）
const response = await fetch('/api/users');
const users = response.data; // ❌ Response 上没有 data 属性

// 修复后
const response = await fetch('/api/users');
const data = await response.json(); // ✅ 先解析 JSON
const users = data.users; // 根据实际 API 响应结构访问
```

### 2. 类型安全版本

如果 API 响应格式已知，添加类型定义：

```typescript
interface ApiResponse {
  users: User[];
  total: number;
}

const response = await fetch('/api/users');

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const data: ApiResponse = await response.json();
const users = data.users; // ✅ 类型安全
```

### 3. 需验证的假设

- 检查 API 返回的实际格式（是 `{ users: [...] }` 还是 `[...]`）
- 确认响应 `Content-Type` 是 `application/json`（如果不是，用 `.text()` 而非 `.json()`）
- 如果项目里同时用 `fetch` 和 `axios`，统一用一个避免混淆

### 4. 预防措施

**ESLint 规则**（检测未 await 的 Promise）：
```json
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error"
  }
}
```

**单元测试**：
```typescript
test('fetch users returns correct format', async () => {
  const response = await fetch('/api/users');
  const data = await response.json();
  expect(data).toHaveProperty('users');
  expect(Array.isArray(data.users)).toBe(true);
});
```

**类型定义文件**：创建 `types/api.d.ts` 统一管理 API 响应类型。

## 相关资源

- **MDN 文档**: [Using Fetch - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- **TypeScript 错误码**: [TS2339 - Property does not exist on type](https://typescript.tv/errors/#TS2339)
- **Stack Overflow 关键词**: `typescript response.data does not exist fetch`
- **对比 axios**: 如果习惯 axios 的 API，可以继续用 axios 或写个 wrapper 统一接口

---

## 快速自检清单

当收到报错截图时，按此顺序检查：

1. ✅ 错误码/异常名是什么？
2. ✅ 哪一行代码触发的？（文件:行号）
3. ✅ 堆栈里最接近业务代码的是哪行？（跳过框架内部）
4. ✅ 从截图能看出什么环境信息？（Node 版本/OS/终端/IDE）
5. ✅ 有没有相关的请求/响应/配置？
6. ✅ 最直接的修复是什么？（一行命令或几行代码）

---

更多示例见 [EXAMPLES.md](../../EXAMPLES.md)。
