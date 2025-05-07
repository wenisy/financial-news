require('dotenv').config();
const express = require('express');
const path = require('path');
const { runAnalysis } = require('./controllers/analysisController');
const configRoutes = require('./routes/configRoutes');
const testRoutes = require('./routes/testRoutes');
const articleRoutes = require('./routes/articleRoutes');
const authRoutes = require('./routes/authRoutes');
const { verifyToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 路由
app.use('/api/auth', authRoutes);

// 需要认证的路由
app.use('/api/config', verifyToken, configRoutes);
app.use('/api/test', verifyToken, testRoutes);
app.use('/api/articles', articleRoutes); // 已在路由内部添加认证

// 触发分析的API端点（需要认证）
app.post('/api/analyze', verifyToken, async (req, res) => {
  try {
    // 启动分析过程
    const analysisProcess = runAnalysis();

    // 立即返回响应，不等待分析完成
    res.status(202).json({
      message: '分析任务已启动，结果将存储到Notion数据库',
      status: 'processing'
    });

    // 分析过程在后台继续运行
  } catch (error) {
    console.error('启动分析任务时出错:', error);
    res.status(500).json({
      message: '启动分析任务失败',
      error: error.message
    });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API根路径
app.get('/api', (req, res) => {
  res.json({
    message: '金融新闻分析工具API',
    version: '1.0.0',
    status: 'running'
  });
});

// 主页路由
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// 重定向旧的测试页面到主页
app.get('/test.html', (req, res) => {
  res.redirect('/index.html');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
