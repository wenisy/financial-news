/**
 * xAI服务
 *
 * 使用@ai-sdk/xai库调用xAI的API
 */

const { xai } = require("@ai-sdk/xai");
const { generateText } = require("ai");
const aiConfig = require("../config/aiConfig");
const {
  preparePrompt,
  prepareStockInfoPrompt,
  extractSummary,
  extractSentiment,
  processJsonResponse,
} = require("../utils/aiUtils");

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
    console.log(`准备调用xAI API:`);
    console.log(`- 模型: ${aiConfig.model}`);
    console.log(
      `- API密钥前缀: ${
        aiConfig.apiKey ? aiConfig.apiKey.substring(0, 10) + "..." : "未设置"
      }`
    );

    // 创建xAI模型实例
    const model = xai(aiConfig.model);

    // 使用系统提示和用户提示
    const messages = [
      { role: "system", content: aiConfig.systemPrompt },
      { role: "user", content: prompt },
    ];

    // 调用xAI API
    const { text } = await generateText({
      model,
      messages,
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
    });

    // 提取摘要和情感
    const summary = extractSummary(text);
    const sentiment = extractSentiment(text);

    return {
      summary,
      sentiment,
    };
  } catch (error) {
    console.error("xAI分析新闻失败:", error);

    // 检查是否是认证错误
    if (error.message && error.message.includes("authentication")) {
      console.error("认证失败: 请检查XAI_API_KEY环境变量是否正确设置");
    }

    return {
      summary: "分析过程中出错",
      sentiment: "中立",
    };
  }
}

// 这些函数已移至 utils/aiUtils.js

/**
 * 使用xAI从文章内容中提取股票代码和公司名称
 * @param {string} content 文章内容
 * @param {string} title 文章标题
 * @returns {Promise<Object>} 提取的股票信息，包含symbol和company
 */
async function extractStockInfoWithXai(content, title) {
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

    // 创建xAI模型实例
    const model = xai(aiConfig.model);

    // 使用系统提示和用户提示
    const messages = [
      {
        role: "system",
        content: aiConfig.stockInfoSystemPrompt,
      },
      { role: "user", content: prompt },
    ];

    // 调用xAI API
    const { text } = await generateText({
      model,
      messages,
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
    });

    console.log("AI响应:", text);
    return processJsonResponse(text);
  } catch (error) {
    console.error("xAI提取股票信息失败:", error);
    return {
      symbol: "Market",
      company: "Market",
    };
  }
}

module.exports = {
  analyzeNewsWithXai,
  extractStockInfoWithXai,
};
