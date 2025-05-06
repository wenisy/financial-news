# Notion数据库创建工具

这个工具用于自动创建金融新闻分析项目所需的Notion数据库。

## 前提条件

1. 已创建Notion集成并获取API密钥
   - 访问 [Notion开发者页面](https://www.notion.so/my-integrations)
   - 创建新的集成，获取API密钥

2. 已有一个Notion页面，并与您的集成共享
   - 在Notion中打开目标页面
   - 点击右上角的"共享"按钮
   - 在搜索框中输入您的集成名称并选择它
   - 确保给予"可以编辑"权限

3. 获取页面ID
   - 页面ID是URL中的32位字符串
   - 例如：`https://www.notion.so/我的页面-83c75a3b5d494a80a1bfb73c204319d8`
   - 页面ID为：`83c75a3b5d494a80a1bfb73c204319d8`

## 安装依赖

```bash
npm install @notionhq/client
```

## 使用方法

### 方法1：直接运行脚本并传入参数

```bash
node scripts/create_notion_database.js "your_notion_api_key" "your_parent_page_id"
```

### 方法2：设置环境变量后运行

```bash
export NOTION_API_KEY="your_notion_api_key"
export PARENT_PAGE_ID="your_parent_page_id"
node scripts/create_notion_database.js
```

## 脚本功能

1. 验证Notion API密钥和权限
2. 在指定页面下创建金融新闻分析数据库
3. 创建示例条目
4. 输出数据库ID和配置信息

## 数据库结构

创建的数据库包含以下字段：

- **Symbol**：股票符号（标题字段）
- **文章链接**：新闻文章的URL
- **文章日期**：新闻发布日期
- **生成日期**：分析生成日期
- **情感分析**：对股票的影响评估（好/中立/坏，带表情符号）
- **摘要**：AI生成的新闻摘要

## 注意事项

- 确保API密钥有足够的权限
- 确保父页面ID正确且已与集成共享
- 数据库创建后，需要将数据库ID添加到项目的环境变量中
