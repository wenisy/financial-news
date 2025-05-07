import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://financial-news-backend.vercel.app/api' 
    : 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response,
  error => {
    // 如果是401错误（未授权），清除token并重定向到登录页
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  checkAuth: () => 
    api.get('/auth/check')
};

// 文章相关API
export const articleAPI = {
  // 提取文章信息
  extractArticleInfo: (url) => 
    api.post('/articles/extract', { url }),
  
  // 分析文章
  analyzeArticle: (url, symbol, company) => 
    api.post('/articles/analyze', { 
      url, 
      stock: { symbol, name: company } 
    })
};

export default api;
