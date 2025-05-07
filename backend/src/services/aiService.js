const OpenAI = require('openai');
const aiConfig = require('../config/aiConfig');
const { analyzeNewsWithXai, extractStockInfoWithXai } = require('./xaiService');

// 初始化OpenAI客户端（仅在使用OpenAI时使用）
let client;
if (aiConfig.provider === aiConfig.AI_PROVIDERS.OPENAI) {
  client = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl
  });
}

/**
 * 使用AI分析新闻内容
 * @param {string} newsContent 新闻内容
 * @param {Object} stock 股票信息
 * @param {string} promptTemplate 提示模板
 * @returns {Promise<Object>} 分析结果，包含摘要和情感分析
 */
async function analyzeNews(newsContent, stock, promptTemplate) {
  try {
    console.log(`使用AI提供商: ${aiConfig.provider}`);

    // 根据提供商选择正确的实现
    if (aiConfig.provider === aiConfig.AI_PROVIDERS.XAI) {
      // 使用xAI服务
      return await analyzeNewsWithXai(newsContent, stock, promptTemplate);
    } else if (aiConfig.provider === aiConfig.AI_PROVIDERS.OPENAI) {
      // 使用OpenAI服务
      return await analyzeNewsWithOpenAI(newsContent, stock, promptTemplate);
    } else {
      throw new Error(`不支持的AI提供商: ${aiConfig.provider}`);
    }
  } catch (error) {
    console.error('AI分析新闻失败:', error);
    // 抛出错误，而不是返回默认结果
    // 这样调用方可以捕获错误并决定是否存入Notion
    throw new Error('分析过程中出错: ' + (error.message || '未知错误'));
  }
}

/**
 * 使用OpenAI分析新闻内容
 * @param {string} newsContent 新闻内容
 * @param {Object} stock 股票信息
 * @param {string} promptTemplate 提示模板
 * @returns {Promise<Object>} 分析结果，包含摘要和情感分析
 */
async function analyzeNewsWithOpenAI(newsContent, stock, promptTemplate) {
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
  console.log(`准备调用OpenAI API:`);
  console.log(`- 基础URL: ${aiConfig.baseUrl}`);
  console.log(`- 模型: ${aiConfig.model}`);
  console.log(`- API密钥前缀: ${aiConfig.apiKey ? aiConfig.apiKey.substring(0, 10) + '...' : '未设置'}`);

  try {
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
  } catch (apiError) {
    console.error(`调用OpenAI API失败:`, apiError);

    // 检查是否是认证错误
    if (apiError.status === 401) {
      console.error(`认证失败: 请检查OPENAI_API_KEY环境变量是否正确设置`);
    }

    // 检查是否是URL错误
    if (apiError.code === 'ENOTFOUND' || apiError.code === 'ECONNREFUSED') {
      console.error(`连接失败: 无法连接到 ${aiConfig.baseUrl}`);
    }

    throw apiError;
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
 * 从文章内容中提取股票代码和公司名称
 * @param {string} content 文章内容
 * @param {string} title 文章标题
 * @returns {Promise<Object>} 提取的股票信息，包含symbol和company
 */
async function extractStockInfo(content, title) {
  try {
    console.log(`使用AI提供商: ${aiConfig.provider}`);

    // 根据提供商选择正确的实现
    if (aiConfig.provider === aiConfig.AI_PROVIDERS.XAI) {
      // 使用xAI服务
      return await extractStockInfoWithXai(content, title);
    } else if (aiConfig.provider === aiConfig.AI_PROVIDERS.OPENAI) {
      // 使用OpenAI服务
      return await extractStockInfoWithOpenAI(content, title);
    } else {
      throw new Error(`不支持的AI提供商: ${aiConfig.provider}`);
    }
  } catch (error) {
    console.error('AI提取股票信息失败:', error);
    return {
      symbol: 'Market',
      company: 'Market'
    };
  }
}

/**
 * 使用OpenAI从文章内容中提取股票代码和公司名称
 * @param {string} content 文章内容
 * @param {string} title 文章标题
 * @returns {Promise<Object>} 提取的股票信息，包含symbol和company
 */
async function extractStockInfoWithOpenAI(content, title) {
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
`;

  try {
    const response = await client.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: '你是一个专业的金融分析助手，擅长从文章中提取股票相关信息。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    // 解析响应
    const content = response.choices[0].message.content;

    try {
      // 尝试解析JSON
      const result = JSON.parse(content);
      return {
        symbol: result.symbol || 'Market',
        company: result.company || 'Market'
      };
    } catch (parseError) {
      console.error('解析AI响应JSON失败:', parseError);

      // 尝试使用正则表达式提取
      const symbolMatch = content.match(/"symbol"\s*:\s*"([^"]+)"/);
      const companyMatch = content.match(/"company"\s*:\s*"([^"]+)"/);

      return {
        symbol: symbolMatch ? symbolMatch[1] : 'Market',
        company: companyMatch ? companyMatch[1] : 'Market'
      };
    }
  } catch (apiError) {
    console.error(`调用OpenAI API失败:`, apiError);
    throw apiError;
  }
}

// 不需要包装函数，直接使用从xaiService导入的函数

module.exports = {
  analyzeNews,
  extractStockInfo
};
