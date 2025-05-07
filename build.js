/**
 * 构建脚本 - 构建前端并将构建结果复制到后端
 */

const { execSync } = require('child_process');
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

// 执行命令
function exec(command, cwd = process.cwd()) {
  try {
    info(`执行命令: ${command}`);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (err) {
    error(`命令执行失败: ${command}`);
    error(err.message);
    return false;
  }
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    info(`创建目录: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 复制目录
function copyDir(src, dest) {
  ensureDir(dest);
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 主函数
async function main() {
  try {
    log('\n=== 开始构建 ===\n', colors.bright + colors.fg.magenta);
    
    // 1. 安装依赖
    info('安装前端依赖...');
    if (!exec('npm install', './frontend')) {
      throw new Error('前端依赖安装失败');
    }
    
    info('安装后端依赖...');
    if (!exec('npm install', './backend')) {
      throw new Error('后端依赖安装失败');
    }
    
    // 2. 构建前端
    info('构建前端...');
    if (!exec('npm run build', './frontend')) {
      throw new Error('前端构建失败');
    }
    
    // 3. 确保后端public目录存在
    const backendPublicDir = path.join(__dirname, 'backend', 'public');
    ensureDir(backendPublicDir);
    
    // 4. 复制前端构建结果到后端
    info('复制前端构建结果到后端...');
    const frontendBuildDir = path.join(__dirname, 'frontend', 'build');
    copyDir(frontendBuildDir, backendPublicDir);
    
    success('\n=== 构建完成 ===\n');
    info('现在你可以使用以下命令启动应用:');
    log('  cd backend && npm start', colors.fg.yellow);
    
  } catch (err) {
    error(`\n构建失败: ${err.message}\n`);
    process.exit(1);
  }
}

// 执行主函数
main();
