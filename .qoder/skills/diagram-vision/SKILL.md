---
name: diagram-vision
description: 技术图表分析（架构图、流程图、ER 图），输出 Mermaid 代码。当用户发来技术文档截图、系统设计图、数据库 ER 图、UML 图时调用。
tags: [vision, diagram, architecture, flowchart, mermaid]
---

# diagram-vision — 技术图表分析

比 `image-vision` 更专的一档：同一张图，这里问的是"这个系统是怎么连起来的"，而不是"图里有什么"。

## 怎么用

**开发模式（本地未发布）**：
```bash
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" diagram-vision "<图表截图>" ["关注点"]
```

**发布后（用户安装后）**：
```bash
npx linger-image-plugin diagram-vision "<图表截图>" ["关注点"]
```

示例：

```bash
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" diagram-vision "./architecture.png"
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" diagram-vision "./flow.png" "重点看条件分支和循环"
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" diagram-vision "./er-diagram.png" "转成 Mermaid ER 图"
```

## 默认输出什么

不带关注点时，固定按五个维度分析：

1. **图表类型** — 架构图/流程图/时序图/ER图/状态机/网络拓扑/类图
2. **核心实体与关系** — 用 Mermaid 语法表达节点和连接
3. **数据流/控制流** — 箭头方向、条件判断、循环/递归、并发点
4. **关键标注** — 文字说明、数量/版本标记、状态
5. **技术栈推断** — 从图中识别的框架/库/协议/服务

**输出格式**：Markdown + Mermaid 代码块（可直接渲染）

带关注点时，关注点**完全替换**默认提示词，只答你问的。

## 典型工作流：文档图表可视化

```bash
# 1. 先转成 Mermaid
node "C:/Users/92110/Desktop/BaseLinger/Plugin/image-plugin/bin/linger-image.js" diagram-vision "./legacy-arch.png" > arch.md

# 2. 渲染 Mermaid（用支持 Mermaid 的编辑器 / GitHub / 在线工具）
# 3. 基于 Mermaid 代码维护，而不是基于截图
```

先跑这一步的意义：拿到的是可编辑的 Mermaid 代码，而不是静态图片。后续架构演进直接改代码，而不是重新画图。

## 支持的图表类型

| 图表类型 | Mermaid 语法 | 示例场景 |
|---------|-------------|---------|
| 架构图 | `graph TD` / `graph LR` | 微服务架构、系统拓扑 |
| 流程图 | `graph TD` + 条件节点 | 业务流程、算法逻辑 |
| 时序图 | `sequenceDiagram` | API 调用顺序、交互流程 |
| ER 图 | `erDiagram` | 数据库表关系、实体模型 |
| 状态机 | `stateDiagram-v2` | 订单状态、审批流 |
| 类图 | `classDiagram` | OOP 设计、继承关系 |

## 重要规则

1. **Mermaid 优先** — 输出的代码块要能直接渲染，不是伪代码
2. **保留原图标注** — 图里的文字、数量、版本号都要体现在 Mermaid 注释或节点名里
3. **技术栈识别** — 从节点名/图标推断具体技术（Kafka/Redis/K8s/gRPC）
4. **不猜测** — 看不清的连接线不要瞎编，标注"图中模糊"
5. **箭头语义** — 实线 vs 虚线、单向 vs 双向、标签（同步/异步/继承/依赖）

## 触发场景

| 场景 | 动作 |
|------|------|
| 用户发架构图 | 识别服务拓扑，输出 `graph TB` |
| 用户发流程图 | 识别条件分支，输出 `graph TD` + 菱形节点 |
| 用户发 ER 图 | 识别表关系，输出 `erDiagram` |
| 用户发时序图 | 识别消息顺序，输出 `sequenceDiagram` |
| 用户说"转成 Mermaid" | 直接输出 Mermaid 代码块 |
| 用户说"这个系统怎么连的" | 分析架构，重点讲数据流 |

## 与其他技能的区别

| 图表内容 | 用哪个技能 |
|---------|----------|
| 系统架构图 | `diagram-vision` |
| 数据图表（柱状图/折线图） | `image-vision`（通用识图） |
| UI 界面组件关系 | `ui-ux-vision` |
| 手绘草图 | `image-vision` |

**简单判断**：图里主要是方框+箭头（逻辑关系）→ `diagram-vision`；图里主要是数值/像素（视觉内容）→ `image-vision`。

## Gotchas

- 复杂图表可能需要分步骤："先列出所有节点" → "然后给出连接关系" → "最后写 Mermaid"
- 手绘图识别精度低，建议先问"能看清的部分是..."
- Mermaid 不支持斜线箭头和自由布局，输出的图可能和原图布局不同（但逻辑相同）
- 图里有中文时，Mermaid 节点 ID 用英文/拼音，显示文本用中文：`A[用户服务]`
- 超过 20 个节点的大图，Mermaid 渲染可能慢，考虑分区（按子系统拆成多个 `graph`）

## 输出示例

**输入**：一张微服务架构图

**输出**：

```markdown
## 图表类型
微服务架构图（API Gateway + 后端服务 + 消息队列）

## Mermaid 代码

\`\`\`mermaid
graph TB
    Client[移动端/Web端]
    Gateway[API Gateway<br/>Kong]
    Auth[Auth Service<br/>:3001]
    User[User Service<br/>:3002]
    Order[Order Service<br/>:3003]
    Payment[Payment Service<br/>:3004]
    
    UserDB[(User DB<br/>PostgreSQL)]
    OrderDB[(Order DB<br/>PostgreSQL)]
    Cache[(Redis Cache)]
    Queue[Message Queue<br/>Kafka]
    
    Client -->|HTTPS| Gateway
    Gateway --> Auth
    Gateway --> User
    Gateway --> Order
    Gateway --> Payment
    
    Auth --> Cache
    User --> UserDB
    User --> Cache
    Order --> OrderDB
    Order -->|发布事件| Queue
    Payment -->|订阅事件| Queue
    Payment -->|支付回调| Order
\`\`\`

## 数据流

1. 客户端请求 → API Gateway 认证（Auth Service）
2. 认证通过后路由到业务服务（User/Order/Payment）
3. Order Service 下单成功后发布事件到 Kafka
4. Payment Service 订阅事件，处理支付逻辑
5. 支付回调通知 Order Service 更新订单状态

## 技术栈推断

- API Gateway: Kong（从图中标注识别）
- 服务端口: 3001-3004（Node.js / Go 常见端口段）
- 数据库: PostgreSQL（从图标识别）
- 缓存: Redis（从图标识别）
- 消息队列: Kafka（从图中标注识别）
- 通信协议: HTTPS（客户端）、内部可能是 gRPC 或 REST

## 关键标注

- Auth Service 是认证入口，所有请求先过它
- User/Order 服务都访问 Redis 缓存（减少 DB 查询）
- Order → Payment 是异步通信（通过 Kafka），支持解耦和重试
- Payment 有回调箭头指向 Order（同步确认支付结果）
```

---

更多示例见 [EXAMPLES.md](../../EXAMPLES.md)。
