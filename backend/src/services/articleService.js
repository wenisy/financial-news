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

    // 检查是否成功获取标题
    if (article.title === '无法获取标题') {
      console.log(`无法获取文章标题，跳过分析: ${url}`);
      return { skipped: true, reason: 'title_not_found' };
    }

    // 分析文章
    try {
      const analysis = await analyzeNews(article.content, stock);

      // 只有在分析成功后才保存到Notion
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
    } catch (analysisError) {
      console.error('分析文章内容失败:', analysisError);
      // 返回错误信息，但不存入Notion
      return {
        article,
        error: analysisError.message || '分析过程中出错',
        analysisError: true
      };
    }
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

  // 优先使用curl方法，因为它更可靠
  if (url.includes('finance.yahoo.com')) {
    console.log('检测到Yahoo Finance链接，优先使用curl方法...');
    try {
      return await fetchWithCurl(url);
    } catch (curlError) {
      console.error('curl方法失败，尝试使用Yahoo Finance API:', curlError);
      try {
        return await fetchYahooFinanceContent(url);
      } catch (apiError) {
        console.error('Yahoo Finance API方法也失败，尝试使用Axios:', apiError);
        // 如果两种方法都失败，尝试使用Axios
      }
    }
  } else {
    // 对于非Yahoo Finance链接，也优先使用curl
    console.log('优先使用curl方法...');
    try {
      return await fetchWithCurl(url);
    } catch (curlError) {
      console.error('curl方法失败，尝试使用Axios:', curlError);
      // 如果curl失败，尝试使用Axios
    }
  }

  // 如果上述方法都失败，或者不是Yahoo Finance链接，使用Axios
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
    console.log('正在使用Axios加载页面...');
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
    console.error('Axios获取文章内容失败:', error);

    // 如果Axios方法失败，再次尝试使用curl作为最后的备选方案
    console.log('Axios方法失败，再次尝试使用curl作为最后的备选方案...');
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
    // 检测环境并选择适当的临时目录
    // Vercel 环境中使用 /tmp 目录，其他环境使用相对路径
    let tempDir;
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // Vercel 或 AWS Lambda 环境
      tempDir = '/tmp';
      console.log('检测到无服务器环境，使用 /tmp 目录');
    } else {
      // 本地开发环境
      tempDir = path.join(__dirname, '../../');
      console.log('检测到本地环境，使用项目根目录');
    }

    // 创建临时文件路径，使用时间戳确保唯一性
    const timestamp = new Date().getTime();
    const tempFile = path.join(tempDir, `temp_content_${timestamp}.html`);
    console.log(`临时文件路径: ${tempFile}`);

    // 构建curl命令
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const curlCommand = `curl -s -A "${userAgent}" -L "${url}" -o "${tempFile}"`;
    console.log(`执行的curl命令: ${curlCommand}`);

    console.log('执行curl命令...');

    // 尝试使用curl命令
    let htmlContent;
    try {
      await new Promise((resolve, reject) => {
        exec(curlCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('curl命令执行失败:', error);
            reject(error);
            return;
          }
          if (stderr) {
            console.log('curl stderr:', stderr);
          }
          resolve(stdout);
        });
      });

      // 检查文件是否存在
      try {
        await fs.access(tempFile);
        console.log('临时文件创建成功');

        // 读取下载的文件
        console.log('读取下载的内容...');
        htmlContent = await fs.readFile(tempFile, 'utf8');
        console.log(`获取到HTML内容，长度: ${htmlContent.length} 字符`);
      } catch (err) {
        console.error('临时文件不存在或无法读取:', err);
        throw new Error('临时文件创建失败');
      }
    } catch (curlError) {
      // curl失败，尝试使用axios作为备选方案
      console.log('curl方法失败，尝试使用axios作为备选方案...');

      try {
        console.log('使用axios直接获取内容...');
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        htmlContent = response.data;
        console.log(`使用axios获取到HTML内容，长度: ${htmlContent.length} 字符`);
      } catch (axiosError) {
        console.error('axios获取内容也失败:', axiosError);
        throw new Error('无法获取页面内容: ' + (axiosError.message || '未知错误'));
      }
    }

    // 使用cheerio解析HTML
    const $ = cheerio.load(htmlContent);

    // 获取页面标题
    const title = $('title').text().trim() || $('h1').first().text().trim();
    console.log(`提取到的标题: ${title || '未找到标题'}`);

    // 获取发布日期
    let publishDate = '';
    const timeElement = $('time').first();
    if (timeElement.length) {
      publishDate = timeElement.attr('datetime') || timeElement.text().trim();
      console.log(`找到时间元素: ${publishDate}`);
    } else {
      console.log('未找到时间元素');
    }

    // 如果找不到日期，使用当前日期
    if (!publishDate) {
      publishDate = new Date().toISOString();
      console.log(`使用当前日期: ${publishDate}`);
    }

    // 获取文章内容
    let content = '';
    console.log('开始提取文章内容...');

    // 针对Yahoo Finance的特定选择器
    if (url.includes('finance.yahoo.com')) {
      console.log('检测到Yahoo Finance链接，使用特定选择器');

      // 尝试视频描述
      const videoDescription = $('.caas-description').text().trim();
      if (videoDescription) {
        console.log('找到视频描述');
        content += videoDescription + '\n\n';
      } else {
        console.log('未找到视频描述');
      }

      // 尝试文章正文
      const articleBody = $('.caas-body');
      if (articleBody.length) {
        console.log('找到文章正文元素');
        let paragraphCount = 0;
        articleBody.find('p').each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            content += text + '\n\n';
            paragraphCount++;
          }
        });
        console.log(`从文章正文中提取了 ${paragraphCount} 个段落`);
      } else {
        console.log('未找到文章正文元素');
      }
    }

    // 如果上面的方法没有找到内容，尝试通用选择器
    if (!content) {
      console.log('使用通用选择器提取内容');
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
      let usedSelector = '';

      // 尝试找到文章内容元素
      for (const selector of selectors) {
        if ($(selector).length) {
          articleElement = $(selector);
          usedSelector = selector;
          console.log(`找到内容元素: ${selector}`);
          break;
        }
      }

      // 如果找不到特定元素，使用body
      if (!articleElement) {
        articleElement = $('body');
        console.log('未找到特定内容元素，使用body');
      }

      // 获取所有段落
      let paragraphCount = 0;
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
      console.log(`从${usedSelector || 'body'}中提取了 ${paragraphCount} 个段落`);
    }

    // 如果仍然没有内容，尝试获取所有文本
    if (!content) {
      console.log('未找到结构化内容，提取所有文本');
      content = $('body').text().replace(/\s+/g, ' ').trim();
    }

    console.log(`提取的内容长度: ${content.length} 字符`);
    if (content.length > 0) {
      console.log(`内容预览: ${content.substring(0, 100)}...`);
    } else {
      console.log('警告: 提取的内容为空');
    }

    // 获取网站域名作为来源
    const source = new URL(url).hostname;
    console.log(`文章来源: ${source}`);

    // 清理临时文件（如果存在）
    if (tempFile && htmlContent && !htmlContent.includes('axios')) {
      try {
        // 检查文件是否存在
        await fs.access(tempFile);
        // 删除文件
        await fs.unlink(tempFile);
        console.log('临时文件已清理');
      } catch (unlinkError) {
        // 如果文件不存在或无法删除，忽略错误
        console.log('无需清理临时文件或清理失败:', unlinkError.message);
      }
    }

    console.log('文章内容提取完成，返回结果');
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
    console.log('返回默认内容');
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
  fetchArticleContent,
  fetchWithCurl
};
