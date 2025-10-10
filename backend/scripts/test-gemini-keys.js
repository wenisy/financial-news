/**
 * Gemini API密钥测试脚本
 *
 * 测试多个Gemini API密钥的功能是否正常工作
 *
 * 使用方法:
 * node scripts/test-gemini-keys.js
 */

require('dotenv').config();
const aiConfig = require('../src/config/aiConfig');
const ApiKeyManager = require('../src/utils/apiKeyManager');
const { extractStockInfoWithGemini } = require('../src/services/geminiService');

/**
 * 检查必要的环境变量是否已设置
 * @returns {boolean} 是否所有必要的环境变量都已设置
 */
function checkEnvironmentVariables() {
  console.log('=== 环境变量检查 ===');

  const requiredVars = ['AI_PROVIDER'];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.error(`❌ 未设置 ${varName} 环境变量`);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName]}`);
    }
  }

  // 检查Gemini API密钥
  if (process.env.AI_PROVIDER === 'gemini') {
    if (!process.env.GEMINI_API_KEYS) {
      missingVars.push('GEMINI_API_KEYS');
      console.error('❌ 未设置 GEMINI_API_KEYS 环境变量');
    } else {
      const keys = process.env.GEMINI_API_KEYS.split(',').map(key => key.trim()).filter(key => key);
      console.log(`✅ GEMINI_API_KEYS: 配置了 ${keys.length} 个密钥`);
      keys.forEach((key, index) => {
        const prefix = key.substring(0, 10);
        console.log(`   密钥 ${index + 1}: ${prefix}...`);
      });
    }
  } else {
    console.log('⚠️  AI_PROVIDER 不是 gemini，跳过 GEMINI_API_KEYS 检查');
  }

  console.log('');
  return missingVars.length === 0;
}

/**
 * 测试API密钥配置读取
 */
function testApiKeyConfiguration() {
  console.log('=== API密钥配置测试 ===');

  if (aiConfig.provider !== aiConfig.AI_PROVIDERS.GEMINI) {
    console.log('⚠️  当前AI提供商不是Gemini，跳过测试');
    console.log('');
    return false;
  }

  const keys = aiConfig.apiKeys;
  if (!keys || keys.length === 0) {
    console.log('❌ 未配置任何Gemini API密钥');
    console.log('');
    return false;
  }

  console.log(`✅ 配置了 ${keys.length} 个API密钥`);
  keys.forEach((key, index) => {
    const prefix = key.substring(0, 10);
    console.log(`   密钥 ${index + 1}: ${prefix}...`);
  });

  console.log('');
  return true;
}

/**
 * 测试API密钥管理器状态
 */
function testApiKeyManagerStatus() {
  console.log('=== API密钥管理器状态测试 ===');

  if (aiConfig.provider !== aiConfig.AI_PROVIDERS.GEMINI) {
    console.log('⚠️  当前AI提供商不是Gemini，跳过测试');
    console.log('');
    return;
  }

  const keys = aiConfig.apiKeys;
  if (!keys || keys.length === 0) {
    console.log('❌ 未配置任何Gemini API密钥');
    console.log('');
    return;
  }

  // 创建API密钥管理器实例
  const apiKeyManager = new ApiKeyManager(keys);

  // 显示状态
  const status = apiKeyManager.getStatus();
  console.log('API密钥管理器状态:');
  console.log(`- 总密钥数: ${status.totalKeys}`);
  console.log(`- 当前索引: ${status.currentIndex}`);
  console.log(`- 失败密钥: [${status.failedKeys.join(', ')}]`);
  console.log(`- 可用密钥: ${status.availableKeys}`);
  console.log(`- 最后重置时间: ${status.lastResetTime}`);

  console.log('');
}

/**
 * 测试API密钥轮询机制
 */
function testApiKeyRotation() {
  console.log('=== API密钥轮询机制测试 ===');

  if (aiConfig.provider !== aiConfig.AI_PROVIDERS.GEMINI) {
    console.log('⚠️  当前AI提供商不是Gemini，跳过测试');
    console.log('');
    return;
  }

  const keys = aiConfig.apiKeys;
  if (!keys || keys.length === 0) {
    console.log('❌ 未配置任何Gemini API密钥');
    console.log('');
    return;
  }

  const apiKeyManager = new ApiKeyManager(keys);

  console.log('测试密钥轮询:');
  for (let i = 0; i < Math.min(keys.length + 2, 10); i++) {
    const key = apiKeyManager.getCurrentKey();
    const prefix = key ? key.substring(0, 10) + '...' : 'null';
    console.log(`   轮询 ${i + 1}: 索引 ${apiKeyManager.currentIndex}, 密钥: ${prefix}`);
    apiKeyManager.getNextKey();
  }

  console.log('');
}

/**
 * 模拟503错误场景测试
 */
function testErrorHandling() {
  console.log('=== 503错误处理测试 ===');

  if (aiConfig.provider !== aiConfig.AI_PROVIDERS.GEMINI) {
    console.log('⚠️  当前AI提供商不是Gemini，跳过测试');
    console.log('');
    return;
  }

  const keys = aiConfig.apiKeys;
  if (!keys || keys.length === 0) {
    console.log('❌ 未配置任何Gemini API密钥');
    console.log('');
    return;
  }

  const apiKeyManager = new ApiKeyManager(keys);

  console.log('模拟503错误处理:');

  // 模拟503错误
  const mockError = new Error('Service Unavailable');
  mockError.message = '503 Service Unavailable - The service is temporarily overloaded';

  console.log('标记当前密钥为失败...');
  apiKeyManager.markCurrentKeyAsFailed(mockError);

  const statusAfterFailure = apiKeyManager.getStatus();
  console.log(`失败后状态 - 失败密钥: [${statusAfterFailure.failedKeys.join(', ')}], 可用密钥: ${statusAfterFailure.availableKeys}`);

  // 获取下一个密钥
  const nextKey = apiKeyManager.getCurrentKey();
  const prefix = nextKey ? nextKey.substring(0, 10) + '...' : 'null';
  console.log(`切换到下一个密钥: ${prefix}`);

  console.log('');
}

/**
 * 测试实际API调用（提取股票信息）
 */
async function testApiCall() {
  console.log('=== 实际API调用测试 ===');

  if (aiConfig.provider !== aiConfig.AI_PROVIDERS.GEMINI) {
    console.log('⚠️  当前AI提供商不是Gemini，跳过测试');
    console.log('');
    return;
  }

  const keys = aiConfig.apiKeys;
  if (!keys || keys.length === 0) {
    console.log('❌ 未配置任何Gemini API密钥');
    console.log('');
    return;
  }

  console.log('测试从文章中提取股票信息...');

  // 测试用的文章内容
  const testTitle = "Apple Inc. Reports Strong Q4 Earnings";
  const testContent = `
    Apple Inc. (AAPL) today announced its financial results for the fourth quarter of fiscal year 2024.
    The company reported revenue of $119.6 billion, beating analyst expectations.
    iPhone sales were particularly strong, contributing significantly to the overall growth.
    The stock price has been volatile recently due to market conditions.
  `;

  try {
    console.log('调用Gemini API提取股票信息...');
    const result = await extractStockInfoWithGemini(testContent, testTitle);

    console.log('✅ API调用成功');
    console.log(`提取结果: 代码=${result.symbol}, 公司=${result.company}`);

  } catch (error) {
    console.log('❌ API调用失败:', error.message);

    // 显示失败后的密钥管理器状态
    console.log('检查API密钥管理器状态...');
    // 注意：这里无法直接访问geminiService中的apiKeyManager实例
    // 在实际使用中，错误处理会在geminiService内部进行
  }

  console.log('');
}

/**
 * 显示最终状态总结
 */
function showFinalStatus() {
  console.log('=== 测试总结 ===');

  if (aiConfig.provider !== aiConfig.AI_PROVIDERS.GEMINI) {
    console.log('⚠️  当前配置的AI提供商不是Gemini');
    console.log('请设置 AI_PROVIDER=gemini 来启用Gemini测试');
    return;
  }

  const keys = aiConfig.apiKeys;
  if (!keys || keys.length === 0) {
    console.log('❌ 未配置任何Gemini API密钥');
    console.log('请设置 GEMINI_API_KEYS 环境变量');
    return;
  }

  console.log(`✅ 配置验证通过，共 ${keys.length} 个API密钥`);
  console.log('✅ API密钥管理器初始化成功');
  console.log('✅ 轮询机制测试完成');
  console.log('✅ 错误处理测试完成');
  console.log('✅ API调用测试完成（如果密钥有效）');

  console.log('\n测试脚本执行完毕！');
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始Gemini API密钥功能测试\n');

    // 1. 检查环境变量
    const envOk = checkEnvironmentVariables();
    if (!envOk) {
      console.log('❌ 环境变量检查失败，请设置必要的环境变量');
      return;
    }

    // 2. 测试API密钥配置读取
    const configOk = testApiKeyConfiguration();
    if (!configOk) {
      console.log('❌ API密钥配置测试失败');
      return;
    }

    // 3. 测试API密钥管理器状态
    testApiKeyManagerStatus();

    // 4. 测试API密钥轮询机制
    testApiKeyRotation();

    // 5. 测试错误处理
    testErrorHandling();

    // 6. 测试实际API调用
    await testApiCall();

    // 7. 显示最终状态
    showFinalStatus();

  } catch (error) {
    console.error('❌ 测试脚本执行失败:', error);
  }
}

// 执行主函数
main();