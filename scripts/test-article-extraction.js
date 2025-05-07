/**
 * 测试文章提取脚本
 * 
 * 这个脚本用于测试从Yahoo Finance获取新闻列表和提取文章内容的功能
 * 
 * 使用方法:
 * node scripts/test-article-extraction.js
 */

require('dotenv').config();
const cheerio = require('cheerio');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Yahoo Finance 股票市场新闻页面URL
const YAHOO_NEWS_URL = 'https://finance.yahoo.com/topic/stock-market-news/';

/**
 * 主函数
 */
async function main() {
  try {
    console.log('开始测试文章提取功能...');
    
    // 获取新闻链接
    console.log('1. 获取Yahoo Finance新闻列表...');
    const newsLinks = await fetchNewsLinks();
    console.log(`找到 ${newsLinks.length} 条新闻链接`);
    
    if (newsLinks.length === 0) {
      console.error('没有找到任何新闻链接，请检查网络连接或URL');
      return;
    }
    
    // 显示前5个链接
    console.log('\n前5个新闻链接:');
    newsLinks.slice(0, 5).forEach((link, index) => {
      console.log(`${index + 1}. ${link}`);
    });
    
    // 选择第一个链接进行内容提取
    const testUrl = newsLinks[0];
    console.log(`\n2. 测试提取文章内容，使用链接: ${testUrl}`);
    
    // 使用三种不同的方法提取内容
    console.log('\n方法1: 使用curl直接获取内容');
    const article1 = await fetchWithCurl(testUrl);
    console.log(`标题: ${article1.title}`);
    console.log(`发布日期: ${article1.publishDate}`);
    console.log(`内容长度: ${article1.content.length} 字符`);
    console.log(`内容预览: ${article1.content.substring(0, 200)}...`);
    
    // 保存提取的内容到文件
    const outputFile = path.join(__dirname, '../extracted_article.txt');
    await fs.writeFile(outputFile, 
      `URL: ${testUrl}\n\n` +
      `标题: ${article1.title}\n\n` +
      `发布日期: ${article1.publishDate}\n\n` +
      `内容:\n${article1.content}`
    );
    console.log(`\n文章内容已保存到: ${outputFile}`);
    
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

/**
 * 获取Yahoo Finance股票市场新闻页面的所有新闻链接
 * @returns {Promise<string[]>} 新闻链接数组
 */
async function fetchNewsLinks() {
  try {
    // 使用curl获取页面内容
    const htmlContent = await fetchWithCurl(YAHOO_NEWS_URL, false);
    
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
 * 使用curl获取页面内容
 * @param {string} url 页面URL
 * @param {boolean} parseArticle 是否解析为文章对象
 * @returns {Promise<string|Object>} 页面HTML内容或文章对象
 */
async function fetchWithCurl(url, parseArticle = true) {
  // 创建临时文件路径
  const tempFile = path.join(__dirname, '../temp_content.html');
  
  // 构建curl命令
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const curlCommand = `curl -s -A "${userAgent}" -L "${url}" -o "${tempFile}"`;
  
  try {
    console.log(`执行curl命令获取: ${url}`);
    
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
    console.log('读取下载的内容...');
    const htmlContent = await fs.readFile(tempFile, 'utf8');
    
    // 如果不需要解析为文章对象，直接返回HTML内容
    if (!parseArticle) {
      return htmlContent;
    }
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(htmlContent);
    
    // 获取页面标题
    const title = $('title').text().trim() || $('h1').first().text().trim();
    
    // 获取发布日期
    let publishDate = '';
    const timeElement = $('time').first();
    if (timeElement.length) {
      publishDate = timeElement.attr('datetime') || timeElement.text().trim();
    }
    
    // 如果找不到日期，使用当前日期
    if (!publishDate) {
      publishDate = new Date().toISOString();
    }
    
    // 获取文章内容
    let content = '';
    
    // 针对Yahoo Finance的特定选择器
    if (url.includes('finance.yahoo.com')) {
      // 尝试视频描述
      const videoDescription = $('.caas-description').text().trim();
      if (videoDescription) {
        content += videoDescription + '\n\n';
      }
      
      // 尝试文章正文
      const articleBody = $('.caas-body');
      if (articleBody.length) {
        articleBody.find('p').each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            content += text + '\n\n';
          }
        });
      }
    }
    
    // 如果上面的方法没有找到内容，尝试通用选择器
    if (!content) {
      // 尝试多种可能的文章内容选择器
      const selectors = [
        'article',
        '.article-content',
        '.article-body',
        '.story-body',
        '.story-content',
        '.news-content',
        '.post-content',
        '.entry-content',
        '.content',
        'main'
      ];
      
      let articleElement = null;
      
      // 尝试找到文章内容元素
      for (const selector of selectors) {
        if ($(selector).length) {
          articleElement = $(selector);
          break;
        }
      }
      
      // 如果找不到特定元素，使用body
      if (!articleElement) {
        articleElement = $('body');
      }
      
      // 获取所有段落
      articleElement.find('p').each((_, p) => {
        const text = $(p).text().trim();
        // 过滤掉太短的段落和可能的广告/导航
        if (text.length > 30 &&
            !$(p).parents('nav').length &&
            !$(p).parents('header').length &&
            !$(p).parents('footer').length &&
            !$(p).parents('.ad').length &&
            !$(p).parents('.advertisement').length) {
          content += text + '\n\n';
        }
      });
    }
    
    // 如果仍然没有内容，尝试获取所有文本
    if (!content) {
      content = $('body').text().replace(/\s+/g, ' ').trim();
    }
    
    // 清理临时文件
    try {
      await fs.unlink(tempFile);
    } catch (unlinkError) {
      console.error('清理临时文件失败:', unlinkError);
    }
    
    return {
      title,
      url,
      content,
      publishDate: new Date(publishDate),
      source: new URL(url).hostname
    };
  } catch (error) {
    console.error('使用curl获取内容失败:', error);
    throw error;
  }
}

// 执行主函数
main();
