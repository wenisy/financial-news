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

// 存储批量分析的结果
let batchResults = [];

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
    const urlInput = document.getElementById('newsUrl').value.trim();
    const symbol = document.getElementById('symbol').value.trim();
    const name = document.getElementById('companyName').value.trim();
    const isBatchMode = document.getElementById('batchMode').checked;

    // 检查是否是批量模式
    if (isBatchMode) {
      // 分割URL，处理多个链接
      const urls = urlInput.split(',').map(url => url.trim()).filter(url => url);

      if (urls.length === 0) {
        errorDiv.textContent = '请输入至少一个有效的新闻链接';
        errorDiv.style.display = 'block';
        return;
      }

      if (urls.length === 1) {
        // 如果只有一个URL，使用单个处理模式
        processSingleUrl(urls[0], symbol, name, analyzeBtn, extractResultDiv, analyzeResultDiv, errorDiv);
      } else {
        // 批量处理多个URL
        processBatchUrls(urls, symbol, name, analyzeBtn, analyzeResultDiv, errorDiv);
      }
    } else {
      // 单个URL处理模式
      processSingleUrl(urlInput, symbol, name, analyzeBtn, extractResultDiv, analyzeResultDiv, errorDiv);
    }

    // 重置显示
    extractResultDiv.style.display = 'none';
    analyzeResultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
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

  // 绑定模态框关闭按钮
  document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('summaryModal').style.display = 'none';
  });

  // 点击模态框外部关闭
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('summaryModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * 处理单个URL
 * @param {string} url - 新闻URL
 * @param {string} symbol - 股票代码
 * @param {string} name - 公司名称
 * @param {HTMLElement} analyzeBtn - 分析按钮
 * @param {HTMLElement} extractResultDiv - 提取结果区域
 * @param {HTMLElement} analyzeResultDiv - 分析结果区域
 * @param {HTMLElement} errorDiv - 错误信息区域
 */
async function processSingleUrl(url, symbol, name, analyzeBtn, extractResultDiv, analyzeResultDiv, errorDiv) {
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
}

/**
 * 处理批量URL
 * @param {string[]} urls - 新闻URL数组
 * @param {string} symbol - 股票代码
 * @param {string} name - 公司名称
 * @param {HTMLElement} analyzeBtn - 分析按钮
 * @param {HTMLElement} analyzeResultDiv - 分析结果区域
 * @param {HTMLElement} errorDiv - 错误信息区域
 */
async function processBatchUrls(urls, symbol, name, analyzeBtn, analyzeResultDiv, errorDiv) {
  // 重置批量结果
  batchResults = [];

  // 显示加载状态
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = `批量分析中 (0/${urls.length}) <span class="loading"></span>`;

  // 获取批量结果容器
  const batchResultsDiv = document.getElementById('batchResults');
  batchResultsDiv.innerHTML = '';

  // 显示单个结果区域或批量结果区域
  document.getElementById('singleResult').style.display = 'none';
  batchResultsDiv.style.display = 'block';

  try {
    // 依次处理每个URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      // 更新进度
      analyzeBtn.innerHTML = `批量分析中 (${i+1}/${urls.length}) <span class="loading"></span>`;

      try {
        // 提取股票信息（如果用户没有提供）
        let finalSymbol = symbol;
        let finalCompany = name;

        if (!symbol || !name) {
          // 提取股票信息
          const extractResponse = await fetch('/api/articles/extract', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ url })
          });

          if (extractResponse.ok) {
            const extractData = await extractResponse.json();
            finalSymbol = symbol || extractData.symbol || '';
            finalCompany = name || extractData.company || '';
          }
        }

        // 如果有股票信息，进行分析
        if (finalSymbol && finalCompany) {
          // 分析文章
          const result = await analyzeArticle(url, finalSymbol, finalCompany);

          // 检查是否跳过（文章已存在）
          if (result.skipped && result.reason === 'article_exists') {
            // 添加到批量结果（已存在）
            batchResults.push({
              url,
              symbol: finalSymbol,
              company: finalCompany,
              skipped: true,
              reason: '文章已存在于数据库中'
            });
          } else {
            // 添加到批量结果
            batchResults.push({
              url,
              symbol: finalSymbol,
              company: finalCompany,
              title: result.title,
              publishDate: result.publishDate,
              summary: result.summary,
              sentiment: result.sentiment
            });
          }

          // 更新批量结果显示
          updateBatchResultsDisplay();
        } else {
          // 添加错误结果
          batchResults.push({
            url,
            error: '无法提取股票信息'
          });

          // 更新批量结果显示
          updateBatchResultsDisplay();
        }
      } catch (error) {
        console.error(`处理URL失败: ${url}`, error);

        // 添加错误结果
        batchResults.push({
          url,
          error: error.message
        });

        // 更新批量结果显示
        updateBatchResultsDisplay();
      }
    }

    // 显示分析结果区域
    analyzeResultDiv.style.display = 'block';
  } catch (error) {
    console.error('批量处理失败:', error);

    // 如果是认证错误，退出登录
    if (error.message.includes('认证') || error.message.includes('令牌') || error.message.includes('token')) {
      logout();
      errorDiv.textContent = '登录已过期，请重新登录';
    } else {
      errorDiv.textContent = `批量处理失败: ${error.message}`;
    }

    errorDiv.style.display = 'block';
  } finally {
    // 恢复按钮状态
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '分析新闻';
  }
}

