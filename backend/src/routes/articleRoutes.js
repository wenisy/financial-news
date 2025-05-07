/**
 * 文章分析路由
 *
 * 提供文章分析相关的API端点
 */

const express = require('express');
const { analyzeArticleFromUrl, fetchArticleContent, fetchWithCurl } = require('../services/articleService');
const { verifyToken } = require('../middleware/auth');
const { extractStockInfo } = require('../services/aiService');

const router = express.Router();

// 使用认证中间件保护路由
router.use(verifyToken);

/**
 * 分析文章
 *
 * POST /api/articles/analyze
 *
 * 请求体:
 * {
 *   "url": "https://example.com/article",
 *   "stock": {
 *     "symbol": "AAPL",
 *     "name": "Apple Inc."
 *   }
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url, stock } = req.body;

    // 验证请求数据
    if (!url) {
      return res.status(400).json({
        success: false,
        message: '缺少文章URL'
      });
    }

    if (!stock || !stock.symbol || !stock.name) {
      return res.status(400).json({
        success: false,
        message: '缺少股票信息 (symbol和name)'
      });
    }

    // 执行分析
    const result = await analyzeArticleFromUrl(url, stock);

    // 检查是否跳过（文章已存在）
    if (result.skipped && result.reason === 'article_exists') {
      return res.status(200).json({
        success: true,
        message: '文章已存在，跳过分析',
        skipped: true,
        reason: 'article_exists'
      });
    }

    // 返回分析结果
    res.status(200).json({
      success: true,
      message: '分析完成',
      title: result.article.title,
      url: result.article.url,
      publishDate: result.article.publishDate,
      summary: result.analysis.summary,
      sentiment: result.analysis.sentiment
    });

  } catch (error) {
    console.error('处理分析请求失败:', error);
    res.status(500).json({
      success: false,
      message: '处理请求时出错',
      error: error.message
    });
  }
});

/**
 * 获取文章内容
 *
 * POST /api/articles/content
 *
 * 请求体:
 * {
 *   "url": "https://example.com/article"
 * }
 */
router.post('/content', async (req, res) => {
  try {
    const { url } = req.body;

    // 验证请求数据
    if (!url) {
      return res.status(400).json({
        success: false,
        message: '缺少文章URL'
      });
    }

    // 获取文章内容
    const article = await fetchArticleContent(url);

    // 返回结果
    res.json({
      success: true,
      data: {
        title: article.title,
        url: article.url,
        source: article.source,
        publishDate: article.publishDate,
        content: article.content,
        contentPreview: article.content.substring(0, 300) + '...',
        contentLength: article.content.length
      }
    });

  } catch (error) {
    console.error('获取文章内容失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文章内容失败',
      error: error.message
    });
  }
});

/**
 * 从文章中提取股票代码和公司名称
 *
 * POST /api/articles/extract
 *
 * 请求体:
 * {
 *   "url": "https://example.com/article"
 * }
 */
router.post('/extract', async (req, res) => {
  try {
    console.log('收到信息提取请求');

    const { url } = req.body;

    // 验证请求数据
    if (!url) {
      return res.status(400).json({
        success: false,
        message: '缺少文章URL'
      });
    }

    console.log(`从文章中提取信息: ${url}`);

    // 直接使用curl方法获取文章内容
    // 这里我们直接调用fetchWithCurl而不是fetchArticleContent，以确保使用curl方法
    const article = await fetchWithCurl(url);

    // 检查是否成功获取标题
    if (article.title === '无法获取标题') {
      console.log(`无法获取文章标题: ${url}`);
      return res.status(400).json({
        success: false,
        message: '无法获取文章标题',
        error: '无法从URL中提取有效内容'
      });
    }

    // 使用AI提取股票代码和公司名称
    const extractedInfo = await extractStockInfo(article.content, article.title);

    // 返回提取结果
    res.status(200).json({
      success: true,
      message: '信息提取完成',
      title: article.title,
      symbol: extractedInfo.symbol,
      company: extractedInfo.company
    });
  } catch (error) {
    console.error('提取信息失败:', error);
    res.status(500).json({
      success: false,
      message: '提取信息失败',
      error: error.message
    });
  }
});

module.exports = router;
