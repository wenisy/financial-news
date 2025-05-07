# 金融新闻分析工具

一个用于分析金融新闻的工具，使用 AI 提取关键信息并存储到 Notion 数据库。项目采用前后端分离架构：

1. React 前端应用（部署在 Vercel）
2. Node.js 后端 API（部署在 Vercel）
3. 爬虫和分析逻辑（运行在 GitHub Actions）

## 功能特点

- 用户认证和授权
- 从新闻链接中提取文章内容
- 使用 AI 分析文章内容，提取股票代码和公司名称
- 生成文章摘要和情感分析
- 将分析结果存储到 Notion 数据库
- 支持批量处理多个新闻链接
- 表格形式展示批量处理结果
- 通过 GitHub Actions 自动抓取 Yahoo Finance 新闻

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

项目需要以下环境变量：

- `AI_PROVIDER`: AI 提供商，可选值为 `openai` 或 `xai`
- `OPENAI_API_KEY`: OpenAI API 密钥（当使用 OpenAI 时）
- `XAI_API_KEY`: xAI API 密钥（当使用 xAI 时）
- `NOTION_API_KEY`: Notion API 密钥
- `NOTION_DATABASE_ID`: Notion 数据库 ID

## 部署说明

### API 服务（Vercel）

1. Fork 本仓库
2. 在 Vercel 上导入项目
3. 配置环境变量
4. 部署

### GitHub Actions

GitHub Actions 工作流配置已包含在项目中，需要在仓库的 Secrets 中设置以下变量：

- `AI_PROVIDER`（可选，默认为 `openai`）
- `OPENAI_API_KEY`（使用 OpenAI 时）
- `XAI_API_KEY`（使用 xAI 时）
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`

## API 端点

- `GET /api/config`: 获取当前配置
- `PUT /api/config`: 更新配置
- `POST /api/config/stocks`: 添加股票
- `DELETE /api/config/stocks/:symbol`: 删除股票
- `POST /api/analyze`: 触发新闻分析（异步）
- `GET /health`: 健康检查

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

项目支持使用不同的 AI 提供商进行新闻分析。配置文件位于`src/config/aiConfig.js`，您可以根据需要修改：

- 切换 AI 提供商（OpenAI 或 xAI）
- 配置模型名称
- 调整温度和最大令牌数
- 自定义提示模板

示例文件`examples/xai_example.js`展示了如何使用 xAI API 进行新闻分析。

## Notion 数据库结构

分析结果将存储在 Notion 数据库中，包含以下字段：

- Symbol: 股票符号
- 文章链接: 原始新闻链接
- 文章日期: 新闻发布日期
- 生成日期: 分析生成日期
- 情感分析: 对股票的影响评估（好/中立/坏 + emoji）
- 摘要: AI 生成的新闻摘要
