/**
 * GitHub Actions运行脚本
 * 该脚本在GitHub Actions工作流中执行，用于运行完整的新闻分析流程
 */

require('dotenv').config();
const { runAnalysis } = require('../controllers/analysisController');

async function main() {
  console.log('开始执行GitHub Actions分析任务...');

  try {
    // 检查必要的环境变量
    checkEnvironmentVariables();

    // 运行分析
    const result = await runAnalysis();

    if (result.success) {
      console.log('分析任务成功完成');
      process.exit(0);
    } else {
      console.error('分析任务失败:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('执行分析任务时出错:', error);
    process.exit(1);
  }
}

/**
 * 检查必要的环境变量
 */
function checkEnvironmentVariables() {
  // 获取当前AI提供商
  const aiProvider = process.env.AI_PROVIDER || 'openai';
  console.log(`使用AI提供商: ${aiProvider}`);

  // 根据AI提供商确定必要的环境变量
  let requiredVars = [
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID'
  ];

  // 添加特定AI提供商的API密钥要求
  if (aiProvider.toLowerCase() === 'openai') {
    requiredVars.push('OPENAI_API_KEY');
  } else if (aiProvider.toLowerCase() === 'xai') {
    requiredVars.push('XAI_API_KEY');
  } else {
    console.warn(`警告: 未知的AI提供商 "${aiProvider}"，默认使用OpenAI`);
    requiredVars.push('OPENAI_API_KEY');
  }

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
  }
}

// 执行主函数
main();
