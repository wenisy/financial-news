const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const configPath = path.join(__dirname, '../../config.json');

// 获取配置
router.get('/', async (req, res) => {
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    res.json(JSON.parse(configData));
  } catch (error) {
    console.error('读取配置文件失败:', error);
    res.status(500).json({ message: '读取配置文件失败', error: error.message });
  }
});

// 更新配置
router.put('/', async (req, res) => {
  try {
    const newConfig = req.body;
    
    // 简单验证
    if (!newConfig.stocks || !Array.isArray(newConfig.stocks)) {
      return res.status(400).json({ message: '无效的配置格式' });
    }
    
    // 写入新配置
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    res.json({ message: '配置已更新', config: newConfig });
  } catch (error) {
    console.error('更新配置文件失败:', error);
    res.status(500).json({ message: '更新配置文件失败', error: error.message });
  }
});

// 添加股票
router.post('/stocks', async (req, res) => {
  try {
    const newStock = req.body;
    
    // 验证新股票数据
    if (!newStock.symbol || !newStock.name || !newStock.news_sources) {
      return res.status(400).json({ message: '股票数据不完整' });
    }
    
    // 读取当前配置
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // 检查是否已存在
    const existingIndex = config.stocks.findIndex(stock => stock.symbol === newStock.symbol);
    if (existingIndex >= 0) {
      config.stocks[existingIndex] = newStock;
    } else {
      config.stocks.push(newStock);
    }
    
    // 写入更新后的配置
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    res.status(201).json({ message: '股票已添加/更新', stock: newStock });
  } catch (error) {
    console.error('添加股票失败:', error);
    res.status(500).json({ message: '添加股票失败', error: error.message });
  }
});

// 删除股票
router.delete('/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // 读取当前配置
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // 过滤掉要删除的股票
    const initialLength = config.stocks.length;
    config.stocks = config.stocks.filter(stock => stock.symbol !== symbol);
    
    if (config.stocks.length === initialLength) {
      return res.status(404).json({ message: `未找到股票: ${symbol}` });
    }
    
    // 写入更新后的配置
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    res.json({ message: `股票已删除: ${symbol}` });
  } catch (error) {
    console.error('删除股票失败:', error);
    res.status(500).json({ message: '删除股票失败', error: error.message });
  }
});

module.exports = router;
