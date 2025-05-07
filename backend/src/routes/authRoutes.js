/**
 * 认证路由
 * 处理用户注册和登录
 */

const express = require('express');
const { login, createUser } = require('../services/userService');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    console.log('收到登录请求');
    console.log('请求体:', JSON.stringify(req.body));

    const { username, password } = req.body;

    if (!username || !password) {
      console.log('用户名或密码为空');
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    console.log(`尝试登录用户: ${username}, 密码长度: ${password.length}`);

    const result = await login(username, password);
    console.log('登录结果:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('登录成功, 返回令牌');
      return res.status(200).json({
        message: result.message,
        token: result.token,
        user: result.user
      });
    } else {
      console.log('登录失败:', result.message);
      return res.status(401).json({ message: result.message });
    }
  } catch (error) {
    console.error('登录处理失败:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
});

/**
 * 用户注册 - 已禁用
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  return res.status(403).json({ message: '注册功能已禁用，请联系管理员获取账号' });
});

/**
 * 检查认证状态
 * GET /api/auth/check
 */
router.get('/check', verifyToken, (req, res) => {
  try {
    // 如果能到达这里，说明token有效
    return res.status(200).json({
      message: '认证有效',
      user: {
        username: req.user.username,
        userId: req.user.userId
      }
    });
  } catch (error) {
    console.error('检查认证状态失败:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
});

module.exports = router;
