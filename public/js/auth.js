/**
 * 认证相关功能
 */

// 存储用户信息和令牌
let currentUser = null;
let authToken = null;

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  setupAuthListeners();
});

/**
 * 检查用户登录状态
 */
function checkAuthStatus() {
  // 从本地存储获取令牌
  authToken = localStorage.getItem('authToken');
  const userJson = localStorage.getItem('currentUser');

  if (authToken && userJson) {
    try {
      currentUser = JSON.parse(userJson);
      showMainPage();
    } catch (error) {
      console.error('解析用户信息失败:', error);
      showAuthPage();
    }
  } else {
    showAuthPage();
  }
}

/**
 * 设置认证相关事件监听器
 */
function setupAuthListeners() {
  // 标签切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除所有活动标签
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // 激活当前标签
      this.classList.add('active');
      document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
    });
  });

  // 登录表单提交
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');

    // 获取表单数据
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    // 显示加载状态
    loginBtn.disabled = true;
    loginBtn.innerHTML = '登录中 <span class="loading"></span>';
    errorDiv.style.display = 'none';

    try {
      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '登录失败');
      }

      // 保存用户信息和令牌
      authToken = data.token;
      currentUser = data.user;

      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      // 显示主页
      showMainPage();
    } catch (error) {
      console.error('登录失败:', error);
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    } finally {
      // 恢复按钮状态
      loginBtn.disabled = false;
      loginBtn.textContent = '登录';
    }
  });

  // 移除注册功能

  // 退出登录按钮
  document.getElementById('logoutBtn').addEventListener('click', () => {
    logout();
  });
}

/**
 * 显示认证页面
 */
function showAuthPage() {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('main-page').classList.add('hidden');
}

/**
 * 显示主应用页面
 */
function showMainPage() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('main-page').classList.remove('hidden');

  // 更新用户信息
  updateUserInfo();
}

/**
 * 更新用户信息显示
 */
function updateUserInfo() {
  if (currentUser) {
    const avatarEl = document.getElementById('userAvatar');
    const nicknameEl = document.getElementById('userNickname');

    // 显示用户头像（首字母）
    const initial = (currentUser.nickname || currentUser.username || 'U').charAt(0).toUpperCase();
    avatarEl.textContent = initial;

    // 显示用户昵称或用户名
    nicknameEl.textContent = currentUser.nickname || currentUser.username;
  }
}

/**
 * 退出登录
 */
function logout() {
  // 清除本地存储
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');

  // 重置变量
  authToken = null;
  currentUser = null;

  // 显示登录页面
  showAuthPage();
}

/**
 * 获取认证头信息
 * @returns {Object} 包含Authorization头的对象
 */
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}
