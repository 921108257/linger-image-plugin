# 快速上手

5 分钟配置好 linger-image-plugin。

## 1. 安装

```bash
npm install -g linger-image-plugin
# 或
npx linger-image-plugin install
```

## 2. 配置识图服务

选一个识图服务商（推荐阿里云百炼，新用户有 100 万 token 免费额度）：

```bash
# 生成配置骨架
linger-image config --channel qwen

# 填入 API key（二选一）
# 方式 1: 设置环境变量
export DASHSCOPE_API_KEY=sk-你的key

# 方式 2: 直接编辑配置文件
# 打开 ~/.linger-image/config.json
# 把 "env:DASHSCOPE_API_KEY" 改成 "sk-你的key"
```

获取 API key：
- **阿里云百炼**（推荐）: https://dashscope.console.aliyun.com/apiKey
- OpenAI: https://platform.openai.com/api-keys
- 智谱: https://open.bigmodel.cn/usercenter/apikeys
- 硅基流动: https://cloud.siliconflow.cn/account/ak

## 3. 验证

```bash
linger-image doctor
```

看到 `✓ qwen: 延迟 XXXms` 就配置成功了。

## 4. 试用五个技能

```bash
# 通用图片识别
linger-image image-vision ./screenshot.png

# UI/UX 界面分析
linger-image ui-ux-vision ./design.png

# UI 素材设计提示词生成
linger-image ui-material-design ./reference.jpg "生成深色系图标"

# 技术图表分析（输出 Mermaid）
linger-image diagram-vision ./architecture.png

# 报错截图诊断
linger-image error-diagnosis ./error.png
```

## 5. 安装到你的 Agent

```bash
# 自动检测已安装的 Agent
linger-image install

# 或手动指定
linger-image install --agent claude
linger-image install --agent cursor
linger-image install --all  # 全部
```

安装后，在 Agent 对话中：
- 发送图片路径，Agent 会自动调用 `image-vision`
- 说"分析这个界面"，Agent 会调用 `ui-ux-vision`
- 说"这个报错是什么原因"，Agent 会调用 `error-diagnosis`

## 常见问题

**Q: doctor 报 "配置不完整"**  
A: API key 没填。检查环境变量或编辑配置文件。

**Q: doctor 报 401/403**  
A: API key 错了。去对应平台重新生成。

**Q: doctor 报 "返回空内容"**  
A: 模型名字错了，或不是 vision 型号。检查配置里的 `model` 字段。

**Q: 想用多个渠道做故障转移**  
A: 多次运行 `linger-image config --channel X`，会追加到配置文件。第一个是默认渠道。

**Q: Windows 路径报错**  
A: 路径含空格时必须加引号：`linger-image image-vision "C:\Users\你\Desktop\图.png"`

## 进阶

- 多渠道配置与故障转移：`example.linger-image.json`
- 按技能覆盖模型/token 数：README.md "配置系统" 章节
- 项目级配置：在项目根创建 `.linger-image.json`
- 跨平台环境变量：用 `"apiKey": "env:VAR_NAME"` 引用

完整文档：[README.md](README.md)
