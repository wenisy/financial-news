/**
 * 测试路由
 * 
 * 用于测试AI服务功能的API端点
 */

const express = require('express');
const { analyzeNews } = require('../services/aiService');
const { analyzeNewsWithXai } = require('../services/xaiService');
const aiConfig = require('../config/aiConfig');

const router = express.Router();

// 测试xAI API端点
router.post('/test-xai', async (req, res) => {
  try {
    const { stock, newsContent } = req.body;
    
    // 验证请求数据
    if (!stock || !stock.symbol || !stock.name || !newsContent) {
      return res.status(400).json({
        success: false,
        message: '请求数据不完整，需要提供stock.symbol、stock.name和newsContent'
      });
    }
    
    console.log(`收到测试请求: ${stock.symbol} (${stock.name})`);
    console.log(`新闻内容长度: ${newsContent.length}字符`);
    
    // 直接使用xAI服务
    const result = await analyzeNewsWithXai(newsContent, stock);
    
    // 返回结果
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('测试xAI失败:', error);
    res.status(500).json({
      success: false,
      message: `测试失败: ${error.message}`
    });
  }
});

// 测试通用AI API端点
router.post('/test-ai', async (req, res) => {
  try {
    const { stock, newsContent } = req.body;
    
    // 验证请求数据
    if (!stock || !stock.symbol || !stock.name || !newsContent) {
      return res.status(400).json({
        success: false,
        message: '请求数据不完整，需要提供stock.symbol、stock.name和newsContent'
      });
    }
    
    console.log(`收到测试请求: ${stock.symbol} (${stock.name})`);
    console.log(`使用AI提供商: ${aiConfig.provider}`);
    console.log(`新闻内容长度: ${newsContent.length}字符`);
    
    // 使用通用AI服务
    const result = await analyzeNews(newsContent, stock);
    
    // 返回结果
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('测试AI失败:', error);
    res.status(500).json({
      success: false,
      message: `测试失败: ${error.message}`
    });
  }
});

module.exports = router;
