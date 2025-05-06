# 金融新闻分析工具

这是一个自动化工具，用于抓取金融新闻，使用 AI 进行分析，并将结果存储到 Notion 数据库中。项目分为两部分：

1. Node.js API 服务（部署在 Vercel）
2. 爬虫和分析逻辑（运行在 GitHub Actions）

## 功能特点

- 支持多个股票符号和新闻源的配置
- 自动抓取指定新闻源的相关新闻
- 使用 AI 对新闻内容进行分析和总结
- 将分析结果存储到 Notion 数据库
- 通过 GitHub Actions 自动化运行
- 提供 API 接口触发分析和管理配置

## 项目结构

```
financial-news/
├── .github/workflows/    # GitHub Actions工作流配置
├── src/
│   ├── controllers/      # 控制器
│   ├── routes/           # API路由
│   ├── services/         # 服务（爬虫、AI、Notion）
│   ├── scripts/          # GitHub Actions运行脚本
│   └── index.js          # API入口文件
├── config.json           # 股票和新闻源配置
├── package.json          # Node.js依赖
└── vercel.json           # Vercel部署配置
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

1. 克隆仓库
2. 安装依赖：
   ```
   npm install
   ```
3. 创建`.env`文件并设置环境变量（参考`.env.example`）
4. 启动开发服务器：
   ```
   npm run dev
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
