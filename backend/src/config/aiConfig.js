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
  OPENAI: "openai",
  XAI: "xai",
  GEMINI: "gemini",
};

// 当前使用的AI提供商
const CURRENT_PROVIDER = process.env.AI_PROVIDER || AI_PROVIDERS.GEMINI; // 默认使用Gemini

// 各提供商的配置
const providerConfigs = {
  // OpenAI配置
  [AI_PROVIDERS.OPENAI]: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-3.5-turbo",
    temperature: 0.3,
    maxTokens: 5000,
  },

  // xAI配置
  [AI_PROVIDERS.XAI]: {
    apiKey: process.env.XAI_API_KEY,
    baseUrl: "https://api.x.ai/v1",
    model: "grok-3",
    temperature: 0.3,
    // providerOptions: {
    //   xai: {
    //     reasoningEffort: 'medium', // reasoningEffort 'low' | 'medium' | 'high'
    //   },
    // },
    maxTokens: 5000,
  },

  // Google Gemini配置
  [AI_PROVIDERS.GEMINI]: {
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-1.5-flash",
    temperature: 0.3,
    maxTokens: 5000,
  },
};

// 获取当前配置
if (!providerConfigs[CURRENT_PROVIDER]) {
  console.error(`错误: 未找到提供商 "${CURRENT_PROVIDER}" 的配置`);
  console.error("可用的提供商:", Object.keys(providerConfigs).join(", "));
  throw new Error(`未找到提供商 "${CURRENT_PROVIDER}" 的配置`);
}

const currentConfig = providerConfigs[CURRENT_PROVIDER];

// 日志输出当前使用的AI提供商
console.log(`使用AI提供商: ${CURRENT_PROVIDER}, 模型: ${currentConfig.model}`);

// 验证API密钥
if (!currentConfig.apiKey) {
  console.warn(
    `警告: 未设置 ${CURRENT_PROVIDER.toUpperCase()}_API_KEY 环境变量`
  );
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

  // 提供商选项, 调节xAI的reasoning effort, low | medium | high
  // providerOptions: currentConfig.providerOptions,

  // 温度参数（控制创造性）
  temperature: currentConfig.temperature,

  // 最大令牌数
  maxTokens: currentConfig.maxTokens,

  // 最大内容长度（字符数）用来分析标题, 公司名称, symbol
  maxContentLength: 3000,

  // 系统提示（用于设置AI角色）
  systemPrompt: "你是一位专业的金融分析师，擅长分析新闻对股票的潜在影响。",

  // 提取股票信息的系统提示
  stockInfoSystemPrompt:
    "你是一个专业的金融分析助手，擅长从文章中提取股票相关信息。比如股票的symbol, 公司的名称. 如果能够解析出多个symbol和company, 那么你只返回一个最相关的就可以了. 不用是数组的形式.",

  // 新闻分析提示模板
  newsAnalysisPrompt:
    "请分析以下新闻对{stock_name}({stock_symbol})股票的潜在影响是正面、中性还是负面。\n\n新闻内容：\n{news_content}\n\n分析时请考虑以下几个方面：\n\n1. 新闻的核心事件是什么？（例如：新产品发布、财务业绩、管理层变动、行业法规变化、收购合并、诉讼、宏观经济因素等）\n2. 该事件对公司的短期和长期财务表现可能产生什么直接或间接的影响？（例如：收入、利润、市场份额、成本、增长潜力等）\n3. 该事件在多大程度上符合或超出市场预期？\n4. 该事件是否反映了公司基本面的重大变化？\n5. 该事件在行业内的普遍性如何？是否会对竞争格局产生影响？\n6. 投资者和市场分析师可能会如何解读这则新闻？\n7. 是否存在任何可能减弱或放大该新闻影响的因素？（例如：公司之前的声誉、整体市场情绪、事件的确定性等）\n\n请按以下格式回答：\n摘要：[新闻摘要，不超过200字]\n影响：[好/中立/坏]",

  // 提取股票信息的提示模板
  stockInfoPrompt: `
请从以下文章中提取股票代码和公司名称。
如果文章中没有明确提到股票代码或公司名称，请尽量根据上下文推断。
如果实在无法确定，请返回空字符串。

文章标题：{article_title}

文章内容：
{article_content}

请以JSON格式返回结果，格式如下：
{
  "symbol": "股票代码，例如AAPL",
  "company": "公司名称，例如Apple Inc."
}
注意：股票代码有可能以NYSE:、NASDAQ:等格式出现，请只提取冒号后面的代码部分。比如NYSE:SMRT, 股票代码就是SMRT
`,
};
