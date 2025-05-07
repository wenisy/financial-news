/**
 * 使用curl获取文章内容
 * 
 * 当axios和puppeteer都失败时的备选方案
 * 
 * 使用方法:
 * node scripts/curl-fetch.js <文章URL>
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const { URL } = require('url');

// 从命令行获取URL
const url = process.argv[2];

if (!url) {
  console.error('错误: 请提供文章URL');
  console.log('使用方法: node scripts/curl-fetch.js <文章URL>');
  process.exit(1);
}

/**
 * 使用curl获取文章内容
 * @param {string} url 文章URL
 */
async function fetchWithCurl(url) {
  console.log(`正在使用curl获取文章: ${url}`);
  
  try {
    // 创建临时文件路径
    const tempFile = path.join(__dirname, '../temp_content.html');
    
    // 构建curl命令
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const curlCommand = `curl -s -A "${userAgent}" -L "${url}" -o "${tempFile}"`;
    
    console.log('执行curl命令...');
    
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
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(htmlContent);
    
    // 获取页面标题
    const title = $('title').text().trim() || $('h1').first().text().trim();
    console.log(`页面标题: ${title}`);
    
    // 获取发布日期
    let publishDate = '';
    const timeElement = $('time').first();
    if (timeElement.length) {
      publishDate = timeElement.attr('datetime') || timeElement.text().trim();
    }
    console.log(`发布日期: ${publishDate || '未找到'}`);
    
    // 获取文章内容
    console.log('提取文章内容...');
    
    // 针对Yahoo Finance的特定选择器
    let content = '';
    let paragraphCount = 0;
    
    if (url.includes('finance.yahoo.com')) {
      // 尝试视频描述
      const videoDescription = $('.caas-description').text().trim();
      if (videoDescription) {
        content += videoDescription + '\n\n';
        paragraphCount++;
      }
      
      // 尝试文章正文
      const articleBody = $('.caas-body');
      if (articleBody.length) {
        articleBody.find('p').each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            content += text + '\n\n';
            paragraphCount++;
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
          paragraphCount++;
        }
      });
    }
    
    // 如果仍然没有内容，尝试获取所有文本
    if (!content) {
      content = $('body').text().replace(/\s+/g, ' ').trim();
      paragraphCount = 1;
    }
    
    // 输出结果
    console.log('\n=== 文章内容 ===');
    console.log(`段落数量: ${paragraphCount}`);
    console.log('\n--- 内容预览 ---');
    console.log(content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
    console.log('\n--- 完整内容 ---');
    console.log(content);
    console.log('\n=== 结束 ===');
    
    // 清理临时文件
    await fs.unlink(tempFile);
    
  } catch (error) {
    console.error('获取文章内容失败:', error.message);
  }
}

// 执行函数
fetchWithCurl(url);
