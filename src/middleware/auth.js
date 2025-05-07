/**
 * 认证中间件
 * 用于验证用户JWT令牌
 */

const jwt = require('jsonwebtoken');

// JWT密钥，从环境变量获取，如果没有则使用默认值
const JWT_SECRET = process.env.JWT_SECRET || 'financial-news-default-secret';

if (!process.env.JWT_SECRET) {
  console.warn('警告: 未设置JWT_SECRET环境变量，使用默认密钥');
}

/**
 * 验证JWT令牌
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
function verifyToken(req, res, next) {
  console.log('验证令牌...');

  // 从请求头或查询参数中获取令牌
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = req.query?.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

  if (!token) {
    console.log('未找到令牌');
    return res.status(401).json({ message: '需要认证', code: 'AUTH_REQUIRED' });
  }

  try {
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('令牌验证成功:', { username: decoded.username });

    // 将解码后的用户信息添加到请求对象中
    req.user = decoded;
    next();
  } catch (error) {
    console.error('令牌验证失败:', error.message);
    return res.status(401).json({ message: '无效或过期的令牌', code: 'INVALID_TOKEN' });
  }
}

/**
 * 生成JWT令牌
 * @param {Object} user - 用户信息
 * @param {string} expiresIn - 过期时间
 * @returns {string} JWT令牌
 */
function generateToken(user, expiresIn = '24h') {
  return jwt.sign(
    {
      username: user.username,
      userId: user.id,
      uuid: user.uuid
    },
    JWT_SECRET,
    { expiresIn }
  );
}

module.exports = {
  verifyToken,
  generateToken,
  JWT_SECRET
};
