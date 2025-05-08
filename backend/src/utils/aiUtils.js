/**
 * AI 工具函数
 *
 * 提供 AI 服务相关的共用工具函数
 */

const aiConfig = require("../config/aiConfig");

/**
 * 准备 AI 提示
 * @param {string} template 提示模板
 * @param {Object} stock 股票信息
 * @param {string} newsContent 新闻内容
 * @returns {string} 准备好的提示
 */
function preparePrompt(template, stock, newsContent) {
  return template
    .replace("{stock_name}", stock.name)
    .replace("{stock_symbol}", stock.symbol)
    .replace(
      "{news_content}",
      newsContent.length > aiConfig.maxContentLength
        ? newsContent.substring(0, aiConfig.maxContentLength) + "..."
        : newsContent
    );
}

/**
 * 准备股票信息提示
 * @param {string} title 文章标题
 * @param {string} content 文章内容
 * @returns {string} 准备好的提示
 */
function prepareStockInfoPrompt(title, content) {
  return aiConfig.stockInfoPrompt
    .replace("{article_title}", title)
    .replace(
      "{article_content}",
      content.length > aiConfig.maxContentLength
        ? content.substring(0, aiConfig.maxContentLength) + "..."
        : content
    );
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
  // 尝试匹配"影响："后面的内容，包括"好/中立/坏"和"正面/中性/负面"
  // 同时处理可能的Markdown标记（如**影响：负面**）
  const sentimentMatch = content.match(
    /[*]*影响：(好|中立|坏|正面|中性|负面)[*]*/
  );
  if (sentimentMatch && sentimentMatch[1]) {
    const sentiment = sentimentMatch[1].trim();
    // 将"正面"映射为"好"，"负面"映射为"坏"
    if (sentiment === "正面") return "好";
    if (sentiment === "负面") return "坏";
    if (sentiment === "中性") return "中立";
    return sentiment;
  }

  // 如果没有找到特定格式，返回"未知"
  return "未知";
}

/**
 * 处理 AI 响应中的 JSON 结果
 * @param {string} text AI 响应文本
 * @returns {Object} 处理后的结果
 */
function processJsonResponse(text) {
  try {
    // 尝试解析JSON
    const result = JSON.parse(text);
    return {
      symbol: result.symbol || "Market",
      company: result.company || "Market",
    };
  } catch (parseError) {
    console.error("解析AI响应JSON失败:", parseError);

    // 尝试使用正则表达式提取
    const symbolMatch = text.match(/"symbol"\s*:\s*"([^"]+)"/);
    const companyMatch = text.match(/"company"\s*:\s*"([^"]+)"/);

    return {
      symbol: symbolMatch ? symbolMatch[1] : "Market",
      company: companyMatch ? companyMatch[1] : "Market",
    };
  }
}

module.exports = {
  preparePrompt,
  prepareStockInfoPrompt,
  extractSummary,
  extractSentiment,
  processJsonResponse,
};
