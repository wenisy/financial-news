const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 从指定的新闻源获取股票相关新闻
 * @param {Object} stock 股票配置对象
 * @returns {Promise<Array>} 新闻文章数组
 */
async function fetchNewsForStock(stock) {
  const allArticles = [];

  // 处理每个新闻源
  for (const source of stock.news_sources) {
    try {
      console.log(`从 ${source} 获取 ${stock.symbol} 的新闻...`);

      // 根据URL确定使用哪个爬虫
      let articles = [];
      if (source.includes('finance.yahoo.com')) {
        articles = await fetchFromYahooFinance(source, stock.symbol);
      } else if (source.includes('cnbc.com')) {
        articles = await fetchFromCNBC(source, stock.symbol);
      } else {
        articles = await fetchGeneric(source, stock.symbol);
      }

      console.log(`从 ${source} 获取到 ${articles.length} 篇新闻`);
      allArticles.push(...articles);
    } catch (error) {
      console.error(`从 ${source} 获取新闻失败:`, error);
      // 继续处理下一个源
    }
  }

  // 去重并按日期排序
  const uniqueArticles = deduplicateAndSort(allArticles);
  console.log(`总共获取到 ${uniqueArticles.length} 篇不重复的新闻`);

  return uniqueArticles;
}

/**
 * 从雅虎财经获取新闻
 * @param {string} url 雅虎财经URL
 * @param {string} symbol 股票符号
 * @returns {Promise<Array>} 新闻文章数组
 */
async function fetchFromYahooFinance(url, symbol) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const articles = [];

    // 尝试新的选择器
    console.log('尝试使用新的选择器...');
    $('section.mainContent section div.column div ul li section a').each((_, element) => {
      const titleElement = $(element);
      const title = titleElement.text().trim();
      const articleUrl = titleElement.attr('href');
      const fullUrl = articleUrl.startsWith('http') ? articleUrl : `https://finance.yahoo.com${articleUrl}`;

      // 获取日期 - 尝试找到日期元素
      const dateElement = $(element).closest('li').find('span').last();
      const dateText = dateElement.length ? dateElement.text().trim() : '';
      const date = parseDate(dateText);

      console.log(`找到新闻: ${title} (${dateText})`);

      if (title && fullUrl) {
        articles.push({
          title,
          url: fullUrl,
          date,
          source: 'Yahoo Finance',
          content: '', // 内容将在后续步骤中获取
        });
      }
    });

    // 如果上面的选择器没有找到任何内容，尝试原始选择器
    if (articles.length === 0) {
      console.log('尝试使用备用选择器...');
      $('div[data-test="press-releases"] li').each((_, element) => {
        const titleElement = $(element).find('a');
        const title = titleElement.text().trim();
        const articleUrl = titleElement.attr('href');
        const fullUrl = articleUrl.startsWith('http') ? articleUrl : `https://finance.yahoo.com${articleUrl}`;

        // 获取日期
        const dateText = $(element).find('span').last().text().trim();
        const date = parseDate(dateText);

        if (title && fullUrl) {
          articles.push({
            title,
            url: fullUrl,
            date,
            source: 'Yahoo Finance',
            content: '', // 内容将在后续步骤中获取
          });
        }
      });
    }

    // 如果仍然没有找到任何内容，尝试通用选择器
    if (articles.length === 0) {
      console.log('尝试使用通用选择器...');
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();

        // 如果链接文本或URL包含股票符号，可能是相关新闻
        if (href && text && text.length > 20 &&
            (text.includes(symbol) || href.includes(symbol) || href.includes('news'))) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();

          articles.push({
            title: text,
            url: fullUrl,
            date: new Date(), // 默认为当前日期
            source: 'Yahoo Finance',
            content: '', // 内容将在后续步骤中获取
          });
        }
      });
    }

    console.log(`从雅虎财经找到 ${articles.length} 篇新闻`);

    // 获取每篇文章的内容（限制数量以避免过多请求）
    const maxArticles = Math.min(articles.length, 5);
    for (let i = 0; i < maxArticles; i++) {
      try {
        console.log(`获取文章内容: ${articles[i].title}`);
        const articleResponse = await axios.get(articles[i].url);
        const article$ = cheerio.load(articleResponse.data);

        // 提取文章内容
        let content = '';
        article$('div.caas-body p, article p').each((_, p) => {
          content += article$(p).text() + '\n\n';
        });

        articles[i].content = content.trim();
      } catch (error) {
        console.error(`获取文章内容失败: ${articles[i].url}`, error);
        // 保留文章，但内容为空
      }
    }

    return articles.slice(0, maxArticles);
  } catch (error) {
    console.error('从雅虎财经获取新闻失败:', error);
    return [];
  }
}

