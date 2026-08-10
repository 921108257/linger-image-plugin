/**
 * 三个技能的提示词轮廓。
 * 分别对应：通用识图、UI/UX 专用识图、UI 素材设计提示词生成。
 */

export const SKILL_PROMPTS = {
  "image-vision": {
    system: "你是图片内容分析专家。准确识别图片中的文字、物体、场景和布局。回答简洁直接，无需开场白，直奔主题。",
    userTemplate: (question) =>
      question || "描述这张图片的内容：主要元素、文字（逐字识别）、布局、色彩、风格。",
  },

  "ui-ux-vision": {
    system:
      "你是 UI/UX 设计分析专家。从设计系统角度审视界面：组件层级、交互流程、视觉层次、可访问性。输出结构化，用 CSS 变量表达设计 token。",
    userTemplate: (question) =>
      question ||
      `从 UI/UX 角度分析这个界面：

**布局与层级**：栅格列数、间距节奏（4/8/16/24/32）、Z-index 层次
**组件识别**：列出导航/卡片/按钮/表单/模态框及其状态（normal/hover/active/disabled）
**设计系统**：
\`\`\`css
--color-bg-base: #...;
--color-text-primary: #...;
--font-family-base: ...;
--font-size-body: ...;
--border-radius: ...;
--shadow-card: ...;
\`\`\`
**交互模式**：点击/悬停/滚动/键盘导航的可见线索
**响应式**：当前断点（mobile/tablet/desktop），适配迹象
**可访问性**：对比度（WCAG AA/AAA）、触控目标≥44px、焦点可见性

格式：Markdown，组件用列表，token 用代码块。`,
  },

  "ui-material-design": {
    system:
      "你是 UI 素材设计提示词生成专家。基于参考图生成 Midjourney / Stable Diffusion 提示词，结构化、可直接使用。",
    userTemplate: (question) =>
      question ||
      `基于参考图生成 UI 素材设计提示词：

**核心提示词**（40-60 词英文，用逗号分隔）：
主题, 风格关键词(flat/neumorphic/glassmorphism/3D/gradient), 配色(dark mode/light/vibrant/pastel/monochrome), 核心元素(icon/button/card/illustration), 艺术修饰(minimal/bold/elegant/playful/futuristic), 材质(glass/metal/soft/matte)

**参数建议**：
- 模型：Midjourney v6 / SDXL / DALL-E 3
- 比例：\`--ar 1:1\` (图标), \`--ar 16:9\` (背景), \`--ar 3:4\` (竖版)
- 风格化：\`--stylize 50-150\` (MJ), \`--chaos 20\` (变化度)
- 质量：\`--quality 2\` (MJ高质量)

**三个变体方向**：
1. 配色变化：暖色调 / 冷色调 / 高对比黑白
2. 风格切换：扁平 → 渐变拟物 → 3D 立体
3. 密度调整：极简留白 → 丰富装饰

每个变体给出完整提示词 + 参数，可直接复制。`,
  },

  "diagram-vision": {
    system:
      "你是技术图表分析专家。识别架构图、流程图、ER 图、UML 图，提取结构化信息并生成 Mermaid 代码。",
    userTemplate: (question) =>
      question ||
      `分析这张技术图表：

**图表类型**：架构图/流程图/时序图/ER图/状态机/网络拓扑/类图/其他
**核心实体与关系**（用 Mermaid 表达）：
\`\`\`mermaid
graph LR
  A[节点A] -->|关系| B[节点B]
  B --> C{条件分支}
  C -->|是| D[结果1]
  C -->|否| E[结果2]
\`\`\`
**数据流/控制流**：箭头方向、条件判断、循环/递归、并发/同步点
**关键标注**：文字说明、数量/版本标记、状态/阶段
**技术栈推断**：从图中识别的框架/库/协议/服务（Kafka/Redis/K8s/gRPC/REST...）

优先输出可渲染的 Mermaid 代码块，图表类型用对应的 Mermaid 语法（graph/sequenceDiagram/erDiagram/stateDiagram）。`,
  },

  "error-diagnosis": {
    system:
      "你是报错诊断专家。分析错误截图，提取错误码、堆栈、根因，给出可直接执行的修复方案。重点：文件路径、行号、异常类型、环境上下文。",
    userTemplate: (question) =>
      question ||
      `诊断这个报错截图：

**错误摘要**：
- 错误类型：SyntaxError/TypeError/ReferenceError/NetworkError/PermissionError/CompileError
- 错误码或异常名：\`HTTP 404\` / \`ENOENT\` / \`NullPointerException\`
- 触发位置：\`src/utils/helper.ts:42:15\`

**根因分析**：
- 直接原因（what went wrong）：函数调用/变量引用/资源访问失败的具体原因
- 深层原因（why it happened）：依赖缺失/配置错误/版本不兼容/权限不足/逻辑错误
- 相关上下文：Node 版本/环境变量/依赖版本/运行模式（dev/prod）

**修复方案**（按优先级，可直接执行）：
1. **立即修复**（代码片段或命令）：
\`\`\`bash
npm install missing-package
\`\`\`
或
\`\`\`typescript
// 修复代码示例
const result = data?.value ?? defaultValue;
\`\`\`
2. **需验证的假设**：检查配置文件/环境变量/文件权限
3. **预防措施**：类型检查/单元测试/Lint 规则/配置校验

**相关资源**：
- 官方文档：识别出框架/库后给出文档链接或搜索关键词
- Stack Overflow 关键词：提取高频解法的搜索词

输出 Markdown，代码用语法高亮。`,
  },
};

/**
 * 根据技能名选提示词轮廓。
 * @param {"image-vision"|"ui-ux-vision"|"ui-material-design"} skill
 * @param {string=} question 用户的追问（可选）
 */
export function getPromptForSkill(skill, question = "") {
  const profile = SKILL_PROMPTS[skill];
  if (!profile) {
    throw new Error(
      `未知技能: ${skill}。可用: ${Object.keys(SKILL_PROMPTS).join(", ")}`,
    );
  }
  return {
    system: profile.system,
    prompt: profile.userTemplate(question.trim()),
  };
}
