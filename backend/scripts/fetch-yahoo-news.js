/**
 * Yahoo Finance 新闻抓取脚本
 *
 * 抓取 Yahoo Finance 股票市场新闻页面的所有新闻链接，并分析内容
 *
 * 使用方法:
 * node scripts/fetch-yahoo-news.js
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { analyzeArticleFromUrl } = require('../src/services/articleService');
const { isArticleExists } = require('../src/services/notionService');

// Yahoo Finance 股票市场新闻页面URL
const YAHOO_NEWS_URL = 'https://finance.yahoo.com/topic/stock-market-news/';

/**
 * 检查必要的环境变量是否已设置
 * @returns {boolean} 是否所有必要的环境变量都已设置
 */
function checkEnvironmentVariables() {
  const requiredVars = [
    'NOTION_SECRET',
    'NOTION_DATABASE_ID',
    'AI_PROVIDER',
  ];

  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.error(`错误: 未设置 ${varName} 环境变量`);
    }
  }

  // 根据AI提供商检查相应的API密钥
  if (process.env.AI_PROVIDER === 'xai') {
    if (!process.env.XAI_API_KEY) {
      missingVars.push('XAI_API_KEY');
      console.error('警告: 未设置 XAI_API_KEY 环境变量');
    }
    if (!process.env.XAI_BASE_URL) {
      console.warn('警告: 未设置 XAI_BASE_URL 环境变量，将使用默认值');
    }
  } else if (process.env.AI_PROVIDER === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      missingVars.push('OPENAI_API_KEY');
      console.error('警告: 未设置 OPENAI_API_KEY 环境变量');
    }
  } else if (process.env.AI_PROVIDER === 'gemini') {
    if (!process.env.GEMINI_API_KEY) {
      missingVars.push('GEMINI_API_KEY');
      console.error('警告: 未设置 GEMINI_API_KEY 环境变量');
    }
  }

  return missingVars.length === 0;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('开始抓取 Yahoo Finance 股票市场新闻...');

    // 检查环境变量
    const envVarsOk = checkEnvironmentVariables();
    if (!envVarsOk) {
      console.error('由于缺少必要的环境变量，脚本将仅抓取链接但不进行分析');
    }

    // 获取新闻链接
    const newsLinks = await fetchNewsLinks();
    console.log(`找到 ${newsLinks.length} 条新闻链接`);

    // 如果环境变量不完整，只显示链接并退出
    if (!envVarsOk) {
      console.log('新闻链接:');
      newsLinks.forEach((link, index) => {
        console.log(`${index + 1}. ${link}`);
      });
      return;
    }

    // 过滤已存在的文章
    const newLinks = await filterExistingArticles(newsLinks);
    console.log(`其中 ${newLinks.length} 条是新的新闻链接`);

    if (newLinks.length === 0) {
      console.log('没有新的新闻需要分析');
      return;
    }

    // 分析新闻
    console.log('开始分析新闻...');
    for (let i = 0; i < newLinks.length; i++) {
      const url = newLinks[i];
      console.log(`[${i+1}/${newLinks.length}] 分析新闻: ${url}`);

      try {
        // 使用默认的Market作为股票代码和公司名称
        // AI会尝试从文章中提取更准确的信息
        await analyzeArticleFromUrl(url, { symbol: 'Market', name: 'Market' });
        console.log(`✅ 成功分析新闻: ${url}`);

        // 避免请求过于频繁
        if (i < newLinks.length - 1) {
          console.log('等待5秒...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error(`❌ 分析新闻失败: ${url}`, error);
      }
    }

    console.log('新闻抓取和分析完成!');
  } catch (error) {
    console.error('抓取新闻失败:', error);
  }
}

/**
 * 获取Yahoo Finance股票市场新闻页面的所有新闻链接
 * @returns {Promise<string[]>} 新闻链接数组
 */
async function fetchNewsLinks() {
  try {
    // 使用curl获取页面内容
    const htmlContent = await fetchWithCurl(YAHOO_NEWS_URL);

    // 使用cheerio解析HTML
    const $ = cheerio.load(htmlContent);
    const links = new Set();

    // 查找所有新闻链接
    $('a').each((_, element) => {
      const href = $(element).attr('href');

      // 过滤有效的新闻链接
      if (href && (
          href.includes('/news/') ||
          href.includes('/video/')) &&
          href.endsWith('.html')) {

        // 构建完整URL
        let fullUrl = href;
        if (href.startsWith('/')) {
          fullUrl = `https://finance.yahoo.com${href}`;
        }

        links.add(fullUrl);
      }
    });

    return Array.from(links);
  } catch (error) {
    console.error('获取新闻链接失败:', error);
    return [];
  }
}

/**
 * 过滤已经存在于数据库中的文章
 * @param {string[]} links 新闻链接数组
 * @returns {Promise<string[]>} 新的新闻链接数组
 */
async function filterExistingArticles(links) {
  const newLinks = [];

  for (const url of links) {
    try {
      const exists = await isArticleExists(url);
      if (!exists) {
        newLinks.push(url);
      } else {
        console.log(`文章已存在，跳过: ${url}`);
      }
    } catch (error) {
      console.error(`检查文章是否存在失败: ${url}`, error);
      // 如果检查失败，假设文章不存在
      newLinks.push(url);
    }
  }

  return newLinks;
}

/**
 * 使用curl获取页面内容
 * @param {string} url 页面URL
 * @returns {Promise<string>} 页面HTML内容
 */
async function fetchWithCurl(url) {
  // 创建临时文件路径
  const tempFile = path.join(__dirname, '../temp_content.html');

  // 构建curl命令
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const curlCommand = `curl -s -A "${userAgent}" -L "${url}" -o "${tempFile}"`;

  try {
    // 执行curl命令
    await new Promise((resolve, reject) => {
      exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });

    // 读取下载的文件
    const htmlContent = await fs.readFile(tempFile, 'utf8');

    // 清理临时文件
    try {
      await fs.unlink(tempFile);
    } catch (unlinkError) {
      console.error('清理临时文件失败:', unlinkError);
    }

    return htmlContent;
  } catch (error) {
    console.error('使用curl获取内容失败:', error);
    throw error;
  }
}

// 执行主函数
main();
