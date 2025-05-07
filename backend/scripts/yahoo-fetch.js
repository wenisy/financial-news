/**
 * Yahoo Finance 文章获取工具
 * 
 * 专门针对 Yahoo Finance 网站优化的爬虫
 * 使用 axios 和 cheerio，不依赖 Puppeteer
 * 
 * 使用方法:
 * node scripts/yahoo-fetch.js <文章URL>
 */

const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
const https = require('https');

// 从命令行获取URL
const url = process.argv[2];

if (!url) {
  console.error('错误: 请提供文章URL');
  console.log('使用方法: node scripts/yahoo-fetch.js <文章URL>');
  process.exit(1);
}

/**
 * 使用axios获取Yahoo Finance文章内容
 * @param {string} url 文章URL
 */
async function fetchYahooContent(url) {
  console.log(`正在获取Yahoo Finance文章: ${url}`);
  
  try {
    // 创建自定义的HTTP/HTTPS代理，增加超时和头部大小限制
    const httpAgent = new http.Agent({
      keepAlive: true,
      timeout: 60000
    });
    
    const httpsAgent = new https.Agent({
      keepAlive: true,
      timeout: 60000,
      maxHeaderSize: 16384 * 20 // 增加最大响应头大小
    });
    
    // 设置请求头，模拟桌面浏览器
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
    
    // 发送请求
    console.log('正在加载页面...');
    const response = await axios.get(url, {
      headers,
      httpAgent,
      httpsAgent,
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      decompress: true,
      validateStatus: status => status < 500 // 允许任何小于500的状态码
    });
    
    if (response.status !== 200) {
      console.error(`请求失败，状态码: ${response.status}`);
      return;
    }
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(response.data);
    
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
    
    // 获取文章内容 - 针对Yahoo Finance的特定选择器
    console.log('提取文章内容...');
    
    // Yahoo Finance视频页面的特定选择器
    let content = '';
    let paragraphCount = 0;
    
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
    
    // 如果上面的方法没有找到内容，尝试其他选择器
    if (!content) {
      // 尝试通用段落
      $('p').each((_, p) => {
        const text = $(p).text().trim();
        // 过滤掉太短的段落和可能的广告/导航
        if (text.length > 20 && 
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
    
    // 输出结果
    console.log('\n=== 文章内容 ===');
    console.log(`段落数量: ${paragraphCount}`);
    console.log('\n--- 内容预览 ---');
    console.log(content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
    console.log('\n--- 完整内容 ---');
    console.log(content);
    console.log('\n=== 结束 ===');
    
  } catch (error) {
    console.error('获取文章内容失败:', error.message);
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应头:', JSON.stringify(error.response.headers, null, 2).substring(0, 500) + '...');
    } else if (error.request) {
      console.error('请求发送但未收到响应');
      console.error('请求详情:', error.request._currentUrl || error.request.path);
    } else {
      console.error('请求配置错误:', error.config);
    }
    
    console.log('\n尝试使用curl命令获取内容:');
    console.log(`curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -L "${url}"`);
  }
}

// 执行函数
fetchYahooContent(url);
