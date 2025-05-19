# 金融新闻分析工具

一个用于分析金融新闻的工具，使用 AI 提取关键信息并存储到 Notion 数据库。项目采用前后端分离架构：

1. React 前端应用（部署在 Vercel）
2. Node.js 后端 API（部署在 Vercel）
3. 爬虫和分析逻辑（运行在 GitHub Actions 或通过网页界面）

## 功能特点

- 用户认证和授权（JWT 认证，支持长时间登录状态保持）
- 从新闻链接中提取文章内容（支持多种网站，优化了 Yahoo Finance 爬取）
- 使用 AI 分析文章内容，自动提取股票代码和公司名称
- 生成文章摘要和情感分析（支持好/中立/坏/未知四种情感分类）
- 将分析结果存储到 Notion 数据库（包含生成方式标记：GA 或人工）
- 支持批量处理多个新闻链接（通过逗号分隔输入）
- 表格形式展示批量处理结果（包含编号、原文链接和处理状态）
- 实时显示处理结果（无需等待全部处理完成）
- 通过 GitHub Actions 每 2 小时自动抓取 Yahoo Finance 新闻
- 支持查看 Notion 数据库中的历史分析结果

## 项目结构

```
financial-news/
├── .github/workflows/    # GitHub Actions工作流配置
├── frontend/             # React前端应用
│   ├── public/           # 静态资源
│   ├── src/              # 源代码
│   │   ├── components/   # React组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API服务
│   │   ├── styles/       # CSS样式
│   │   ├── utils/        # 工具函数
│   │   └── App.js        # 应用入口
│   ├── package.json      # 前端依赖
│   └── vercel.json       # 前端Vercel配置
├── backend/              # Node.js后端API
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── routes/       # API路由
│   │   ├── services/     # 服务（爬虫、AI、Notion）
│   │   ├── scripts/      # GitHub Actions运行脚本
│   │   └── index.js      # API入口文件
│   ├── package.json      # 后端依赖
│   └── vercel.json       # 后端Vercel配置
└── package.json          # 根目录依赖和脚本
```

## 配置说明

在`config.json`文件中配置股票符号和对应的新闻源：

```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "news_sources": [
        "https://finance.yahoo.com/quote/AAPL",
        "https://www.cnbc.com/quotes/AAPL"
      ]
    }
  ]
}
```

## 环境变量

项目需要以下环境变量（可参考 `backend/.env.example`）：

### 必需的环境变量

- `AI_PROVIDER`: AI 提供商，可选值为 `openai` 或 `xai`（推荐使用 `xai`）
- `NOTION_SECRET`: Notion API 密钥
- `NOTION_DATABASE_ID`: Notion 数据库 ID
- `JWT_SECRET`: JWT 认证密钥，用于生成和验证用户令牌

### 根据 AI 提供商选择

当 `AI_PROVIDER=openai` 时：

- `OPENAI_API_KEY`: OpenAI API 密钥

当 `AI_PROVIDER=xai` 时：

- `XAI_API_KEY`: xAI API 密钥
- `XAI_BASE_URL`: xAI API 基础 URL（可选，默认为 `https://api.xai.com/v1`）

### 可选环境变量

- `PORT`: 服务器端口（默认为 3000）
- `NOTION_PARENT_PAGE_ID`: 用于创建新数据库的父页面 ID
- `NOTION_USERS_DB_ID`: 用户数据库 ID（用于认证）

## 部署说明

### Vercel 部署

1. Fork 本仓库
2. 在 Vercel 上导入项目
3. 配置环境变量（参考上面的环境变量部分）
4. 部署设置：
   - 构建命令：`npm run vercel-build`
   - 输出目录：`backend`
   - 安装命令：`npm run install:all`
5. 部署完成后，可以绑定自定义域名

### GitHub Actions 配置

项目包含两个主要的 GitHub Actions 工作流：

