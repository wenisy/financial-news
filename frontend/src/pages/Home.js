import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { articleAPI } from '../services/api';
import '../styles/Home.css';

const Home = () => {
  const { user, logout } = useAuth();
  const [inputRows, setInputRows] = useState([{ url: '', symbol: '', company: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractResult, setExtractResult] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showBatchInputModal, setShowBatchInputModal] = useState(false);
  const [batchInput, setBatchInput] = useState('');

  // 添加新行
  const addRow = () => {
    setInputRows([...inputRows, { url: '', symbol: '', company: '' }]);
  };

  // 删除行
  const removeRow = (index) => {
    if (inputRows.length > 1) {
      const newRows = [...inputRows];
      newRows.splice(index, 1);
      setInputRows(newRows);
    }
  };

  // 更新行数据
  const updateRowField = (index, field, value) => {
    const newRows = [...inputRows];
    newRows[index][field] = value;
    setInputRows(newRows);
  };

  // 打开批量输入弹窗
  const openBatchInputModal = () => {
    setShowBatchInputModal(true);
    setBatchInput('');
  };

  // 关闭批量输入弹窗
  const closeBatchInputModal = () => {
    setShowBatchInputModal(false);
  };

  // 处理批量输入
  const handleBatchInput = () => {
    if (!batchInput.trim()) {
      closeBatchInputModal();
      return;
    }

    // 分割输入的链接
    const urls = batchInput.split(',').map(url => url.trim()).filter(url => url);

    if (urls.length === 0) {
      closeBatchInputModal();
      return;
    }

    // 创建新的输入行
    const newRows = urls.map(url => ({ url, symbol: '', company: '' }));

    // 更新输入行
    setInputRows(newRows);

    // 关闭弹窗
    closeBatchInputModal();
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowResults(false);
    setExtractResult(null);

    // 验证输入
    const validRows = inputRows.filter(row => row.url.trim());

    if (validRows.length === 0) {
      setError('请输入至少一个新闻链接');
      return;
    }

    // 批量处理所有有效行
    await processBatchRows(validRows);
  };

  // 处理单个URL
  const processSingleUrl = async (url, initialSymbol = '', initialCompany = '') => {
    setLoading(true);

    try {
      // 如果用户已经输入了股票代码和公司名称，直接进行分析
      if (initialSymbol && initialCompany) {
        await performAnalysis(url, initialSymbol, initialCompany);
        return;
      }

      // 否则，先提取股票信息
      const response = await articleAPI.extractArticleInfo(url);

      setExtractResult({
        url,
        title: response.data.title,
        symbol: response.data.symbol || 'Market',
        company: response.data.company || 'Market'
      });
    } catch (err) {
      console.error('处理失败:', err);
      setError(err.response?.data?.message || '处理失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 批量处理输入行
  const processBatchRows = async (rows) => {
    setLoading(true);
    setBatchResults([]);

    try {
      const results = [];

      for (let i = 0; i < rows.length; i++) {
        const { url, symbol, company } = rows[i];

        if (!url.trim()) continue;

        try {
          // 提取股票信息
          let finalSymbol = symbol;
          let finalCompany = company;

          if (!symbol || !company) {
            try {
              const extractResponse = await articleAPI.extractArticleInfo(url);
              finalSymbol = symbol || extractResponse.data.symbol || 'Market';
              finalCompany = company || extractResponse.data.company || 'Market';
            } catch (extractErr) {
              console.error(`提取信息失败: ${url}`, extractErr);
              finalSymbol = symbol || 'Market';
              finalCompany = company || 'Market';
            }
          }

          // 分析文章
          const analyzeResponse = await articleAPI.analyzeArticle(url, finalSymbol, finalCompany);

          results.push({
            url,
            title: analyzeResponse.data.title,
            symbol: finalSymbol,
            company: finalCompany,
            publishDate: analyzeResponse.data.publishDate,
            summary: analyzeResponse.data.summary,
            sentiment: analyzeResponse.data.sentiment
          });
        } catch (err) {
          console.error(`处理URL失败: ${url}`, err);

          if (err.response?.data?.skipped) {
            // 文章已存在
            results.push({
              url,
              skipped: true,
              reason: '文章已存在于数据库中',
              symbol: symbol || 'Market',
              company: company || 'Market'
            });
          } else {
            // 其他错误
            results.push({
              url,
              error: err.response?.data?.message || '处理失败',
              symbol: symbol || 'Market',
              company: company || 'Market'
            });
          }
        }

        // 更新批量结果
        setBatchResults([...results]);
      }

      setShowResults(true);
    } catch (err) {
      console.error('批量处理失败:', err);
      setError(err.response?.data?.message || '批量处理失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 执行分析
  const performAnalysis = async (url, symbolValue, companyValue) => {
    setLoading(true);

    try {
      const response = await articleAPI.analyzeArticle(url, symbolValue, companyValue);

      setBatchResults([{
        url,
        title: response.data.title,
        symbol: symbolValue,
        company: companyValue,
        publishDate: response.data.publishDate,
        summary: response.data.summary,
        sentiment: response.data.sentiment
      }]);

      setShowResults(true);
    } catch (err) {
      console.error('分析失败:', err);

      if (err.response?.data?.skipped) {
        // 文章已存在
        setBatchResults([{
          url,
          skipped: true,
          reason: '文章已存在于数据库中',
          symbol: symbolValue,
          company: companyValue
        }]);

        setShowResults(true);
      } else {
        setError(err.response?.data?.message || '分析失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 确认提取结果
  const handleConfirmExtract = () => {
    if (!extractResult) return;

    performAnalysis(
      extractResult.url,
      extractResult.symbol,
      extractResult.company
    );

    setExtractResult(null);
  };

  // 查看摘要
  const handleViewSummary = (result) => {
    setSelectedResult(result);
    setShowSummaryModal(true);
  };

  return (
    <div className="home-container">
      <header className="app-header">
        <h1>金融新闻分析工具</h1>
        <div className="user-info">
          <span>欢迎, {user?.username}</span>
          <button onClick={logout} className="logout-btn">登出</button>
        </div>
      </header>

      <main className="main-content">
        <section className="form-section">
          <h2>分析新闻</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="table-container">
              <table className="input-table">
                <thead>
                  <tr>
                    <th>新闻链接</th>
                    <th>股票代码 (选填)</th>
                    <th>公司名称 (选填)</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {inputRows.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={row.url}
                          onChange={(e) => updateRowField(index, 'url', e.target.value)}
                          placeholder="https://finance.yahoo.com/news/..."
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.symbol}
                          onChange={(e) => updateRowField(index, 'symbol', e.target.value)}
                          placeholder="AAPL"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.company}
                          onChange={(e) => updateRowField(index, 'company', e.target.value)}
                          placeholder="Apple Inc."
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="remove-btn"
                          disabled={inputRows.length <= 1}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <div className="left-actions">
                <button
                  type="button"
                  onClick={addRow}
                  className="add-btn"
                >
                  添加新行
                </button>

                <button
                  type="button"
                  onClick={openBatchInputModal}
                  className="batch-btn"
                >
                  批量输入
                </button>
              </div>

              <button
                type="submit"
                className="analyze-btn"
                disabled={loading}
              >
                {loading ? '处理中...' : '分析新闻'}
              </button>
            </div>
          </form>
        </section>

        {/* 提取结果 */}
        {extractResult && (
          <section className="extract-result">
            <h3>提取结果</h3>
            <p>我们从文章中提取到以下信息：</p>

            <div className="extract-info">
              <div>
                <strong>文章标题：</strong>
                <span>{extractResult.title || '未知标题'}</span>
              </div>
              <div>
                <strong>股票代码：</strong>
                <span>{extractResult.symbol || '未找到'}</span>
              </div>
              <div>
                <strong>公司名称：</strong>
                <span>{extractResult.company || '未找到'}</span>
              </div>
            </div>

            <div className="extract-actions">
              <button onClick={handleConfirmExtract} className="confirm-btn">
                确认并继续分析
              </button>
              <button onClick={() => setExtractResult(null)} className="cancel-btn">
                取消
              </button>
            </div>
          </section>
        )}

        {/* 分析结果 */}
        {showResults && (
          <section className="results-section">
            <h3>分析结果</h3>

            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>标题</th>
                  <th>股票代码</th>
                  <th>公司名称</th>
                  <th>发布日期</th>
                  <th>情感分析</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map((result, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="title-cell" title={result.title || result.url}>
                      {result.error ? '处理失败' :
                       result.skipped ? '已跳过' :
                       result.title || '未知标题'}
                    </td>
                    <td>{result.symbol}</td>
                    <td>{result.company}</td>
                    <td>
                      {result.error || result.skipped ? 'N/A' :
                       result.publishDate ? new Date(result.publishDate).toLocaleString() : '未知日期'}
                    </td>
                    <td>
                      {result.error ? (
                        <span className="error">{result.error}</span>
                      ) : result.skipped ? (
                        <span className="skipped">{result.reason}</span>
                      ) : (
                        <span className={`sentiment ${
                          result.sentiment === '好' || result.sentiment === '积极' ? 'good' :
                          result.sentiment === '中立' ? 'neutral' : 'bad'
                        }`}>
                          {result.sentiment || '未知'}
                        </span>
                      )}
                    </td>
                    <td>
                      {result.error ? (
                        <button
                          onClick={() => processSingleUrl(result.url)}
                          className="action-btn"
                        >
                          重试
                        </button>
                      ) : result.skipped ? (
                        <button
                          onClick={() => performAnalysis(result.url, result.symbol, result.company)}
                          className="action-btn"
                        >
                          强制分析
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewSummary(result)}
                          className="view-summary-btn"
                        >
                          查看摘要
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>

      {/* 摘要模态框 */}
      {showSummaryModal && selectedResult && (
        <div className="modal-backdrop" onClick={() => setShowSummaryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <span className="close-modal" onClick={() => setShowSummaryModal(false)}>&times;</span>
            <h3>{selectedResult.title || '未知标题'}</h3>
            <div className="modal-info">
              <div>
                <strong>股票代码：</strong>
                <span>{selectedResult.symbol}</span>
              </div>
              <div>
                <strong>公司名称：</strong>
                <span>{selectedResult.company}</span>
              </div>
              <div>
                <strong>发布日期：</strong>
                <span>
                  {selectedResult.publishDate
                    ? new Date(selectedResult.publishDate).toLocaleString()
                    : '未知日期'}
                </span>
              </div>
              <div>
                <strong>情感分析：</strong>
                <span className={`sentiment ${
                  selectedResult.sentiment === '好' || selectedResult.sentiment === '积极' ? 'good' :
                  selectedResult.sentiment === '中立' ? 'neutral' : 'bad'
                }`}>
                  {selectedResult.sentiment || '未知'}
                </span>
              </div>
              <div className="summary-content">
                <strong>摘要：</strong>
                <p>{selectedResult.summary || '无摘要'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量输入弹窗 */}
      {showBatchInputModal && (
        <div className="modal-backdrop" onClick={closeBatchInputModal}>
          <div className="modal-content batch-input-modal" onClick={e => e.stopPropagation()}>
            <span className="close-modal" onClick={closeBatchInputModal}>&times;</span>
            <h3>批量输入新闻链接</h3>
            <p className="modal-description">请输入多个新闻链接，用逗号分隔（例如：a.com,b.com）</p>

            <div className="batch-input-container">
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="https://finance.yahoo.com/news/...,https://finance.yahoo.com/news/..."
                rows={6}
              />
            </div>

            <div className="modal-actions">
              <button onClick={closeBatchInputModal} className="cancel-btn">取消</button>
              <button onClick={handleBatchInput} className="confirm-btn">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
