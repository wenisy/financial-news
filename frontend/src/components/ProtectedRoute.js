import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // 如果正在加载，显示加载中
  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  // 如果未登录，重定向到登录页
  if (!user) {
    // 使用state属性，传递当前路径，避免循环重定向
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }

  // 已登录，显示子组件
  return children;
};

export default ProtectedRoute;
