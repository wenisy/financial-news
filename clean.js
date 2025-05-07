/**
 * 清理脚本 - 清理后端public目录中的前端资源
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// 日志函数
function log(message, color = colors.fg.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// 错误日志函数
function error(message) {
  console.error(`${colors.fg.red}错误: ${message}${colors.reset}`);
}

// 成功日志函数
function success(message) {
  console.log(`${colors.fg.green}成功: ${message}${colors.reset}`);
}

// 信息日志函数
function info(message) {
  console.log(`${colors.fg.cyan}信息: ${message}${colors.reset}`);
}

// 警告日志函数
function warning(message) {
  console.log(`${colors.fg.yellow}警告: ${message}${colors.reset}`);
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    info(`创建目录: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 清理目录
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    info(`清理目录: ${dir}`);
    
    // 读取目录内容
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    // 保留index.html文件
    const indexHtmlPath = path.join(dir, 'index.html');
    let hasIndexHtml = false;
    
    // 删除所有文件和目录，除了index.html
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      
      if (entry.name === 'index.html') {
        hasIndexHtml = true;
        continue;
      }
      
      if (entry.isDirectory()) {
        info(`删除目录: ${entryPath}`);
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        info(`删除文件: ${entryPath}`);
        fs.unlinkSync(entryPath);
      }
    }
    
    // 如果没有index.html，创建一个简单的占位文件
    if (!hasIndexHtml) {
      info(`创建占位index.html文件: ${indexHtmlPath}`);
      fs.writeFileSync(indexHtmlPath, `
<!DOCTYPE html>
<html>
  <head>
    <title>金融新闻分析工具</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1 { color: #1a73e8; }
      .message { color: #5f6368; }
    </style>
  </head>
  <body>
    <h1>金融新闻分析工具</h1>
    <p class="message">前端资源已清理，请重新构建前端。</p>
  </body>
</html>
      `);
    }
  } else {
    warning(`目录不存在: ${dir}`);
    ensureDir(dir);
  }
}

// 主函数
async function main() {
  try {
    log('\n=== 开始清理 ===\n', colors.bright + colors.fg.magenta);
    
    // 清理后端public目录
    const backendPublicDir = path.join(__dirname, 'backend', 'public');
    cleanDir(backendPublicDir);
    
    success('\n=== 清理完成 ===\n');
    info('现在你可以重新构建前端:');
    log('  npm run build', colors.fg.yellow);
    
  } catch (err) {
    error(`\n清理失败: ${err.message}\n`);
    process.exit(1);
  }
}

// 执行主函数
main();
