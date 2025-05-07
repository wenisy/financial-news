/**
 * xAI服务
 *
 * 使用@ai-sdk/xai库调用xAI的API
 */

const { xai } = require('@ai-sdk/xai');
const { generateText } = require('ai');
const aiConfig = require('../config/aiConfig');

/**
 * 使用xAI分析新闻内容
 * @param {string} newsContent 新闻内容
 * @param {Object} stock 股票信息
 * @param {string} promptTemplate 提示模板
 * @returns {Promise<Object>} 分析结果，包含摘要和情感分析
 */
async function analyzeNewsWithXai(newsContent, stock, promptTemplate) {
  try {
    // 如果新闻内容为空，返回默认结果
    if (!newsContent || newsContent.trim() === '') {
      return {
        summary: '无法获取新闻内容',
        sentiment: '中立'
      };
    }

    // 使用配置中的提示模板或传入的模板
    const template = promptTemplate || aiConfig.newsAnalysisPrompt;

    // 准备提示
    const prompt = template
      .replace('{stock_name}', stock.name)
      .replace('{stock_symbol}', stock.symbol)
      .replace('{news_content}', newsContent);

    // 打印调试信息
    console.log(`准备调用xAI API:`);
    console.log(`- 模型: ${aiConfig.model}`);
    console.log(`- API密钥前缀: ${aiConfig.apiKey ? aiConfig.apiKey.substring(0, 10) + '...' : '未设置'}`);

    // 创建xAI模型实例
    const model = xai(aiConfig.model);

    // 使用系统提示和用户提示
    const messages = [
      { role: 'system', content: aiConfig.systemPrompt },
      { role: 'user', content: prompt }
    ];

    // 调用xAI API
    const { text } = await generateText({
      model,
      messages,
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens
    });

    // 提取摘要和情感
    const summary = extractSummary(text);
    const sentiment = extractSentiment(text);

    return {
      summary,
      sentiment
    };
  } catch (error) {
    console.error('xAI分析新闻失败:', error);

    // 检查是否是认证错误
    if (error.message && error.message.includes('authentication')) {
      console.error('认证失败: 请检查XAI_API_KEY环境变量是否正确设置');
    }

    return {
      summary: '分析过程中出错',
      sentiment: '中立'
    };
  }
}

/**
 * 从AI响应中提取摘要
 * @param {string} content AI响应内容
 * @returns {string} 提取的摘要
 */
function extractSummary(content) {
  // 尝试匹配"摘要："后面的内容
  const summaryMatch = content.match(/摘要：([\s\S]+?)(?=\n影响：|$)/);
  if (summaryMatch && summaryMatch[1]) {
    return summaryMatch[1].trim();
  }

  // 如果没有找到特定格式，返回整个内容
  return content.trim();
}

/**
 * 从AI响应中提取情感分析
 * @param {string} content AI响应内容
 * @returns {string} 情感分析结果（好/中立/坏）
 */
function extractSentiment(content) {
  // 尝试匹配"影响："后面的内容
  const sentimentMatch = content.match(/影响：(好|中立|坏)/);
  if (sentimentMatch && sentimentMatch[1]) {
    return sentimentMatch[1].trim();
  }

  // 如果没有找到特定格式，尝试根据关键词判断
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('正面') || lowerContent.includes('积极') || lowerContent.includes('利好')) {
    return '好';
  } else if (lowerContent.includes('负面') || lowerContent.includes('消极') || lowerContent.includes('利空')) {
    return '坏';
  }

  // 默认返回中立
  return '中立';
}

/**
 * 使用xAI从文章内容中提取股票代码和公司名称
 * @param {string} content 文章内容
 * @param {string} title 文章标题
 * @returns {Promise<Object>} 提取的股票信息，包含symbol和company
 */
async function extractStockInfoWithXai(content, title) {
  try {
    // 如果文章内容为空，返回默认结果
    if (!content || content.trim() === '') {
      return {
        symbol: 'Market',
        company: 'Market'
      };
    }

    // 准备提示
    const prompt = `
请从以下文章中提取股票代码和公司名称。
如果文章中没有明确提到股票代码或公司名称，请尽量根据上下文推断。
如果实在无法确定，请返回空字符串。

文章标题：${title}

文章内容：
${content.substring(0, 3000)}...

请以JSON格式返回结果，格式如下：
{
  "symbol": "股票代码，例如AAPL",
  "company": "公司名称，例如Apple Inc."
}
注意：股票代码有可能以NYSE:、NASDAQ:等格式出现，请只提取冒号后面的代码部分。比如NYSE:SMRT, 股票代码就是SMRT
`;

    // 创建xAI模型实例
    const model = xai(aiConfig.model);

    // 使用系统提示和用户提示
    const messages = [
      { role: 'system', content: '你是一个专业的金融分析助手，擅长从文章中提取股票相关信息。比如股票的Symbol, 公司的名称' },
      { role: 'user', content: prompt }
    ];

    // 调用xAI API
    const { text } = await generateText({
      model,
      messages,
      temperature: 0.3,
      maxTokens: 500
    });

    try {
      // 尝试解析JSON
      console.log('AI响应:', text);
      const result = JSON.parse(text);
      console.log('解析后的结果:', result);
      return {
        symbol: result.symbol || 'Market',
        company: result.company || 'Market'
      };
    } catch (parseError) {
      console.error('解析AI响应JSON失败:', parseError);

      // 尝试使用正则表达式提取
      const symbolMatch = text.match(/"symbol"\s*:\s*"([^"]+)"/);
      const companyMatch = text.match(/"company"\s*:\s*"([^"]+)"/);

      return {
        symbol: symbolMatch ? symbolMatch[1] : 'Market',
        company: companyMatch ? companyMatch[1] : 'Market'
      };
    }
  } catch (error) {
    console.error('xAI提取股票信息失败:', error);
    return {
      symbol: 'Market',
      company: 'Market'
    };
  }
}

module.exports = {
  analyzeNewsWithXai,
  extractStockInfoWithXai
};
