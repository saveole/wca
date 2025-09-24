# 产品需求文档 (PRD): WebClip Assistant (网页信息助手)
**版本: 1.0**
**日期: 2025年9月24日**
**撰写人: Gemini (Senior Product Designer)**

## 1.产品概述 (Overview)

### 1.1 产品愿景 (Vision)
WebClip Assistant 是一款浏览器插件，旨在帮助用户快速、智能地捕获、整理和导出任何网页的核心信息。它解决了传统书签信息量过少、笔记软件操作过重的问题，让用户能以最少的精力，将有价值的网页转化为结构化的、可二次利用的知识片段。

### 1.2 目标用户 (Target Audience)
- 研究人员/学生: 需要快速收集、汇总和引用大量网页资料。

- 内容创作者/写作者: 寻找灵感，收集素材，并希望方便地将素材整合进自己的工作流。

- 终身学习者: 浏览到优质文章或教程时，希望不仅仅是“收藏”，而是“吸收”核心内容。

- 技术开发者: 快速保存技术文档、Stack Overflow 问题或博客文章的关键信息。

### 1.3 核心问题 (Problem Statement)
用户在浏览网页时，经常遇到以下痛点：

1. 信息过载: 网页内容繁杂，难以快速抓住核心。
2. 收藏夹失效: 收藏夹里的链接越来越多，但回头看时已忘记当初为何收藏。
3. 记录中断: 从浏览器切换到笔记应用（如 Notion）的操作路径长，容易打断思路。
4. 格式不一: 手动复制粘贴的内容格式混乱，需要花费大量时间重新排版。

### 1.4 产品目标 (Goals)

- MVP (Minimum Viable Product) 目标:
  - 实现一键唤出插件界面。
  - 自动抓取网页基本信息（标题、URL、描述）。
  - 支持AI一键总结网页内容。
  - 允许用户手动编辑所有抓取到的信息，并添加笔记和标签。
  - 支持将信息导出为 Markdown 文件和 JSON 文件。
  - 支持通过 API 将信息保存到指定的 Notion Database。

- 长期目标 (V2.0+):
  - 支持更多导出目标（如 Evernote, Google Keep）。
  - 支持划词高亮并自动摘录。
  - 提供一个中心化的管理仪表盘查看所有剪藏记录。

## 2.功能需求 (Functional Requirements)

我将使用用户故事（User Story）的格式来描述功能，这更贴近“vibe coding”的开发思路。

**核心功能模块 1: 信息捕获与编辑 (Capture & Edit)**

- **用户故事 1.1 (一键唤出):**
  - As a 用户,
  - I want to 点击浏览器工具栏的插件图标,
  - So that 我可以快速打开一个简洁的悬浮窗口（Popup UI）来处理当前页面。

- **用户故事 1.2 (自动抓取):**
  - As a 用户,
  - I want 插件在我打开它时，能自动从当前页面的 HTML 中抓取 `标题 (Title)`, `网址 (URL)`, `描述 (Description)` 和 `主图 (OG:Image)`,
  - So that 我可以节省手动复制粘贴的时间。

- **用户故事 1.3 (AI 智能总结):**
  - As a 用户,
  - I want 在插件界面看到一个“AI 总结”按钮，点击后可以智能生成当前页面的核心内容摘要,
  - So that 我能快速理解文章主旨，并将其作为我的笔记内容。
  - 设计师建议: 摘要过程应有加载提示（loading state）。摘要结果应出现在一个可编辑的文本框内。此功能需要用户在设置中配置自己的 LLM API Key。

- **用户故事 1.4 (手动编辑与补充):**
  - As a 用户,
  - I want 插件界面上的所有字段（标题、摘要、URL等）都是可以编辑的,
  - So that 我可以根据自己的理解修改和优化信息。

- **用户故事 1.5 (添加个人笔记和标签):**
  - As a 用户,
  - I want 插件界面有一个专门的“我的笔记”文本框和一个“标签 (Tags)”输入框,
  - So that 我可以记录下自己的思考、待办事项，并为这条信息打上分类标签以便于未来查找。
  - 设计师建议: 标签输入支持逗号或回车分隔，并以胶囊（pill）样式展示。

**核心功能模块 2: 导出与保存 (Export & Save)**

