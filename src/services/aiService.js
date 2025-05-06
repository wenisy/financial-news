const OpenAI = require('openai');
const aiConfig = require('../config/aiConfig');

// 初始化AI客户端
const client = new OpenAI({
  apiKey: aiConfig.apiKey,
  baseUrl: aiConfig.baseUrl
});

/**
 * 使用AI分析新闻内容
 * @param {string} newsContent 新闻内容
 * @param {Object} stock 股票信息
 * @param {string} promptTemplate 提示模板
 * @returns {Promise<Object>} 分析结果，包含摘要和情感分析
 */
async function analyzeNews(newsContent, stock, promptTemplate) {
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

    // 调用AI API
    const response = await client.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: aiConfig.systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens
    });

    // 解析响应
    const content = response.choices[0].message.content;

    // 提取摘要和情感
    const summary = extractSummary(content);
    const sentiment = extractSentiment(content);

    return {
      summary,
      sentiment
    };
  } catch (error) {
    console.error('AI分析新闻失败:', error);
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

module.exports = {
  analyzeNews
};
