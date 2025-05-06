/**
 * xAI API使用示例
 * 
 * 这个示例展示了如何使用xAI的API进行文本生成
 * 使用方法：
 * 1. 设置环境变量XAI_API_KEY
 * 2. 运行 node examples/xai_example.js
 */

const OpenAI = require('openai');

// 从环境变量获取API密钥
const apiKey = process.env.XAI_API_KEY;

if (!apiKey) {
  console.error('错误: 未设置XAI_API_KEY环境变量');
  process.exit(1);
}

// 初始化客户端
const client = new OpenAI({
  apiKey: apiKey,
  baseUrl: 'https://api.x.ai/v1'
});

// 示例函数：分析股票新闻
async function analyzeStockNews() {
  const stockName = 'Apple Inc.';
  const stockSymbol = 'AAPL';
  const newsContent = `
    Apple announced today that it has achieved a new milestone in renewable energy, 
    with all of its global facilities now powered by 100% clean energy. 
    This includes retail stores, offices, data centers and co-located facilities in 43 countries. 
    The company also announced that 9 more manufacturing partners have committed to power all of their 
    Apple production with 100% clean energy, bringing the total number of supplier commitments to 23.
  `;

  try {
    console.log('正在分析新闻...');
    
    // 调用xAI API
    const completion = await client.chat.completions.create({
      model: 'grok-3-latest',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的金融分析师，擅长分析新闻对股票的潜在影响。'
        },
        {
          role: 'user',
          content: `请分析以下关于${stockName}(${stockSymbol})的新闻，并提供简洁的摘要。同时，评估这个新闻对该公司股票的潜在影响是正面、中性还是负面。\n\n新闻内容：\n${newsContent}\n\n请按以下格式回答：\n摘要：[新闻摘要，不超过200字]\n影响：[好/中立/坏]`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    // 输出结果
    console.log('\n分析结果:');
    console.log(completion.choices[0].message.content);
    
  } catch (error) {
    console.error('调用xAI API时出错:', error);
  }
}

// 运行示例
analyzeStockNews();
