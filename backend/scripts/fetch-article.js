/**
 * 文章内容获取工具
 * 
 * 使用Puppeteer模拟浏览器获取动态渲染的文章内容
 * 
 * 使用方法:
 * node scripts/fetch-article.js <文章URL>
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { analyzeNews } = require('../src/services/aiService');
const { saveToNotion } = require('../src/services/notionService');

// 从命令行获取URL
const url = process.argv[2];
const symbol = process.argv[3] || 'UNKNOWN';
const stockName = process.argv[4] || '未知公司';

if (!url) {
  console.error('错误: 请提供文章URL');
  console.log('使用方法: node scripts/fetch-article.js <文章URL> [股票代码] [公司名称]');
  process.exit(1);
}

/**
 * 使用Puppeteer获取文章内容
 * @param {string} url 文章URL
 * @returns {Promise<Object>} 文章信息
 */
async function fetchArticleContent(url) {
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
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 等待页面加载完成
    await page.waitForTimeout(2000);
    
    // 获取页面标题
    const title = await page.title();
    
    // 尝试获取发布日期
    let publishDate = await page.evaluate(() => {
      // 尝试多种可能的日期选择器
      const selectors = [
        'time', 
        '[datetime]', 
        '[pubdate]',
        'meta[property="article:published_time"]',
        '.date',
        '.time',
        '.timestamp',
        '.article-date',
        '.publish-date'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          // 尝试获取日期属性
          const dateStr = element.getAttribute('datetime') || 
                         element.getAttribute('content') || 
                         element.textContent;
          if (dateStr) return dateStr;
        }
      }
      
      return null;
    });
    
    // 如果找不到日期，使用当前日期
    if (!publishDate) {
      publishDate = new Date().toISOString();
    }
    
    // 获取文章内容
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
      
      // 尝试找到文章内容元素
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          articleElement = element;
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
          return text.length > 30 && 
                 !p.closest('nav') && 
                 !p.closest('header') && 
                 !p.closest('footer') &&
                 !p.closest('.ad') &&
                 !p.closest('.advertisement');
        })
        .map(p => p.textContent.trim());
      
      return contentParagraphs.join('\n\n');
    });
    
    // 获取网站域名作为来源
    const source = new URL(url).hostname;
    
    return {
      title,
      url,
      content,
      publishDate: new Date(publishDate),
      source
    };
  } catch (error) {
    console.error('获取文章内容失败:', error);
    throw error;
  } finally {
    // 关闭浏览器
    await browser.close();
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('=== 文章内容获取工具 ===');
    
    // 获取文章内容
    const article = await fetchArticleContent(url);
    
    console.log('\n=== 文章信息 ===');
    console.log('标题:', article.title);
    console.log('来源:', article.source);
    console.log('发布日期:', article.publishDate);
    console.log('\n=== 文章内容预览 ===');
    console.log(article.content.substring(0, 500) + '...');
    console.log(`\n总字数: ${article.content.length}`);
    
    // 如果提供了股票代码，进行AI分析
    if (symbol !== 'UNKNOWN') {
      console.log('\n=== 开始AI分析 ===');
      
      // 分析文章
      const analysis = await analyzeNews(article.content, {
        symbol,
        name: stockName
      });
      
      console.log('\n=== 分析结果 ===');
      console.log('摘要:', analysis.summary);
      console.log('情感:', analysis.sentiment);
      
      // 如果设置了Notion API密钥和数据库ID，保存到Notion
      if (process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
        console.log('\n=== 保存到Notion ===');
        
        await saveToNotion({
          symbol,
          name: stockName,
          url: article.url,
          publishDate: article.publishDate,
          generatedDate: new Date(),
          sentiment: analysis.sentiment,
          summary: analysis.summary
        });
        
        console.log('已保存到Notion数据库');
      }
    }
    
    console.log('\n=== 完成 ===');
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
