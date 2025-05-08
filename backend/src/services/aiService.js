const OpenAI = require("openai");
const aiConfig = require("../config/aiConfig");
const { analyzeNewsWithXai, extractStockInfoWithXai } = require("./xaiService");
const {
  preparePrompt,
  prepareStockInfoPrompt,
  extractSummary,
  extractSentiment,
  processJsonResponse,
} = require("../utils/aiUtils");

// 初始化OpenAI客户端（仅在使用OpenAI时使用）
let client;
if (aiConfig.provider === aiConfig.AI_PROVIDERS.OPENAI) {
  client = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
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
    console.error("AI分析新闻失败:", error);
    // 抛出错误，而不是返回默认结果
    // 这样调用方可以捕获错误并决定是否存入Notion
    throw new Error("分析过程中出错: " + (error.message || "未知错误"));
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
  if (!newsContent || newsContent.trim() === "") {
    return {
      summary: "无法获取新闻内容",
      sentiment: "中立",
    };
  }

  // 使用配置中的提示模板或传入的模板
  const template = promptTemplate || aiConfig.newsAnalysisPrompt;

  // 准备提示
  const prompt = preparePrompt(template, stock, newsContent);

  // 打印调试信息
  console.log(`准备调用OpenAI API:`);
  console.log(`- 基础URL: ${aiConfig.baseUrl}`);
  console.log(`- 模型: ${aiConfig.model}`);
  console.log(
    `- API密钥前缀: ${
      aiConfig.apiKey ? aiConfig.apiKey.substring(0, 10) + "..." : "未设置"
    }`
  );

  try {
    const response = await client.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: "system", content: aiConfig.systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
    });

    // 解析响应
    const content = response.choices[0].message.content;

    // 提取摘要和情感
    const summary = extractSummary(content);
    const sentiment = extractSentiment(content);

    return {
      summary,
      sentiment,
    };
  } catch (apiError) {
    console.error(`调用OpenAI API失败:`, apiError);

    // 检查是否是认证错误
    if (apiError.status === 401) {
      console.error(`认证失败: 请检查OPENAI_API_KEY环境变量是否正确设置`);
    }

    // 检查是否是URL错误
    if (apiError.code === "ENOTFOUND" || apiError.code === "ECONNREFUSED") {
      console.error(`连接失败: 无法连接到 ${aiConfig.baseUrl}`);
    }

    throw apiError;
  }
}

// 这些函数已移至 utils/aiUtils.js

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
    console.error("AI提取股票信息失败:", error);
    return {
      symbol: "Market",
      company: "Market",
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
  if (!content || content.trim() === "") {
    return {
      symbol: "Market",
      company: "Market",
    };
  }

  // 准备提示
  const prompt = prepareStockInfoPrompt(title, content);

  try {
    const response = await client.chat.completions.create({
      model: aiConfig.model,
      messages: [
        {
          role: "system",
          content: aiConfig.stockInfoSystemPrompt,
        },
        { role: "user", content: prompt },
      ],
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
      response_format: { type: "json_object" },
    });

    // 解析响应
    const content = response.choices[0].message.content;

    return processJsonResponse(content);
  } catch (apiError) {
    console.error(`调用OpenAI API失败:`, apiError);
    throw apiError;
  }
}

// 不需要包装函数，直接使用从xaiService导入的函数

module.exports = {
  analyzeNews,
  extractStockInfo,
};
