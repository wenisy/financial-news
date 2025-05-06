/**
 * 简单文章内容获取工具
 * 
 * 使用axios获取文章内容
 * 
 * 使用方法:
 * node scripts/simple-fetch.js <文章URL>
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 从命令行获取URL
const url = process.argv[2];

if (!url) {
  console.error('错误: 请提供文章URL');
  console.log('使用方法: node scripts/simple-fetch.js <文章URL>');
  process.exit(1);
}

/**
 * 使用axios获取文章内容
 * @param {string} url 文章URL
 */
async function fetchContent(url) {
  console.log(`正在获取文章: ${url}`);
  
  try {
    // 设置请求头，模拟浏览器
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };
    
    // 发送请求
    console.log('正在加载页面...');
    const response = await axios.get(url, { headers });
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(response.data);
    
    // 获取页面标题
    const title = $('title').text().trim();
    console.log(`页面标题: ${title}`);
    
    // 获取文章内容
    console.log('提取文章内容...');
    
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
    let selectorUsed = 'body'; // 默认
    
    // 尝试找到文章内容元素
    for (const selector of selectors) {
      if ($(selector).length) {
        articleElement = $(selector);
        selectorUsed = selector;
        break;
      }
    }
    
    // 如果找不到特定元素，使用body
    if (!articleElement) {
      articleElement = $('body');
    }
    
    // 获取所有段落
    const paragraphs = articleElement.find('p');
    
    // 过滤掉太短的段落和可能的广告/导航
    const contentParagraphs = [];
    paragraphs.each((_, p) => {
      const text = $(p).text().trim();
      if (text.length > 20 && 
          !$(p).parents('nav').length && 
          !$(p).parents('header').length && 
          !$(p).parents('footer').length &&
          !$(p).parents('.ad').length &&
          !$(p).parents('.advertisement').length) {
        contentParagraphs.push(text);
      }
    });
    
    const content = contentParagraphs.join('\n\n');
    
    // 输出结果
    console.log('\n=== 文章内容 ===');
    console.log(`使用选择器: ${selectorUsed}`);
    console.log(`段落数量: ${contentParagraphs.length}`);
    console.log('\n--- 内容预览 ---');
    console.log(content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
    console.log('\n--- 完整内容 ---');
    console.log(content);
    console.log('\n=== 结束 ===');
    
  } catch (error) {
    console.error('获取文章内容失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应头:', error.response.headers);
    }
  }
}

// 执行函数
fetchContent(url);