/**
 * 从CNBC获取新闻
 * @param {string} url CNBC URL
 * @param {string} symbol 股票符号
 * @returns {Promise<Array>} 新闻文章数组
 */
async function fetchFromCNBC(url, symbol) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const articles = [];

    // 获取新闻列表
    $('.LatestNews-container .Card').each((_, element) => {
      const titleElement = $(element).find('.Card-title');
      const title = titleElement.text().trim();
      const articleUrl = $(element).find('a').attr('href');

      // 获取日期
      const dateText = $(element).find('.Card-time').text().trim();
      const date = parseDate(dateText);

      if (title && articleUrl) {
        articles.push({
          title,
          url: articleUrl,
          date,
          source: 'CNBC',
          content: '', // 内容将在后续步骤中获取
        });
      }
    });

    // 获取每篇文章的内容（限制数量以避免过多请求）
    const maxArticles = Math.min(articles.length, 5);
    for (let i = 0; i < maxArticles; i++) {
      try {
        const articleResponse = await axios.get(articles[i].url);
        const article$ = cheerio.load(articleResponse.data);

        // 提取文章内容
        let content = '';
        article$('.ArticleBody-articleBody p').each((_, p) => {
          content += article$(p).text() + '\n\n';
        });

        articles[i].content = content.trim();
      } catch (error) {
        console.error(`获取文章内容失败: ${articles[i].url}`, error);
        // 保留文章，但内容为空
      }
    }

    return articles.slice(0, maxArticles);
  } catch (error) {
    console.error('从CNBC获取新闻失败:', error);
    return [];
  }
}

/**
 * 通用网站爬虫
 * @param {string} url 网站URL
 * @param {string} symbol 股票符号
 * @returns {Promise<Array>} 新闻文章数组
 */
async function fetchGeneric(url, symbol) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const articles = [];

    // 查找可能的新闻链接
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();

      // 如果链接文本或URL包含股票符号，可能是相关新闻
      if (href && text && text.length > 20 &&
          (text.includes(symbol) || (href.includes(symbol)) || href.includes('news'))) {
        try {
          const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();

          articles.push({
            title: text,
            url: fullUrl,
            date: new Date(), // 默认为当前日期
            source: new URL(url).hostname,
            content: '', // 内容将在后续步骤中获取
          });
        } catch (error) {
          // 忽略无效URL
        }
      }
    });

    // 获取每篇文章的内容（限制数量以避免过多请求）
    const maxArticles = Math.min(articles.length, 5);
    for (let i = 0; i < maxArticles; i++) {
      try {
        const articleResponse = await axios.get(articles[i].url);
        const article$ = cheerio.load(articleResponse.data);

        // 尝试提取文章内容（通用方法）
        let content = '';
        article$('p').each((_, p) => {
          // 排除短段落和导航元素
          const text = article$(p).text().trim();
          if (text.length > 50 && !article$(p).parents('nav, header, footer').length) {
            content += text + '\n\n';
          }
        });

        articles[i].content = content.trim();
      } catch (error) {
        console.error(`获取文章内容失败: ${articles[i].url}`, error);
        // 保留文章，但内容为空
      }
    }

    return articles.slice(0, maxArticles);
  } catch (error) {
    console.error(`从 ${url} 获取新闻失败:`, error);
    return [];
  }
}

/**
 * 解析日期字符串
 * @param {string} dateText 日期文本
 * @returns {Date} 日期对象
 */
function parseDate(dateText) {
  if (!dateText) return new Date();

  try {
    // 处理常见的日期格式
    if (dateText.includes('ago') || dateText.includes('小时前') || dateText.includes('分钟前')) {
      // 相对时间（例如："2 hours ago"）
      return new Date();
    } else {
      // 尝试直接解析
      return new Date(dateText);
    }
  } catch (error) {
    console.error(`解析日期失败: ${dateText}`, error);
    return new Date();
  }
}

/**
 * 去重并按日期排序
 * @param {Array} articles 文章数组
 * @returns {Array} 处理后的文章数组
 */
function deduplicateAndSort(articles) {
  // 使用URL去重
  const uniqueArticles = Array.from(
    new Map(articles.map(article => [article.url, article])).values()
  );

  // 按日期降序排序（最新的在前）
  return uniqueArticles.sort((a, b) => b.date - a.date);
}

module.exports = {
  fetchNewsForStock
};
