/**
 * Notion数据库创建脚本
 * 
 * 此脚本用于在指定的Notion页面下创建金融新闻分析所需的数据库
 * 
 * 使用方法:
 * 1. 安装依赖: npm install @notionhq/client
 * 2. 设置环境变量或直接在脚本中填写:
 *    - NOTION_API_KEY: Notion API密钥
 *    - PARENT_PAGE_ID: 父页面ID (不含破折号的32位字符串)
 * 3. 运行脚本: node scripts/create_notion_database.js
 */

const { Client } = require('@notionhq/client');

// 从命令行参数或环境变量获取Notion API密钥和父页面ID
const notionApiKey = process.argv[2] || process.env.NOTION_API_KEY;
const parentPageId = process.argv[3] || process.env.PARENT_PAGE_ID;

// 验证必要参数
if (!notionApiKey || !parentPageId) {
  console.error('错误: 缺少必要参数');
  console.log('使用方法: node create_notion_database.js <NOTION_API_KEY> <PARENT_PAGE_ID>');
  console.log('或者设置环境变量 NOTION_API_KEY 和 PARENT_PAGE_ID');
  process.exit(1);
}

// 初始化Notion客户端
const notion = new Client({
  auth: notionApiKey
});

/**
 * 创建金融新闻分析数据库
 */
async function createFinancialNewsDatabase() {
  try {
    console.log('正在创建Notion数据库...');
    
    // 创建数据库
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: '金融新闻分析'
          }
        }
      ],
      // 定义数据库属性
      properties: {
        // 股票符号 (标题属性)
        'Symbol': {
          title: {}
        },
        // 文章链接
        '文章链接': {
          type: 'url',
          url: {}
        },
        // 文章日期
        '文章日期': {
          type: 'date',
          date: {}
        },
        // 生成日期
        '生成日期': {
          type: 'date',
          date: {}
        },
        // 情感分析
        '情感分析': {
          type: 'select',
          select: {
            options: [
              {
                name: '好📈',
                color: 'green'
              },
              {
                name: '中立 😐',
                color: 'gray'
              },
              {
                name: '坏 📉',
                color: 'red'
              }
            ]
          }
        },
        // 摘要
        '摘要': {
          type: 'rich_text',
          rich_text: {}
        }
      }
    });
    
    console.log('✅ 数据库创建成功!');
    console.log('数据库ID:', response.id);
    console.log('数据库URL:', `https://notion.so/${response.id.replace(/-/g, '')}`);
    
    // 创建示例条目
    await createSampleEntry(response.id);
    
    return response.id;
  } catch (error) {
    console.error('创建数据库失败:', error);
    if (error.code === 'unauthorized') {
      console.error('API密钥无效或没有足够的权限');
    } else if (error.code === 'object_not_found') {
      console.error('找不到指定的父页面ID，请检查ID是否正确');
    }
    process.exit(1);
  }
}

/**
 * 创建示例条目
 */
async function createSampleEntry(databaseId) {
  try {
    console.log('正在创建示例条目...');
    
    await notion.pages.create({
      parent: {
        database_id: databaseId
      },
      properties: {
        // 股票符号
        'Symbol': {
          title: [
            {
              text: {
                content: 'AAPL'
              }
            }
          ]
        },
        // 文章链接
        '文章链接': {
          url: 'https://finance.yahoo.com/news/apple-announces-new-products-123456789.html'
        },
        // 文章日期
        '文章日期': {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        },
        // 生成日期
        '生成日期': {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        },
        // 情感分析
        '情感分析': {
          select: {
            name: '好 😀'
          }
        },
        // 摘要
        '摘要': {
          rich_text: [
            {
              text: {
                content: '这是一个示例摘要，展示了AI分析的结果会如何显示在数据库中。实际的摘要将包含对新闻内容的简洁总结，以及对股票可能影响的分析。'
              }
            }
          ]
        }
      }
    });
    
    console.log('✅ 示例条目创建成功!');
  } catch (error) {
    console.error('创建示例条目失败:', error);
  }
}

/**
 * 验证Notion API密钥和权限
 */
async function validateCredentials() {
  try {
    console.log('正在验证Notion API密钥和权限...');
    
    // 尝试获取用户信息
    const response = await notion.users.me();
    console.log(`✅ API密钥有效! 已验证为用户: ${response.name}`);
    
    return true;
  } catch (error) {
    console.error('验证API密钥失败:', error);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== Notion金融新闻数据库创建工具 ===');
  
  // 验证凭证
  const isValid = await validateCredentials();
  if (!isValid) {
    process.exit(1);
  }
  
  // 创建数据库
  const databaseId = await createFinancialNewsDatabase();
  
  console.log('\n=== 配置信息 ===');
  console.log('请将以下环境变量添加到您的项目中:');
  console.log(`NOTION_API_KEY=${notionApiKey}`);
  console.log(`NOTION_DATABASE_ID=${databaseId}`);
  
  console.log('\n数据库已准备就绪，可以开始使用金融新闻分析工具了!');
}

// 运行主函数
main();
