import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',  // 使用相对路径，这样前后端部署在一起时不会有跨域问题
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response,
  error => {
    // 如果是401错误（未授权），且不是认证检查接口，重定向到登录页
    if (error.response && error.response.status === 401 &&
        !error.config.url.includes('/auth/check')) {
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
    api.get('/auth/check'),

  logout: () =>
    api.post('/auth/logout')
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
