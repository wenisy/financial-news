/**
 * 文章服务
 *
 * 提供从URL获取文章内容并分析的功能
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { analyzeNews } = require('./aiService');
const { saveToNotion, isArticleExists } = require('./notionService');

/**
 * 从URL获取文章内容并进行分析
 * @param {string} url 文章URL
 * @param {Object} stock 股票信息
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeArticleFromUrl(url, stock) {
  try {
    console.log(`分析文章: ${url} (${stock.symbol})`);

    // 检查文章是否已存在
    const exists = await isArticleExists(url);
    if (exists) {
      console.log(`文章已存在，跳过分析: ${url}`);
      return { skipped: true, reason: 'article_exists' };
    }

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
 * 使用axios获取文章内容
 * @param {string} url 文章URL
 * @returns {Promise<Object>} 文章信息
 */
async function fetchArticleContent(url) {
  console.log(`获取文章内容: ${url}`);

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
      throw new Error(`请求失败，状态码: ${response.status}`);
    }

    // 使用cheerio解析HTML
    const $ = cheerio.load(response.data);

    // 获取页面标题
    const title = $('title').text().trim() || $('h1').first().text().trim();

    // 获取发布日期
    let publishDate = '';

    // 尝试多种可能的日期选择器
    const dateSelectors = [
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

    for (const selector of dateSelectors) {
      const element = $(selector).first();
      if (element.length) {
        publishDate = element.attr('datetime') || element.attr('content') || element.text().trim();
        if (publishDate) break;
      }
    }

    // 如果找不到日期，使用当前日期
    if (!publishDate) {
      publishDate = new Date().toISOString();
    }

    // 获取文章内容
    let content = '';
    let articleElement = null;

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

    // 如果是Yahoo Finance，尝试使用备用方法
    if (url.includes('finance.yahoo.com')) {
      console.log('尝试使用备用方法获取Yahoo Finance内容...');
      try {
        return await fetchYahooFinanceContent(url);
      } catch (apiError) {
        console.error('API备用方法失败:', apiError);
        console.log('尝试使用curl作为最后的备选方案...');
        return fetchWithCurl(url);
      }
    }

    // 对于其他网站，尝试使用curl
    console.log('尝试使用curl作为备选方案...');
    return fetchWithCurl(url);
  }
}

/**
 * 备用方法：获取Yahoo Finance内容
 * @param {string} url Yahoo Finance文章URL
 * @returns {Promise<Object>} 文章信息
 */
async function fetchYahooFinanceContent(url) {
  // 提取文章ID
  const match = url.match(/\/([^\/]+)\.html/);
  if (!match) {
    throw new Error('无法从URL中提取文章ID');
  }

  const articleId = match[1];
  console.log(`提取的文章ID: ${articleId}`);

  // 构建API URL
  const apiUrl = `https://finance.yahoo.com/_finance_doubledown/api/resource/content.article;caasId=${articleId}`;
  console.log(`尝试从API获取内容: ${apiUrl}`);

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (response.status !== 200 || !response.data) {
      throw new Error(`API请求失败，状态码: ${response.status}`);
    }

    const data = response.data;

    // 提取内容
    let content = '';
    if (data.body) {
      // 使用cheerio解析HTML内容
      const $ = cheerio.load(data.body);
      $('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text.length > 20) {
          content += text + '\n\n';
        }
      });
    } else if (data.summary) {
      content = data.summary;
    }

    return {
      title: data.title || '未知标题',
      url,
      content,
      publishDate: data.pubtime ? new Date(data.pubtime * 1000) : new Date(),
      source: 'Yahoo Finance'
    };
  } catch (error) {
    console.error('备用方法获取内容失败:', error);

    // 如果API方法也失败，返回一个基本对象
    return {
      title: '无法获取标题',
      url,
      content: '无法获取内容。请手动查看原文。',
      publishDate: new Date(),
      source: 'Yahoo Finance'
    };
  }
}

/**
 * 使用curl获取文章内容
 * @param {string} url 文章URL
 * @returns {Promise<Object>} 文章信息
 */
async function fetchWithCurl(url) {
  console.log(`使用curl获取文章: ${url}`);

  try {
    // 创建临时文件路径
    const tempFile = path.join(__dirname, '../../temp_content.html');

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

    // 获取网站域名作为来源
    const source = new URL(url).hostname;

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
      source
    };
  } catch (error) {
    console.error('使用curl获取内容失败:', error);

    // 如果curl方法也失败，返回一个基本对象
    return {
      title: '无法获取标题',
      url,
      content: '无法获取内容。请手动查看原文。',
      publishDate: new Date(),
      source: new URL(url).hostname
    };
  }
}

module.exports = {
  analyzeArticleFromUrl,
  fetchArticleContent
};
