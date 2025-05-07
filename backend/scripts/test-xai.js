/**
 * 测试xAI服务
 * 
 * 此脚本专门用于测试xAI服务的功能
 */

require('dotenv').config();
const { analyzeNewsWithXai } = require('../src/services/xaiService');

// 示例新闻
const sampleNews = {
  title: 'Apple Announces New iPhone 15 with Revolutionary Features',
  content: `
    Apple today announced the iPhone 15, featuring a groundbreaking new design and revolutionary AI capabilities.
    The new device includes a faster A17 chip, improved camera system with 48MP main sensor, and longer battery life.
    CEO Tim Cook called it "the most advanced iPhone we've ever created" during the company's annual fall event.
    Analysts expect strong sales for the holiday season, potentially boosting Apple's market share in premium smartphones.
    The iPhone 15 will be available starting next week with a base price of $799.
  `
};

// 股票信息
const stock = {
  symbol: 'AAPL',
  name: 'Apple Inc.'
};

/**
 * 主函数
 */
async function main() {
  console.log('=== 测试xAI服务 ===');
  
  try {
    // 检查环境变量
    if (!process.env.XAI_API_KEY) {
      console.error('错误: 未设置XAI_API_KEY环境变量');
      process.exit(1);
    }
    
    console.log(`使用API密钥: ${process.env.XAI_API_KEY.substring(0, 10)}...`);
    console.log('分析示例新闻...');
    
    // 调用xAI服务
    const result = await analyzeNewsWithXai(sampleNews.content, stock);
    
    console.log('\n分析结果:');
    console.log('- 摘要:', result.summary);
    console.log('- 情感:', result.sentiment);
    
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
