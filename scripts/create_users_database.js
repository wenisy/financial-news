/**
 * 创建用户数据库脚本
 * 
 * 在Notion中创建用户数据库
 * 
 * 使用方法:
 * node scripts/create_users_database.js
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

// 初始化Notion客户端
const notion = new Client({
  auth: process.env.NOTION_SECRET
});

// 父页面ID
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

/**
 * 创建用户数据库
 */
async function createUsersDatabase() {
  try {
    console.log('开始创建用户数据库...');
    
    if (!process.env.NOTION_SECRET) {
      throw new Error('未设置NOTION_SECRET环境变量');
    }
    
    if (!PARENT_PAGE_ID) {
      throw new Error('未设置NOTION_PARENT_PAGE_ID环境变量');
    }
    
    // 创建用户数据库
    const response = await notion.databases.create({
      parent: {
        type: "page_id",
        page_id: PARENT_PAGE_ID
      },
      title: [
        {
          type: "text",
          text: {
            content: "金融新闻用户"
          }
        }
      ],
      properties: {
        // 用户名（标题字段）
        "Username": {
          title: {}
        },
        // 密码（MD5哈希）
        "Password": {
          rich_text: {}
        },
        // 电子邮件
        "Email": {
          email: {}
        },
        // 昵称
        "Nickname": {
          rich_text: {}
        },
        // 用户UUID
        "UserUUID": {
          rich_text: {}
        },
        // 创建时间
        "Created At": {
          date: {}
        },
        // 最后登录时间
        "Last Login": {
          date: {}
        }
      }
    });
    
    console.log('✅ 用户数据库创建成功!');
    console.log('数据库ID:', response.id);
    
    return response.id;
  } catch (error) {
    console.error('创建用户数据库失败:', error);
    throw error;
  }
}

/**
 * 创建示例用户
 */
async function createSampleUser(databaseId) {
  try {
    console.log('创建示例用户...');
    
    const crypto = require('crypto');
    
    // MD5加密密码
    const password = 'password123';
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
    
    // 创建示例用户
    await notion.pages.create({
      parent: {
        database_id: databaseId
      },
      properties: {
        // 用户名
        'Username': {
          title: [
            {
              text: {
                content: 'admin'
              }
            }
          ]
        },
        // 密码（MD5哈希）
        'Password': {
          rich_text: [
            {
              text: {
                content: hashedPassword
              }
            }
          ]
        },
        // 电子邮件
        'Email': {
          email: 'admin@example.com'
        },
        // 昵称
        'Nickname': {
          rich_text: [
            {
              text: {
                content: '管理员'
              }
            }
          ]
        },
        // 用户UUID
        'UserUUID': {
          rich_text: [
            {
              text: {
                content: '00000000-0000-0000-0000-000000000000'
              }
            }
          ]
        },
        // 创建时间
        'Created At': {
          date: {
            start: new Date().toISOString()
          }
        },
        // 最后登录时间
        'Last Login': {
          date: {
            start: new Date().toISOString()
          }
        }
      }
    });
    
    console.log('✅ 示例用户创建成功!');
    console.log('用户名: admin');
    console.log('密码: password123');
  } catch (error) {
    console.error('创建示例用户失败:', error);
  }
}

// 执行主函数
async function main() {
  try {
    const databaseId = await createUsersDatabase();
    await createSampleUser(databaseId);
    
    console.log(`
==========================================================
请将以下环境变量添加到您的 .env 文件中:

NOTION_USERS_DB_ID=${databaseId}
JWT_SECRET=your-secret-key-here

示例用户:
用户名: admin
密码: password123
==========================================================
    `);
  } catch (error) {
    console.error('执行脚本时出错:', error);
  }
}

main();
