import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

// 创建认证上下文
const AuthContext = createContext();

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 验证认证状态（通过cookie）
        const response = await authAPI.checkAuth();
        setUser(response.data.user);
      } catch (err) {
        console.error('认证检查失败:', err);
        // 认证失败，清除用户状态
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // 设置一个短暂的延迟，避免可能的请求风暴
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  // 登录函数
  const login = async (username, password) => {
    try {
      setError(null);
      const response = await authAPI.login(username, password);
      const { user: userData } = response.data;

      // token已经通过cookie设置，不需要手动保存
      setUser(userData);
      return true;
    } catch (err) {
      console.error('登录失败:', err);
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
      return false;
    }
  };

  // 登出函数
  const logout = async () => {
    try {
      // 调用登出API，清除服务器端的cookie
      await authAPI.logout();

      // 清除前端状态
      setUser(null);
    } catch (err) {
      console.error('登出失败:', err);
      // 即使API调用失败，也清除前端状态
      setUser(null);
    }
  };

  // 提供认证上下文
  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义hook，用于访问认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};

export default AuthContext;
