/**
 * 主应用功能
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAppListeners();
});

/**
 * 设置应用相关事件监听器
 */
function setupAppListeners() {
  // 分析表单提交
  document.getElementById('analyzeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultDiv = document.getElementById('analyzeResult');
    const errorDiv = document.getElementById('analyzeError');
    
    // 获取表单数据
    const url = document.getElementById('newsUrl').value;
    const symbol = document.getElementById('symbol').value;
    const name = document.getElementById('companyName').value;
    
    // 显示加载状态
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '分析中 <span class="loading"></span>';
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    try {
      // 调用API
      const response = await fetch('/api/articles/analyze', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url,
          stock: { symbol, name }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '分析失败');
      }
      
      const data = await response.json();
      
      // 显示结果
      document.getElementById('articleTitle').textContent = data.title || '未知标题';
      document.getElementById('publishDate').textContent = data.publishDate ? new Date(data.publishDate).toLocaleString() : '未知日期';
      document.getElementById('summary').textContent = data.summary || '无摘要';
      
      const sentimentEl = document.getElementById('sentiment');
      sentimentEl.textContent = data.sentiment || '未知';
      
      // 设置情感分析样式
      sentimentEl.className = 'sentiment';
      if (data.sentiment === '好' || data.sentiment === '积极') {
        sentimentEl.classList.add('good');
      } else if (data.sentiment === '中立') {
        sentimentEl.classList.add('neutral');
      } else if (data.sentiment === '坏' || data.sentiment === '消极') {
        sentimentEl.classList.add('bad');
      }
      
      resultDiv.style.display = 'block';
    } catch (error) {
      console.error('分析失败:', error);
      
      // 如果是认证错误，退出登录
      if (error.message.includes('认证') || error.message.includes('令牌') || error.message.includes('token')) {
        logout();
        errorDiv.textContent = '登录已过期，请重新登录';
      } else {
        errorDiv.textContent = `分析失败: ${error.message}`;
      }
      
      errorDiv.style.display = 'block';
    } finally {
      // 恢复按钮状态
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = '分析新闻';
    }
  });
}
