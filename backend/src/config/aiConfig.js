/**
 * AI服务配置文件
 *
 * 此文件用于配置AI服务的相关参数，包括：
 * - 使用的AI提供商（OpenAI或xAI）
 * - API基础URL
 * - 模型名称
 * - 其他AI相关参数
 */

// AI提供商类型
const AI_PROVIDERS = {
  OPENAI: 'openai',
  XAI: 'xai'
};

// 当前使用的AI提供商
const CURRENT_PROVIDER = process.env.AI_PROVIDER || AI_PROVIDERS.XAI; // 默认使用xAI

// 各提供商的配置
const providerConfigs = {
  // OpenAI配置
  [AI_PROVIDERS.OPENAI]: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 5000
  },

  // xAI配置
  [AI_PROVIDERS.XAI]: {
    apiKey: process.env.XAI_API_KEY,
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-3-latest',
    temperature: 0.3,
    maxTokens: 500
  }
};

// 获取当前配置
if (!providerConfigs[CURRENT_PROVIDER]) {
  console.error(`错误: 未找到提供商 "${CURRENT_PROVIDER}" 的配置`);
  console.error('可用的提供商:', Object.keys(providerConfigs).join(', '));
  throw new Error(`未找到提供商 "${CURRENT_PROVIDER}" 的配置`);
}

const currentConfig = providerConfigs[CURRENT_PROVIDER];

// 日志输出当前使用的AI提供商
console.log(`使用AI提供商: ${CURRENT_PROVIDER}, 模型: ${currentConfig.model}`);

// 验证API密钥
if (!currentConfig.apiKey) {
  console.warn(`警告: 未设置 ${CURRENT_PROVIDER.toUpperCase()}_API_KEY 环境变量`);
}

// 导出配置
module.exports = {
  // 提供商类型常量
  AI_PROVIDERS,

  // 当前使用的提供商
  provider: CURRENT_PROVIDER,

  // API密钥
  apiKey: currentConfig.apiKey,

  // API基础URL
  baseUrl: currentConfig.baseUrl,

  // 模型名称
  model: currentConfig.model,

  // 温度参数（控制创造性）
  temperature: currentConfig.temperature,

  // 最大令牌数
  maxTokens: currentConfig.maxTokens,

  // 系统提示（用于设置AI角色）
  systemPrompt: '你是一位专业的金融分析师，擅长分析新闻对股票的潜在影响。',

  // 新闻分析提示模板
  newsAnalysisPrompt: '请分析以下关于{stock_name}({stock_symbol})的新闻，并提供简洁的摘要。同时，评估这个新闻对该公司股票的潜在影响是正面、中性还是负面。\n\n新闻内容：\n{news_content}\n\n请按以下格式回答：\n摘要：[新闻摘要，不超过200字]\n影响：[好/中立/坏]'
};