1. **自动抓取新闻**（`fetch_yahoo_news.yml`）：

   - 每 2 小时自动运行一次，抓取 Yahoo Finance 新闻
   - 可以手动触发
   - 需要在仓库的 Secrets 中设置以下变量：
     - `NOTION_SECRET`
     - `NOTION_DATABASE_ID`
     - `AI_PROVIDER`
     - `XAI_API_KEY`（当使用 xAI 时）
     - `OPENAI_API_KEY`（当使用 OpenAI 时）

2. **前端构建**（`build_frontend.yml`）：
   - 当 frontend 目录有变更时自动运行
   - 构建前端并更新后端的 public 目录
   - 自动提交更改

## API 端点

### 认证相关

- `POST /api/auth/login`: 用户登录
- `GET /api/auth/check`: 检查认证状态
- `POST /api/auth/logout`: 用户登出

### 文章分析

- `POST /api/articles/extract`: 从文章中提取信息（标题、股票代码、公司名称）
- `POST /api/articles/analyze`: 分析文章内容并存储到 Notion
- `POST /api/articles/content`: 获取文章内容

### 配置管理

- `GET /api/config`: 获取当前配置
- `PUT /api/config`: 更新配置
- `POST /api/config/stocks`: 添加股票
- `DELETE /api/config/stocks/:symbol`: 删除股票

### 其他

- `POST /api/analyze`: 触发新闻分析（异步）
- `GET /health`: 健康检查
- `GET /api`: API 信息

## 本地开发

### 安装依赖

```bash
# 安装所有依赖（根目录、前端和后端）
npm run install:all
```

### 运行开发服务器

```bash
# 同时运行前端和后端
npm run dev

# 或者分别运行
npm run start:frontend
npm run start:backend
```

### 构建项目

```bash
# 构建前端
npm run build:frontend

# 构建后端
npm run build:backend
```

## AI 配置

项目支持使用不同的 AI 提供商进行新闻分析。配置文件位于 `backend/src/config/aiConfig.js`，您可以根据需要修改：

- 切换 AI 提供商（OpenAI 或 xAI）
- 配置模型名称（如 `gpt-4o` 或 `gpt-4-turbo`）
- 调整温度和最大令牌数
- 自定义提示模板（包括系统提示和用户提示）

### 提示模板

项目使用了两种主要的提示模板：

1. **股票信息提取模板**：从文章内容中提取股票代码和公司名称
2. **新闻分析模板**：生成文章摘要和情感分析

提示模板支持 JSON 输出格式，确保 AI 返回结构化数据。

## Notion 数据库结构

分析结果将存储在 Notion 数据库中，包含以下字段：

- **Symbol**（标题）: 股票符号
- **Company**（富文本）: 公司名称
- **文章链接**（URL）: 原始新闻链接
- **文章日期**（日期）: 新闻发布日期（从文章内容提取，如无则使用爬取时间）
- **生成日期**（日期时间）: 分析生成日期（处理时的当前时间）
- **情感分析**（选择）: 对股票的影响评估（好/中立/坏/未知 + emoji）
- **摘要**（富文本）: AI 生成的新闻摘要
- **生成方式**（选择）: 标记生成方式（GA 或 人工）

### 数据库创建

项目提供了自动创建 Notion 数据库的脚本 `backend/scripts/create_notion_database.js`，使用方法：

```bash
node backend/scripts/create_notion_database.js "your_notion_api_key" "your_parent_page_id"
```

## 爬虫功能

项目使用多种方法获取文章内容：

1. **curl 方法**：使用 curl 命令下载网页内容，适用于大多数网站
2. **Axios 方法**：使用 Axios 库直接请求网页内容
3. **Yahoo Finance API 方法**：针对 Yahoo Finance 文章的特殊处理

爬虫会自动选择最适合的方法，并在一种方法失败时尝试其他方法。

## 安全性说明

- 所有 API 端点都受到 JWT 认证保护
- 用户密码使用加密存储
- JWT 令牌通过 HttpOnly Cookie 传输，提高安全性
- 登录状态保持时间为 7 天
