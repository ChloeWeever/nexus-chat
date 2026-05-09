<div align="center">
  <img src="src/assets/icon.svg" alt="Nexus Chat" width="96" />
  <h1>Nexus Chat</h1>
  <p>功能丰富的 AI 聊天桌面应用，支持数据可视化与工具调用</p>
  <p>
    <a href="LICENSE">GPL-3.0 许可证</a>
    · Copyright (c) 2026 ChloeWeever
  </p>
</div>

---

[English](README.md) · 中文

## 功能特性

- **桌面宠物** — 从 [Petdex](https://petdex.crafter.run) 图鉴（1400+ 宠物）中挑选一只动态陪伴；宠物会在聊天区域自由漫游，并对 AI 状态作出反应：思考时查阅资料、生成时奔跑、完成时挥手致意
- **多提供商支持** — 支持 LiteLLM 代理、OpenAI 和 Anthropic；每个会话可独立配置 Base URL、API Key、模型、温度和最大 Token 数
- **丰富可视化** — AI 可通过简洁的 XML 卡片语法，直接在对话中渲染柱状图、折线图、面积图、饼图/环形图、数据表、指标卡片和进度条
- **动画解释** — AI 可生成内嵌 HTML 动画，直观展示复杂概念（如算法、流程、数学原理），动画自动播放、无限循环
- **文件上传** — 支持图片、PDF、Word 文档、Excel 表格、PowerPoint 文件及纯文本/代码文件；内容自动提取并注入上下文
- **图片 OCR** — 粘贴或附加图片后，应用通过 Tesseract.js 提取文字（支持英文与简体中文）
- **JavaScript 执行** — AI 可在沙盒化的 Node.js Worker 线程中编写并运行代码（10 秒超时，无网络/文件系统访问）
- **网络搜索** — 可选的实时搜索功能，通过 [Ollama Web Search API](https://ollama.com) 将最新信息注入 AI 上下文
- **技能系统** — 以 SKILL.md 文件形式定义可复用的指令集，并通过 `/技能名` 斜杠命令调用；内置技能包括 `summarize`、`translate`、`explain`、`improve`、`review`、`commit`
- **流式响应**，并支持中途停止
- **对话历史** — 按日期分组，标题由第一条消息自动生成
- **深色 / 浅色 / 跟随系统** 主题

## 普通用户

从 [Releases](https://github.com/ChloeWeever/nexus-chat/releases) 页面下载。目前提供 Windows x64、macOS arm64（Apple Silicon）、macOS Intel 版本。其他平台（Windows ARM、Linux 等）请自行编译。

### 免费使用

如果没有 LLM API 密钥，或不想付费，可前往 [Nvidia NIM APIs](https://build.nvidia.com/models) 申请免费的 API 端点。推荐选择 [deepseek-v4-flash](https://build.nvidia.com/deepseek-ai/deepseek-v4-flash)。

## 开发者

### 安装与运行

```bash
npm install
npm run dev
```

### 打包发布

```bash
# 当前平台
npm run package

# 指定平台
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

产物输出到 `dist/` 目录。

## 配置说明

点击左下角齿轮图标打开 **设置**：

| 选项卡 | 字段 | 说明 |
|---|---|---|
| 提供商 | 提供商 | LiteLLM / OpenAI / Anthropic |
| 提供商 | Base URL | 代理或 API 端点（使用官方 API 时留空） |
| 提供商 | API Key | 所选提供商的密钥 |
| 模型 | 模型 | 如 `gpt-4o-mini`、`claude-sonnet-4-6`、`ollama/llama3` |
| 模型 | 温度 | 0 = 确定性输出 · 2 = 高度创意 |
| 模型 | 最大 Token 数 | 限制响应长度 |
| 工具 | 网络搜索 | 启用后填入 Ollama API Key |
| 工具 | 代码执行 | 允许 AI 运行 JavaScript 代码片段 |
| 工具 | 动画生成 | 允许 AI 生成 HTML 动画来解释复杂概念 |
| 外观 | 主题 | 浅色 / 深色 / 跟随系统 |
| 外观 | 桌面宠物 | 从 Petdex 图鉴中选择；可开关自由漫游 |

## 卡片语法

系统提示词会引导 AI 使用 XML 标签渲染结构化数据：

```xml
<card type="bar_chart" title="月度营收">
{"labels":["1月","2月","3月","4月"],"datasets":[{"label":"销售额","data":[1200,1800,1500,2100]}]}
</card>

<card type="line_chart" title="用户增长">
{"labels":["第1周","第2周","第3周"],"datasets":[{"label":"用户数","data":[500,720,1040]}]}
</card>

<card type="metric">
{"metrics":[{"label":"月收入","value":"$45K","change":"+12%","trend":"up"},{"label":"流失率","value":"2.3%","change":"-0.5%","trend":"down"}]}
</card>

<card type="table" title="对比">
{"columns":[{"key":"lang","label":"语言"},{"key":"perf","label":"性能"}],
 "rows":[{"lang":"Rust","perf":"极佳"},{"lang":"Go","perf":"非常好"}]}
</card>

<card type="progress" title="Q3 目标">
{"items":[{"label":"营收","value":72},{"label":"注册量","value":55}]}
</card>
```

支持类型：`bar_chart` · `line_chart` · `area_chart` · `pie_chart` · `table` · `metric` · `progress`

## 动画语法

启用动画生成后，AI 可在响应中内嵌 HTML 动画来可视化解释复杂内容：

```xml
<animation title="二分查找算法">
<!DOCTYPE html>
<html>
  <!-- 自动播放、无限循环的 HTML/CSS/JS 动画 -->
</html>
</animation>
```

动画在沙盒化的 iframe 中渲染，安全隔离，自动播放，无需用户交互。

## 技能系统

技能是 Markdown 文件，用于向对话注入系统级指令集。在 设置 → 技能 中导入 `SKILL.md` 文件，然后通过 `/技能名 [参数]` 调用。

内置技能：`summarize`（摘要）· `translate`（翻译）· `explain`（解释）· `improve`（改进）· `review`（审查）· `commit`（提交信息）

## 技术栈

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [SAP UI5 Web Components](https://sap.github.io/ui5-webcomponents-react/)
- [Recharts](https://recharts.org/) — 数据可视化
- [Zustand](https://zustand-demo.pmnd.rs/) — 状态管理
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR 文字识别
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) · [mammoth](https://github.com/mwilliamson/mammoth.js) · [xlsx](https://sheetjs.com/) · [jszip](https://stuk.github.io/jszip/) — 文件解析