- **用户故事 2.1 (导出为 Markdown):**

  - As a 用户,

  - I want to 点击“导出为 MD”按钮,

  - So that 插件可以生成一个 .md 文件并触发浏览器下载。

  - Markdown 模板建议:

    ```markdown
    # [{PAGE_TITLE}]({PAGE_URL})
    
    **Tags:** `#tag1` `#tag2`
    
    ---
    
    ## 🤖 AI 摘要
    > {AI_SUMMARY}
    
    ---
    
    ## ✍️ 我的笔记
    {MY_NOTES}
    ```

- **用户故事 2.2 (导出为 JSON):**

  - As a 用户,

  - I want to 点击“导出为 JSON”按钮,

  - So that 插件可以生成一个 .json 文件并触发浏览器下载，方便我进行二次开发或数据迁移。

  - JSON 结构建议:

    ```json
    {
      "title": "{PAGE_TITLE}",
      "url": "{PAGE_URL}",
      "description": "{PAGE_DESCRIPTION}",
      "cover_image": "{PAGE_OG_IMAGE_URL}",
      "summary": "{AI_SUMMARY}",
      "notes": "{MY_NOTES}",
      "tags": ["tag1", "tag2"],
      "clipped_at": "{TIMESTAMP}"
    }
    ```

- **用户故事 2.3 (保存到 Notion):**
  - As a 用户,
  - I want to 点击“保存到 Notion”按钮,
  - So that 插件可以将当前捕获的所有信息，按照我预设的规则，自动创建一条记录到我指定的 Notion Database 中。
  - 设计师建议:
    1. 首次配置: 需要一个设置页面，引导用户输入 Notion Integration Token 和 Database ID。
    2. 字段映射: 在设置中，让用户可以将插件内的字段（如标题, URL, 摘要, 标签, 笔记）映射到 Notion Database 的不同属性（Property）上。例如：
       - 插件.标题 -> Notion.Name (Title 类型)
       - 插件.URL -> Notion.URL (URL 类型)
       - 插件.标签 -> Notion.Tags (Multi-select 类型)
       - 插件.摘要 + 插件.我的笔记 -> Notion.Page Content
    3. 保存状态: 点击保存后，按钮应显示加载状态，成功后给予用户明确的成功提示（如“已保存到 Notion ✅”），失败则提示错误信息。

**核心功能模块 3: 设置 (Settings)**

- **用户故事 3.1 (API Key 管理):**
  - As a 用户,
  - I want 一个专门的设置页面,
  - So that 我可以安全地配置和存储我的 AI 服务 API Key 和 Notion Integration Token。
  - 安全提示: API Key 必须存储在浏览器的安全存储区 (`chrome.storage.sync` 或 `local`)，而不是硬编码。输入框应为密码类型。

- **用户故事 3.2 (Notion 配置):**
  - As a 用户,
  - I want 在设置页面配置 Notion Database ID 和字段映射规则,
  - So that 插件知道要把数据保存到哪里以及如何保存。

## 3.非功能性需求 (Non-Functional Requirements)
### 3.1 性能 (Performance):

- 插件弹出窗口的加载时间应小于 500ms。
- AI 总结为异步操作，不应阻塞用户对其他字段的编辑。

### 3.2 易用性 (Usability):

- UI 界面应简洁直观，无需阅读说明文档即可上手。
- 核心操作（捕获、编辑、保存）应在 3 次点击内完成。

### 3.3 安全性 (Security):

- 用户的 API Keys 和 Tokens 必须在本地加密存储，绝不上传到任何第三方服务器。
- 所有对外部 API 的请求都必须通过 HTTPS。

### 3.4 兼容性 (Compatibility):

- 首要支持 Chrome 浏览器，后续可考虑 Firefox 和 Edge。

## 4.技术栈建议 (Tech Stack Suggestions)
- 前端: HTML, CSS, JavaScript (原生或使用轻量级框架如 Vue.js / React.js 以便管理组件化UI)。

- 浏览器 API: chrome.tabs (获取页面信息), chrome.storage (存储设置), chrome.downloads (下载文件)。

- 打包工具: Vite / Webpack。

- 外部 API:
  - AI Summary: OpenAI API (GPT 系列), Google AI API (Gemini 系列), 或其他大语言模型 API。
  - Notion: Notion API。

----

## 总结与下一步
这份 PRD 为你的 "WebClip Assistant" 项目 V1.0 版本定义了清晰的范围和核心功能。在你开始 vibe coding 之前，建议：

- 设计 UI 草图: 简单画一下 Popup 窗口和设置页面的布局，这有助于你在写代码时对最终形态有具体概念。

- 搭建项目骨架: 先把 manifest.json 文件和基本的 HTML/CSS/JS 结构搭建起来，确保插件能被浏览器正确加载。

- 分步实现:
  - 第一步: 实现最基础的 HTML 信息自动抓取和展示。
  - 第二步: 完成手动编辑和导出到本地文件（MD/JSON）的功能。
  - 第三步: 对接 AI 总结 API。
  - 第四步: 攻克 Notion API 对接，这是最复杂的一步。
