/**
 * 主应用功能
 */

// 存储当前分析的URL和提取的信息
let currentAnalysis = {
  url: '',
  extractedSymbol: '',
  extractedCompany: '',
  userSymbol: '',
  userCompany: ''
};

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
    const extractResultDiv = document.getElementById('extractResult');
    const analyzeResultDiv = document.getElementById('analyzeResult');
    const errorDiv = document.getElementById('analyzeError');

    // 获取表单数据
    const url = document.getElementById('newsUrl').value;
    const symbol = document.getElementById('symbol').value;
    const name = document.getElementById('companyName').value;

    // 保存用户输入的值
    currentAnalysis = {
      url,
      extractedSymbol: '',
      extractedCompany: '',
      userSymbol: symbol,
      userCompany: name
    };

    // 显示加载状态
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '提取信息中 <span class="loading"></span>';
    extractResultDiv.style.display = 'none';
    analyzeResultDiv.style.display = 'none';
    errorDiv.style.display = 'none';

    try {
      // 如果用户已经输入了股票代码和公司名称，直接进行分析
      if (symbol && name) {
        await performAnalysis(url, symbol, name);
        return;
      }

      // 否则，先提取股票信息
      const extractResponse = await fetch('/api/articles/extract', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url })
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.message || '提取信息失败');
      }

      const extractData = await extractResponse.json();

      // 保存提取的信息
      currentAnalysis.extractedSymbol = extractData.symbol || '';
      currentAnalysis.extractedCompany = extractData.company || '';

      // 显示提取结果
      document.getElementById('extractedSymbol').textContent = currentAnalysis.extractedSymbol || '未找到';
      document.getElementById('extractedCompany').textContent = currentAnalysis.extractedCompany || '未找到';

      // 显示提取结果区域
      extractResultDiv.style.display = 'block';
    } catch (error) {
      console.error('提取信息失败:', error);

      // 如果是认证错误，退出登录
      if (error.message.includes('认证') || error.message.includes('令牌') || error.message.includes('token')) {
        logout();
        errorDiv.textContent = '登录已过期，请重新登录';
      } else {
        errorDiv.textContent = `提取信息失败: ${error.message}`;
      }

      errorDiv.style.display = 'block';
    } finally {
      // 恢复按钮状态
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = '分析新闻';
    }
  });

  // 接受提取的股票代码
  document.getElementById('acceptSymbol').addEventListener('click', () => {
    const symbolInput = document.getElementById('symbol');
    symbolInput.value = currentAnalysis.extractedSymbol;
    currentAnalysis.userSymbol = currentAnalysis.extractedSymbol;
  });

  // 接受提取的公司名称
  document.getElementById('acceptCompany').addEventListener('click', () => {
    const companyInput = document.getElementById('companyName');
    companyInput.value = currentAnalysis.extractedCompany;
    currentAnalysis.userCompany = currentAnalysis.extractedCompany;
  });

  // 确认提取结果并继续分析
  document.getElementById('confirmExtract').addEventListener('click', async () => {
    const extractResultDiv = document.getElementById('extractResult');
    const errorDiv = document.getElementById('analyzeError');

    // 获取最终使用的股票代码和公司名称
    const finalSymbol = currentAnalysis.userSymbol || currentAnalysis.extractedSymbol;
    const finalCompany = currentAnalysis.userCompany || currentAnalysis.extractedCompany;

    if (!finalSymbol || !finalCompany) {
      errorDiv.textContent = '请提供股票代码和公司名称以继续分析';
      errorDiv.style.display = 'block';
      return;
    }

    // 隐藏提取结果区域
    extractResultDiv.style.display = 'none';

    try {
      // 执行分析
      await performAnalysis(currentAnalysis.url, finalSymbol, finalCompany);
    } catch (error) {
      console.error('分析失败:', error);
      errorDiv.textContent = `分析失败: ${error.message}`;
      errorDiv.style.display = 'block';
    }
  });

  // 取消提取结果
  document.getElementById('cancelExtract').addEventListener('click', () => {
    document.getElementById('extractResult').style.display = 'none';
  });
}

/**
 * 执行新闻分析
 * @param {string} url - 新闻URL
 * @param {string} symbol - 股票代码
 * @param {string} company - 公司名称
 */
async function performAnalysis(url, symbol, company) {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultDiv = document.getElementById('analyzeResult');
  const errorDiv = document.getElementById('analyzeError');

  // 显示加载状态
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '分析中 <span class="loading"></span>';
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  try {
    // 调用分析API
    const response = await fetch('/api/articles/analyze', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        url,
        stock: { symbol, name: company }
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
    document.getElementById('resultSymbol').textContent = symbol;
    document.getElementById('resultCompany').textContent = company;
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
}
