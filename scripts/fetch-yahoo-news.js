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
 * 主函数
 */
async function main() {
  try {
    console.log('开始抓取 Yahoo Finance 股票市场新闻...');
    
    // 获取新闻链接
    const newsLinks = await fetchNewsLinks();
    console.log(`找到 ${newsLinks.length} 条新闻链接`);
    
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
