/**
 * 文章服务
 * 
 * 提供从URL获取文章内容并分析的功能
 */

const puppeteer = require('puppeteer');
const { analyzeNews } = require('./aiService');
const { saveToNotion } = require('./notionService');

/**
 * 从URL获取文章内容并进行分析
 * @param {string} url 文章URL
 * @param {Object} stock 股票信息
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeArticleFromUrl(url, stock) {
  try {
    console.log(`分析文章: ${url} (${stock.symbol})`);
    
    // 获取文章内容
    const article = await fetchArticleContent(url);
    
    // 分析文章
    const analysis = await analyzeNews(article.content, stock);
    
    // 保存到Notion
    await saveToNotion({
      symbol: stock.symbol,
      name: stock.name,
      url: article.url,
      publishDate: article.publishDate,
      generatedDate: new Date(),
      sentiment: analysis.sentiment,
      summary: analysis.summary
    });
    
    return {
      article,
      analysis
    };
  } catch (error) {
    console.error('分析文章失败:', error);
    throw error;
  }
}

/**
 * 使用Puppeteer获取文章内容
 * @param {string} url 文章URL
 * @returns {Promise<Object>} 文章信息
 */
async function fetchArticleContent(url) {
  console.log(`获取文章内容: ${url}`);
  
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

module.exports = {
  analyzeArticleFromUrl,
  fetchArticleContent
};
