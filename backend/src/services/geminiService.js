/**
 * Google Gemini服务
 *
 * 使用@google/genai库调用Google Gemini的API
 */

const { GoogleGenAI } = require("@google/genai");
const aiConfig = require("../config/aiConfig");
const {
  preparePrompt,
  prepareStockInfoPrompt,
  extractSummary,
  extractSentiment,
  processJsonResponse,
} = require("../utils/aiUtils");

/**
 * 获取Google Gemini客户端
 * @returns {GoogleGenAI} Gemini客户端实例
 */
function getGeminiClient() {
  if (!aiConfig.apiKey) {
    throw new Error("GEMINI_API_KEY 环境变量未设置");
  }
  return new GoogleGenAI(aiConfig.apiKey);
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
      `- API密钥前缀: ${
        aiConfig.apiKey ? aiConfig.apiKey.substring(0, 10) + "..." : "未设置"
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

    // 检查是否是认证错误
    if (error.message && error.message.includes("API_KEY")) {
      console.error("认证失败: 请检查GEMINI_API_KEY环境变量是否正确设置");
    }

    return {
      summary: "分析过程中出错",
      sentiment: "中立",
    };
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