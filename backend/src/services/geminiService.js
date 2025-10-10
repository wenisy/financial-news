/**
 * Google Gemini服务
 *
 * 使用@google/genai库调用Google Gemini的API
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const aiConfig = require("../config/aiConfig");
const ApiKeyManager = require("../utils/apiKeyManager");
const {
  preparePrompt,
  prepareStockInfoPrompt,
  extractSummary,
  extractSentiment,
  processJsonResponse,
} = require("../utils/aiUtils");

// 初始化API密钥管理器
let apiKeyManager = null;
function initializeApiKeyManager() {
  if (aiConfig.provider === aiConfig.AI_PROVIDERS.GEMINI) {
    // 使用 GEMINI_API_KEYS
    const keys = aiConfig.apiKeys;
    apiKeyManager = new ApiKeyManager(keys);
    console.log(`Gemini API密钥管理器初始化完成，共 ${keys.length} 个密钥`);
  }
}

// 初始化
initializeApiKeyManager();

/**
 * 获取Google Gemini客户端
 * @returns {GoogleGenAI} Gemini客户端实例
 */
function getGeminiClient() {
  if (!apiKeyManager) {
    throw new Error("API密钥管理器未初始化");
  }

  const currentKey = apiKeyManager.getCurrentKey();
  if (!currentKey) {
    throw new Error("没有可用的GEMINI_API_KEYS");
  }

  return new GoogleGenerativeAI(currentKey);
}

/**
 * 使用Google Gemini分析新闻内容
 * @param {string} newsContent 新闻内容
 * @param {Object} stock 股票信息
 * @param {string} promptTemplate 提示模板
 * @returns {Promise<Object>} 分析结果，包含摘要和情感分析
 */
async function analyzeNewsWithGemini(newsContent, stock, promptTemplate) {
  try {
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
    console.log(`准备调用Google Gemini API:`);
    console.log(`- 模型: ${aiConfig.model}`);
    console.log(
      `- 当前API密钥前缀: ${
        currentKey ? currentKey.substring(0, 10) + "..." : "未设置"
      }`
    );

    // 获取Gemini客户端和模型
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: aiConfig.model });

    // 构建提示
    const systemPrompt = aiConfig.systemPrompt;
    const userPrompt = prompt;
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // 调用Gemini API
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // 提取摘要和情感
    const summary = extractSummary(text);
    const sentiment = extractSentiment(text);

    return {
      summary,
      sentiment,
    };
  } catch (error) {
    console.error("Google Gemini分析新闻失败:", error);

    // 检查是否是配额或服务错误，如果是则尝试下一个密钥
    if (apiKeyManager && error.message && (
      error.message.includes('quota') ||
      error.message.includes('Too Many Requests') ||
      error.message.includes('429') ||
      error.message.includes('rate limit') ||
      error.message.includes('503') ||
      error.message.includes('overloaded') ||
      error.message.includes('Service Unavailable')
    )) {
      console.log("检测到配额错误，标记当前密钥为失败并尝试下一个");
      apiKeyManager.markCurrentKeyAsFailed(error);

      // 尝试使用下一个密钥重试一次
      const nextKey = apiKeyManager.getCurrentKey();
      if (nextKey) {
        console.log("使用下一个API密钥重试...");
        try {
          const retryAi = new GoogleGenerativeAI(nextKey);
          const retryModel = retryAi.getGenerativeModel({ model: aiConfig.model });
          const retryResult = await retryModel.generateContent(fullPrompt);
          const retryResponse = retryResult.response;
          const retryText = retryResponse.text();

          const retrySummary = extractSummary(retryText);
          const retrySentiment = extractSentiment(retryText);

          return {
            summary: retrySummary,
            sentiment: retrySentiment,
          };
        } catch (retryError) {
          console.error("重试也失败:", retryError);
          // 如果重试也是配额或服务错误，标记这个密钥也失败
          if (retryError.message && (
            retryError.message.includes('quota') ||
            retryError.message.includes('Too Many Requests') ||
            retryError.message.includes('429') ||
            retryError.message.includes('rate limit') ||
            retryError.message.includes('503') ||
            retryError.message.includes('overloaded') ||
            retryError.message.includes('Service Unavailable')
          )) {
            apiKeyManager.markCurrentKeyAsFailed(retryError);
          }
        }
      }
    }

    // 检查是否是认证错误
    if (error.message && error.message.includes("API_KEY")) {
      console.error("认证失败: 请检查GEMINI_API_KEYS环境变量是否正确设置");
    }

    // 抛出错误而不是返回默认值，让上层处理
    throw error;
  }
}

/**
 * 使用Google Gemini从文章内容中提取股票代码和公司名称
 * @param {string} content 文章内容
 * @param {string} title 文章标题
 * @returns {Promise<Object>} 提取的股票信息，包含symbol和company
 */
async function extractStockInfoWithGemini(content, title) {
  try {
    // 如果文章内容为空，返回默认结果
    if (!content || content.trim() === "") {
      return {
        symbol: "Market",
        company: "Market",
      };
    }

    // 准备提示
    const prompt = prepareStockInfoPrompt(title, content);

    // 获取Gemini客户端和模型
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: aiConfig.model });

    // 构建提示
    const systemPrompt = aiConfig.stockInfoSystemPrompt;
    const userPrompt = prompt;
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // 调用Gemini API
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    console.log("AI响应:", text);
    return processJsonResponse(text);
  } catch (error) {
    console.error("Google Gemini提取股票信息失败:", error);

    // 检查是否是配额或服务错误，如果是则尝试下一个密钥
    if (apiKeyManager && error.message && (
      error.message.includes('quota') ||
      error.message.includes('Too Many Requests') ||
      error.message.includes('429') ||
      error.message.includes('rate limit') ||
      error.message.includes('503') ||
      error.message.includes('overloaded') ||
      error.message.includes('Service Unavailable')
    )) {
      console.log("检测到配额错误，标记当前密钥为失败并尝试下一个");
      apiKeyManager.markCurrentKeyAsFailed(error);

      // 尝试使用下一个密钥重试一次
      const nextKey = apiKeyManager.getCurrentKey();
      if (nextKey) {
        console.log("使用下一个API密钥重试股票信息提取...");
        try {
          const retryAi = new GoogleGenerativeAI(nextKey);
          const retryModel = retryAi.getGenerativeModel({ model: aiConfig.model });
          const retryResult = await retryModel.generateContent(fullPrompt);
          const retryResponse = retryResult.response;
          const retryText = retryResponse.text();

          console.log("重试AI响应:", retryText);
          return processJsonResponse(retryText);
        } catch (retryError) {
          console.error("重试提取股票信息也失败:", retryError);
          // 如果重试也是配额或服务错误，标记这个密钥也失败
          if (retryError.message && (
            retryError.message.includes('quota') ||
            retryError.message.includes('Too Many Requests') ||
            retryError.message.includes('429') ||
            retryError.message.includes('rate limit') ||
            retryError.message.includes('503') ||
            retryError.message.includes('overloaded') ||
            retryError.message.includes('Service Unavailable')
          )) {
            apiKeyManager.markCurrentKeyAsFailed(retryError);
          }
        }
      }

      // 如果所有密钥都失败了，抛出错误
      throw error;
    }

    // 其他错误返回默认值
    return {
      symbol: "Market",
      company: "Market",
    };
  }
}

module.exports = {
  analyzeNewsWithGemini,
  extractStockInfoWithGemini,
};