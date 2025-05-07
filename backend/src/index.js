require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
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

// 启用CORS
app.use(cors({
  origin: ['https://financial-news-tan.vercel.app', 'https://financial-news-frontend.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 静态文件服务 - 提供前端构建后的静态资源
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
console.log('前端构建路径:', frontendBuildPath);
app.use(express.static(frontendBuildPath));

// 如果前端构建目录不存在，尝试使用public目录
const publicPath = path.join(__dirname, '../public');
console.log('后端public路径:', publicPath);
app.use(express.static(publicPath));

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
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

// 重定向旧的测试页面到主页
app.get('/test.html', (req, res) => {
  res.redirect('/');
});

// 通配符路由 - 处理所有前端路由
app.get('*', (req, res, next) => {
  // 如果请求的是API路由，跳过
  if (req.path.startsWith('/api')) {
    return next();
  }

  // 尝试发送前端构建目录中的index.html
  const frontendIndexPath = path.join(__dirname, '../../frontend/build/index.html');
  if (fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }

  // 如果前端构建目录中的index.html不存在，尝试发送后端public目录中的index.html
  const publicIndexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(publicIndexPath)) {
    return res.sendFile(publicIndexPath);
  }

  // 如果都不存在，返回简单的HTML
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>金融新闻分析工具</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #1a73e8; }
          .error { color: #d93025; }
        </style>
      </head>
      <body>
        <h1>金融新闻分析工具</h1>
        <p class="error">前端资源未找到，请确保已正确构建前端。</p>
        <p>API状态: <span id="api-status">检查中...</span></p>

        <script>
          fetch('/api')
            .then(response => response.json())
            .then(data => {
              document.getElementById('api-status').textContent = '正常 ✅';
              document.getElementById('api-status').style.color = 'green';
            })
            .catch(error => {
              document.getElementById('api-status').textContent = '异常 ❌';
              document.getElementById('api-status').style.color = 'red';
            });
        </script>
      </body>
    </html>
  `);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
