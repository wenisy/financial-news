/**
 * 认证路由
 * 处理用户注册和登录
 */

const express = require('express');
const { login, createUser } = require('../services/userService');

const router = express.Router();

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    console.log('收到登录请求');

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    const result = await login(username, password);

    if (result.success) {
      return res.status(200).json({
        message: result.message,
        token: result.token,
        user: result.user
      });
    } else {
      return res.status(401).json({ message: result.message });
    }
  } catch (error) {
    console.error('登录处理失败:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
});

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    console.log('收到注册请求');

    const { username, password, email, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    const result = await createUser(username, password, email, nickname);

    if (result.success) {
      // 注册成功后自动登录
      const loginResult = await login(username, password);
      
      return res.status(201).json({
        message: result.message,
        token: loginResult.token,
        user: {
          username: result.user.username,
          nickname: result.user.nickname,
          email: result.user.email,
          uuid: result.user.uuid
        }
      });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('注册处理失败:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
});

module.exports = router;
