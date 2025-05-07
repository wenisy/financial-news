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
        // 检查localStorage中是否有token
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        // 验证token
        const response = await authAPI.checkAuth();
        setUser(response.data.user);
      } catch (err) {
        console.error('认证检查失败:', err);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 登录函数
  const login = async (username, password) => {
    try {
      setError(null);
      const response = await authAPI.login(username, password);
      const { token, user: userData } = response.data;
      
      // 保存token到localStorage
      localStorage.setItem('token', token);
      setUser(userData);
      return true;
    } catch (err) {
      console.error('登录失败:', err);
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
      return false;
    }
  };

  // 登出函数
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
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
