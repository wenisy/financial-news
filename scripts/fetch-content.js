/**
 * 简单文章内容获取工具
 * 
 * 使用Puppeteer模拟浏览器获取动态渲染的文章内容
 * 仅获取内容，不进行分析
 * 
 * 使用方法:
 * node scripts/fetch-content.js <文章URL>
 */

const puppeteer = require('puppeteer');

// 从命令行获取URL
const url = process.argv[2];

if (!url) {
  console.error('错误: 请提供文章URL');
  console.log('使用方法: node scripts/fetch-content.js <文章URL>');
  process.exit(1);
}

/**
 * 使用Puppeteer获取文章内容
 * @param {string} url 文章URL
 */
async function fetchContent(url) {
  console.log(`正在获取文章: ${url}`);
  
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: 'new', // 使用新的无头模式
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // 创建新页面
    const page = await browser.newPage();
    
    // 设置视口大小
    await page.setViewport({ width: 1280, height: 800 });
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // 导航到URL
    console.log('正在加载页面...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 等待页面加载完成
    await page.waitForTimeout(2000);
    
    // 获取页面标题
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    // 获取文章内容
    console.log('提取文章内容...');
    const content = await page.evaluate(() => {
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
        const element = document.querySelector(selector);
        if (element) {
          articleElement = element;
          selectorUsed = selector;
          break;
        }
      }
      
      // 如果找不到特定元素，使用body
      if (!articleElement) {
        articleElement = document.body;
      }
      
      // 获取所有段落
      const paragraphs = Array.from(articleElement.querySelectorAll('p'));
      
      // 过滤掉太短的段落和可能的广告/导航
      const contentParagraphs = paragraphs
        .filter(p => {
          const text = p.textContent.trim();
          return text.length > 20 && 
                 !p.closest('nav') && 
                 !p.closest('header') && 
                 !p.closest('footer') &&
                 !p.closest('.ad') &&
                 !p.closest('.advertisement');
        })
        .map(p => p.textContent.trim());
      
      return {
        text: contentParagraphs.join('\n\n'),
        paragraphCount: contentParagraphs.length,
        selectorUsed
      };
    });
    
    // 输出结果
    console.log('\n=== 文章内容 ===');
    console.log(`使用选择器: ${content.selectorUsed}`);
    console.log(`段落数量: ${content.paragraphCount}`);
    console.log('\n--- 内容预览 ---');
    console.log(content.text.substring(0, 1000) + (content.text.length > 1000 ? '...' : ''));
    console.log('\n--- 完整内容 ---');
    console.log(content.text);
    console.log('\n=== 结束 ===');
    
  } catch (error) {
    console.error('获取文章内容失败:', error);
  } finally {
    // 关闭浏览器
    await browser.close();
  }
}

// 执行函数
fetchContent(url);
