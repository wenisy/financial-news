/**
 * 用户服务
 * 处理用户认证和管理
 */

const { Client } = require('@notionhq/client');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('../middleware/auth');

// 初始化Notion客户端
const notion = new Client({
  auth: process.env.NOTION_SECRET
});

// 打印环境变量状态
console.log('环境变量状态:');
console.log('NOTION_SECRET 是否设置:', !!process.env.NOTION_SECRET);
console.log('NOTION_USERS_DB_ID 是否设置:', !!process.env.NOTION_USERS_DB_ID);
console.log('JWT_SECRET 是否设置:', !!process.env.JWT_SECRET);

// 用户数据库ID - 使用与stock-backend相同的数据库
const NOTION_USERS_DB_ID = process.env.NOTION_USERS_DB_ID;

/**
 * MD5加密函数
 * @param {string} text - 要加密的文本
 * @returns {string} MD5哈希值
 */
function md5Hash(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * 根据用户名获取用户
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 用户对象或null
 */
async function getUserByUsername(username) {
  try {
    if (!NOTION_USERS_DB_ID) {
      console.error('未设置NOTION_USERS_DB_ID环境变量');
      return null;
    }

    console.log(`查询用户: ${username}`);
    console.log(`使用数据库ID: ${NOTION_USERS_DB_ID}`);

    const response = await notion.databases.query({
      database_id: NOTION_USERS_DB_ID,
      filter: {
        property: 'Username',
        title: { equals: username }
      },
    });

    console.log(`查询结果数量: ${response.results.length}`);

    if (response.results.length === 0) {
      return null;
    }

    const user = response.results[0];
    console.log('用户属性:', JSON.stringify(user.properties, null, 2));

    return {
      id: user.id,
      username: user.properties.Username.title[0]?.text.content || '',
      password: user.properties.Password.rich_text[0]?.text.content || '',
      email: user.properties.Email?.email || '',
      nickname: user.properties.Nickname?.rich_text[0]?.text.content || '',
      uuid: user.properties.UserUUID?.rich_text[0]?.text.content || '',
      createdAt: user.properties['Created At']?.date?.start || '',
      lastLogin: user.properties['Last Login']?.date?.start || '',
    };
  } catch (error) {
    console.error('获取用户失败:', error);
    console.error('错误详情:', error.stack);
    return null;
  }
}

/**
 * 创建新用户
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} email - 电子邮件
 * @param {string} nickname - 昵称
 * @returns {Promise<Object>} 结果对象
 */
async function createUser(username, password, email, nickname) {
  try {
    if (!NOTION_USERS_DB_ID) {
      return { success: false, message: '未设置NOTION_USERS_DB_ID环境变量' };
    }

    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return { success: false, message: '用户名已存在' };
    }

    // 生成UUID
    const userUuid = uuidv4();

    // MD5加密密码
    const hashedPassword = md5Hash(password);

    // 创建用户记录
    const properties = {
      Username: { title: [{ text: { content: username } }] },
      Password: { rich_text: [{ text: { content: hashedPassword } }] },
      Email: { email: email || null },
      UserUUID: { rich_text: [{ text: { content: userUuid } }] },
      'Created At': { date: { start: new Date().toISOString() } },
      'Last Login': { date: { start: new Date().toISOString() } },
    };

    // 如果有昵称，添加昵称字段
    if (nickname) {
      properties.Nickname = { rich_text: [{ text: { content: nickname } }] };
    }

    // 创建用户记录
    const response = await notion.pages.create({
      parent: { database_id: NOTION_USERS_DB_ID },
      properties: properties,
    });

    return {
      success: true,
      message: '用户创建成功',
      user: {
        id: response.id,
        username,
        email,
        nickname,
        uuid: userUuid,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }
    };
  } catch (error) {
    console.error('创建用户失败:', error);
    return { success: false, message: `创建用户失败: ${error.message}` };
  }
}

/**
 * 更新用户最后登录时间
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否成功
 */
async function updateLastLogin(userId) {
  try {
    await notion.pages.update({
      page_id: userId,
      properties: {
        'Last Login': { date: { start: new Date().toISOString() } },
      },
    });
    return true;
  } catch (error) {
    console.error('更新登录时间失败:', error);
    return false;
  }
}

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<Object>} 登录结果
 */
async function login(username, password) {
  try {
    console.log(`尝试登录用户: ${username}`);
    console.log(`NOTION_USERS_DB_ID: ${NOTION_USERS_DB_ID}`);
    console.log(`NOTION_SECRET 是否设置: ${!!process.env.NOTION_SECRET}`);

    const user = await getUserByUsername(username);

    if (!user) {
      console.log(`用户不存在: ${username}`);
      return { success: false, message: '用户名或密码错误' };
    }

    console.log(`找到用户: ${username}`);
    console.log(`用户ID: ${user.id}`);
    console.log(`用户UUID: ${user.uuid}`);

    // 验证密码
    const hashedPassword = md5Hash(password);
    console.log(`输入密码哈希: ${hashedPassword}`);
    console.log(`存储密码哈希: ${user.password}`);

    if (hashedPassword !== user.password) {
      console.log('密码不匹配');
      return { success: false, message: '用户名或密码错误' };
    }

    console.log('密码验证成功');

    // 更新最后登录时间
    await updateLastLogin(user.id);

    // 生成JWT令牌
    const token = generateToken(user);

    return {
      success: true,
      message: '登录成功',
      token,
      user: {
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        uuid: user.uuid
      }
    };
  } catch (error) {
    console.error('登录失败:', error);
    return { success: false, message: `登录失败: ${error.message}` };
  }
}

module.exports = {
  getUserByUsername,
  createUser,
  updateLastLogin,
  login,
  md5Hash
};
