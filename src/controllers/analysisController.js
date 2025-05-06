const fs = require('fs').promises;
const path = require('path');
const { fetchNewsForStock } = require('../services/crawlerService');
const { analyzeNews } = require('../services/aiService');
const { saveToNotion } = require('../services/notionService');
const aiConfig = require('../config/aiConfig');

// 配置文件路径
const configPath = path.join(__dirname, '../../config.json');

/**
 * 运行完整的新闻分析流程
 */
async function runAnalysis() {
  try {
    console.log('开始新闻分析流程...');

    // 读取配置
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);

    // 处理每个股票
    for (const stock of config.stocks) {
      console.log(`处理股票: ${stock.symbol} (${stock.name})`);

      try {
        // 1. 抓取新闻
        const newsArticles = await fetchNewsForStock(stock);
        console.log(`为 ${stock.symbol} 找到 ${newsArticles.length} 篇新闻`);

        // 2. 分析每篇新闻
        for (const article of newsArticles) {
          try {
            // 使用AI分析新闻
            const analysis = await analyzeNews(article.content, stock);

            // 3. 保存到Notion
            await saveToNotion({
              symbol: stock.symbol,
              name: stock.name,
              url: article.url,
              publishDate: article.date,
              generatedDate: new Date(),
              sentiment: analysis.sentiment,
              summary: analysis.summary
            });

            console.log(`已分析并保存文章: ${article.title}`);
          } catch (articleError) {
            console.error(`处理文章时出错: ${article.title}`, articleError);
            // 继续处理下一篇文章
          }
        }
      } catch (stockError) {
        console.error(`处理股票时出错: ${stock.symbol}`, stockError);
        // 继续处理下一个股票
      }
    }

    console.log('新闻分析流程完成');
    return { success: true, message: '分析完成' };
  } catch (error) {
    console.error('运行分析流程时出错:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  runAnalysis
};
