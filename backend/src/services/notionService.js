const { Client } = require('@notionhq/client');

// 初始化Notion客户端
const notion = new Client({
  auth: process.env.NOTION_SECRET
});

// 数据库ID
const databaseId = process.env.NOTION_DATABASE_ID;

/**
 * 将分析结果保存到Notion数据库
 * @param {Object} data 要保存的数据
 * @returns {Promise<Object>} Notion API响应
 */
async function saveToNotion(data) {
  try {
    // 检查是否已存在相同URL的记录
    const existingPage = await findExistingPage(data.url);

    if (existingPage) {
      // 更新现有记录
      return updateNotionPage(existingPage.id, data);
    } else {
      // 创建新记录
      return createNotionPage(data);
    }
  } catch (error) {
    console.error('保存到Notion失败:', error);
    throw error;
  }
}

/**
 * 在Notion数据库中查找具有相同URL的页面
 * @param {string} url 文章URL
 * @returns {Promise<Object|null>} 找到的页面或null
 */
async function findExistingPage(url) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: '文章链接',
        url: {
          equals: url
        }
      }
    });

    return response.results.length > 0 ? response.results[0] : null;
  } catch (error) {
    console.error('查询Notion数据库失败:', error);
    return null;
  }
}

/**
 * 在Notion数据库中创建新页面
 * @param {Object} data 页面数据
 * @returns {Promise<Object>} Notion API响应
 */
async function createNotionPage(data) {
  // 准备情感分析的emoji
  const sentimentEmoji = getSentimentEmoji(data.sentiment);
  const sentimentText = `${data.sentiment} ${sentimentEmoji}`;

  return notion.pages.create({
    parent: {
      database_id: databaseId
    },
    properties: {
      // 标题属性 - 股票符号
      'Symbol': {
        title: [
          {
            text: {
              content: data.symbol
            }
          }
        ]
      },
      // URL属性 - 文章链接
      '文章链接': {
        url: data.url
      },
      // 日期属性 - 文章日期
      '文章日期': {
        date: {
          start: formatDate(data.publishDate)
        }
      },
      // 日期属性 - 生成日期
      '生成日期': {
        date: {
          start: formatDate(data.generatedDate)
        }
      },
      // 选择属性 - 情感分析
      '情感分析': {
        select: {
          name: sentimentText
        }
      },
      // 富文本属性 - 摘要
      '摘要': {
        rich_text: [
          {
            text: {
              content: data.summary
            }
          }
        ]
      }
    }
  });
}

/**
 * 更新Notion页面
 * @param {string} pageId 页面ID
 * @param {Object} data 更新数据
 * @returns {Promise<Object>} Notion API响应
 */
async function updateNotionPage(pageId, data) {
  // 准备情感分析的emoji
  const sentimentEmoji = getSentimentEmoji(data.sentiment);
  const sentimentText = `${data.sentiment} ${sentimentEmoji}`;

  return notion.pages.update({
    page_id: pageId,
    properties: {
      // 日期属性 - 文章日期
      '文章日期': {
        date: {
          start: formatDate(data.publishDate)
        }
      },
      // 日期属性 - 生成日期
      '生成日期': {
        date: {
          start: formatDate(data.generatedDate)
        }
      },
      // 选择属性 - 情感分析
      '情感分析': {
        select: {
          name: sentimentText
        }
      },
      // 富文本属性 - 摘要
      '摘要': {
        rich_text: [
          {
            text: {
              content: data.summary
            }
          }
        ]
      }
    }
  });
}

/**
 * 格式化日期为北京时间（UTC+8）ISO字符串（包含时分秒）
 * @param {Date} date 日期对象
 * @returns {string} 格式化的北京时间日期时间字符串
 */
function formatDate(date) {
  // 如果没有提供日期，使用当前时间
  const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();

  // 获取UTC时间
  const utcTime = dateObj.getTime();

  // 转换为北京时间 (UTC+8)
  const beijingTime = new Date(utcTime + 8 * 60 * 60 * 1000);

  // 返回ISO格式字符串
  return beijingTime.toISOString();
}

/**
 * 根据情感获取对应的emoji
 * @param {string} sentiment 情感分析结果
 * @returns {string} 对应的emoji
 */
function getSentimentEmoji(sentiment) {
  switch (sentiment) {
    case '好':
      return '😀';
    case '坏':
      return '😞';
    case '中立':
    default:
      return '😐';
  }
}

/**
 * 检查文章是否已存在于数据库中
 * @param {string} url 文章URL
 * @returns {Promise<boolean>} 文章是否存在
 */
async function isArticleExists(url) {
  try {
    const existingPage = await findExistingPage(url);
    return !!existingPage;
  } catch (error) {
    console.error('检查文章是否存在失败:', error);
    throw error;
  }
}

module.exports = {
  saveToNotion,
  isArticleExists,
  findExistingPage
};