/**
 * 更新批量结果显示
 */
function updateBatchResultsDisplay() {
  const batchResultsDiv = document.getElementById('batchResults');
  const batchResultsBody = document.getElementById('batchResultsBody');
  batchResultsBody.innerHTML = '';

  // 为每个结果创建表格行
  batchResults.forEach((result, index) => {
    const row = document.createElement('tr');

    if (result.error) {
      // 显示错误结果
      row.innerHTML = `
        <td>${index + 1}</td>
        <td colspan="5" class="error">
          <div>${result.url}</div>
          <div>错误: ${result.error}</div>
        </td>
        <td>
          <button class="action-btn" onclick="retryAnalysis(${index})">重试</button>
        </td>
      `;
    } else if (result.skipped) {
      // 显示跳过结果
      row.innerHTML = `
        <td>${index + 1}</td>
        <td class="title-cell" title="${result.url}">${result.url}</td>
        <td>${result.symbol || 'N/A'}</td>
        <td>${result.company || 'N/A'}</td>
        <td>N/A</td>
        <td class="success">${result.reason}</td>
        <td>
          <button class="action-btn" onclick="forceAnalysis(${index})">强制分析</button>
        </td>
      `;
    } else {
      // 显示成功结果
      const sentimentClass = result.sentiment === '好' || result.sentiment === '积极' ? 'good' :
                            result.sentiment === '中立' ? 'neutral' : 'bad';

      row.innerHTML = `
        <td>${index + 1}</td>
        <td class="title-cell" title="${result.title || '未知标题'}">${result.title || '未知标题'}</td>
        <td>${result.symbol}</td>
        <td>${result.company}</td>
        <td>${result.publishDate ? new Date(result.publishDate).toLocaleString() : '未知日期'}</td>
        <td><span class="sentiment ${sentimentClass}">${result.sentiment || '未知'}</span></td>
        <td>
          <button class="view-summary-btn" onclick="viewSummary(${index})">查看摘要</button>
        </td>
      `;
    }

    batchResultsBody.appendChild(row);
  });

  // 显示批量结果区域
  batchResultsDiv.style.display = 'block';
}

/**
 * 查看摘要
 * @param {number} index 结果索引
 */
function viewSummary(index) {
  const result = batchResults[index];
  if (!result) return;

  // 填充模态框内容
  document.getElementById('modalTitle').textContent = result.title || '未知标题';
  document.getElementById('modalSymbol').textContent = result.symbol;
  document.getElementById('modalCompany').textContent = result.company;
  document.getElementById('modalSummary').textContent = result.summary || '无摘要';

  // 显示模态框
  document.getElementById('summaryModal').style.display = 'block';
}

/**
 * 重试分析
 * @param {number} index 结果索引
 */
function retryAnalysis(index) {
  const result = batchResults[index];
  if (!result) return;

  // 获取URL和其他信息
  const url = result.url;

  // 重新提取和分析
  processSingleUrl(
    url,
    '',
    '',
    document.getElementById('analyzeBtn'),
    document.getElementById('extractResult'),
    document.getElementById('analyzeResult'),
    document.getElementById('analyzeError')
  );
}

/**
 * 强制分析
 * @param {number} index 结果索引
 */
function forceAnalysis(index) {
  const result = batchResults[index];
  if (!result) return;

  // 获取URL和其他信息
  const url = result.url;
  const symbol = result.symbol || 'Market';
  const company = result.company || 'Market';

  // 直接分析，跳过检查
  performAnalysis(url, symbol, company);
}

/**
 * 分析文章
 * @param {string} url - 新闻URL
 * @param {string} symbol - 股票代码
 * @param {string} company - 公司名称
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeArticle(url, symbol, company) {
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
  return data;
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
    // 显示单个结果区域
    document.getElementById('singleResult').style.display = 'block';
    document.getElementById('batchResults').style.display = 'none';

    // 分析文章
    const data = await analyzeArticle(url, symbol, company);

    // 检查是否跳过（文章已存在）
    if (data.skipped && data.reason === 'article_exists') {
      errorDiv.className = 'success';
      errorDiv.textContent = '该文章已经分析过，已存在于数据库中';
      errorDiv.style.display = 'block';
      return;
    }

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
