/**
 * 测试分析脚本
 * 
 * 此脚本使用示例数据测试AI分析和Notion集成功能
 * 不依赖爬虫功能，适合本地测试
 */

require('dotenv').config();
const { analyzeNews } = require('../src/services/aiService');
const { saveToNotion } = require('../src/services/notionService');

// 示例新闻数据
const sampleNews = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    title: 'Apple Announces New iPhone 15 with Revolutionary Features',
    url: 'https://example.com/apple-iphone-15',
    date: new Date(),
    content: `
      Apple today announced the iPhone 15, featuring a groundbreaking new design and revolutionary AI capabilities.
      The new device includes a faster A17 chip, improved camera system with 48MP main sensor, and longer battery life.
      CEO Tim Cook called it "the most advanced iPhone we've ever created" during the company's annual fall event.
      Analysts expect strong sales for the holiday season, potentially boosting Apple's market share in premium smartphones.
      The iPhone 15 will be available starting next week with a base price of $799.
    `
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    title: 'Tesla Delivers Record Number of Vehicles in Q3',
    url: 'https://example.com/tesla-q3-deliveries',
    date: new Date(),
    content: `
      Tesla reported record vehicle deliveries in the third quarter, exceeding analyst expectations.
      The electric vehicle maker delivered 466,000 vehicles globally, up 27% from the same period last year.
      Production also increased to 479,000 vehicles in the quarter.
      CEO Elon Musk attributed the growth to strong demand for the Model Y and improved production efficiency.
      The company remains on track to deliver 1.8 million vehicles for the full year, despite economic headwinds.
    `
  }
];

/**
 * 测试AI分析功能
 */
async function testAiAnalysis() {
  console.log('测试AI分析功能...');
  
  for (const news of sampleNews) {
    try {
      console.log(`分析文章: ${news.title}`);
      
      // 调用AI分析服务
      const analysis = await analyzeNews(news.content, {
        symbol: news.symbol,
        name: news.name
      });
      
      console.log('分析结果:');
      console.log('- 摘要:', analysis.summary);
      console.log('- 情感:', analysis.sentiment);
      console.log('-----------------------------------');
      
      // 保存到Notion
      await saveToNotion({
        symbol: news.symbol,
        name: news.name,
        url: news.url,
        publishDate: news.date,
        generatedDate: new Date(),
        sentiment: analysis.sentiment,
        summary: analysis.summary
      });
      
      console.log(`已保存到Notion: ${news.title}`);
    } catch (error) {
      console.error(`分析文章失败: ${news.title}`, error);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 金融新闻分析测试 ===');
  
  try {
    // 检查环境变量
    checkEnvironmentVariables();
    
    // 测试AI分析
    await testAiAnalysis();
    
    console.log('测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

/**
 * 检查必要的环境变量
 */
function checkEnvironmentVariables() {
  // 获取当前AI提供商
  const aiProvider = process.env.AI_PROVIDER || 'openai';
  console.log(`使用AI提供商: ${aiProvider}`);
  
  // 根据AI提供商确定必要的环境变量
  let requiredVars = [
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID'
  ];
  
  // 添加特定AI提供商的API密钥要求
  if (aiProvider.toLowerCase() === 'openai') {
    requiredVars.push('OPENAI_API_KEY');
  } else if (aiProvider.toLowerCase() === 'xai') {
    requiredVars.push('XAI_API_KEY');
  }
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
  }
}

// 执行主函数
main();
