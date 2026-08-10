/**
 * 三个技能的提示词轮廓。
 * 分别对应：通用识图、UI/UX 专用识图、UI 素材设计提示词生成。
 */

export const SKILL_PROMPTS = {
  "image-vision": {
    system: "你是图片内容分析专家。准确识别图片中的文字、物体、场景和布局，用中文描述。",
    userTemplate: (question) =>
      question || "请详细描述这张图片的内容，包括：主要元素、文字、布局、色彩、风格。",
  },

  "ui-ux-vision": {
    system:
      "你是 UI/UX 设计分析专家。从设计系统的角度审视界面：组件层级、信息架构、交互流程、视觉层次、可访问性。",
    userTemplate: (question) =>
      question ||
      `请从 UI/UX 角度分析这个界面，涵盖：
1. **布局与层级**：栅格、间距、视觉层次
2. **组件识别**：导航、卡片、按钮、表单等组件及其状态
3. **设计系统**：色彩、字体、圆角、阴影等 token 提取
4. **交互模式**：已知的交互逻辑（悬停、点击、滚动）
5. **响应式**：当前屏幕尺寸，是否有断点适配迹象
6. **可访问性**：对比度、触控目标尺寸、信息密度

输出格式：
- 组件清单（Markdown 列表）
- 提取的设计 token（CSS 变量形式）
- 改进建议（如有明显问题）`,
  },

  "ui-material-design": {
    system:
      "你是 UI 素材设计提示词生成专家。根据用户提供的参考图和需求，生成结构化的 Midjourney / Stable Diffusion 提示词。",
    userTemplate: (question) =>
      question ||
      `基于这张参考图，生成 UI 素材设计提示词，分为三个层次：

1. **核心提示词**（30-50 词，英文）：
   - 主题、风格（flat/neumorphic/glassmorphism/3D）
   - 配色方案（dark/light/gradient/neon）
   - 关键元素（icon/button/card/background）
   - 艺术风格修饰词（minimal/bold/elegant/playful）

2. **参数建议**：
   - 推荐模型（SDXL/MJ v6/DALL-E 3）
   - 比例（--ar 16:9 / 1:1 / 9:16）
   - 其他参数（--stylize / --chaos / --quality）

3. **变体方向**（3 个）：
   - 不同配色（暖/冷/中性）
   - 不同风格（扁平/渐变/拟物）
   - 不同密度（极简/丰富）

输出 Markdown，每个变体单独成块，可直接复制到生成器。`,
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
