/**
 * API密钥管理器
 * 
 * 提供API密钥轮询功能，避免单个密钥配额耗尽
 */

class ApiKeyManager {
  constructor(apiKeys) {
    // 支持单个密钥或多个密钥数组
    if (typeof apiKeys === 'string') {
      this.apiKeys = [apiKeys];
    } else if (Array.isArray(apiKeys)) {
      this.apiKeys = apiKeys.filter(key => key && key.trim());
    } else {
      this.apiKeys = [];
    }
    
    this.currentIndex = 0;
    this.failedKeys = new Set(); // 记录失败的密钥
    this.lastResetTime = Date.now();
    this.resetInterval = 24 * 60 * 60 * 1000; // 24小时重置失败记录
    
    console.log(`API密钥管理器初始化，共 ${this.apiKeys.length} 个密钥`);
  }
  
  /**
   * 获取当前可用的API密钥
   * @returns {string|null} API密钥
   */
  getCurrentKey() {
    this.resetFailedKeysIfNeeded();
    
    if (this.apiKeys.length === 0) {
      console.error('没有可用的API密钥');
      return null;
    }
    
    // 如果所有密钥都失败了，重置失败记录
    if (this.failedKeys.size >= this.apiKeys.length) {
      console.log('所有API密钥都已失败，重置失败记录');
      this.failedKeys.clear();
    }
    
    // 找到下一个可用的密钥
    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      const key = this.apiKeys[this.currentIndex];
      const keyPrefix = key ? key.substring(0, 10) + '...' : 'null';
      
      if (!this.failedKeys.has(this.currentIndex)) {
        console.log(`使用API密钥 [${this.currentIndex}]: ${keyPrefix}`);
        return key;
      }
      
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      attempts++;
    }
    
    console.error('没有可用的API密钥');
    return null;
  }
  
  /**
   * 标记当前密钥为失败
   * @param {Error} error 错误对象
   */
  markCurrentKeyAsFailed(error) {
    const isQuotaError = error && error.message && (
      error.message.includes('quota') ||
      error.message.includes('Too Many Requests') ||
      error.message.includes('429') ||
      error.message.includes('rate limit') ||
      error.message.includes('503') ||
      error.message.includes('Service Unavailable') ||
      error.message.includes('overloaded')
    );
    
    if (isQuotaError) {
      console.log(`标记API密钥 [${this.currentIndex}] 为失败（配额耗尽）`);
      this.failedKeys.add(this.currentIndex);
      
      // 切换到下一个密钥
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    } else {
      console.log(`API密钥 [${this.currentIndex}] 遇到非配额错误，不标记为失败`);
    }
  }
  
  /**
   * 获取下一个可用的API密钥
   * @returns {string|null} API密钥
   */
  getNextKey() {
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    return this.getCurrentKey();
  }
  
  /**
   * 重置失败的密钥记录（24小时后自动重置）
   */
  resetFailedKeysIfNeeded() {
    const now = Date.now();
    if (now - this.lastResetTime > this.resetInterval) {
      console.log('24小时已过，重置失败的API密钥记录');
      this.failedKeys.clear();
      this.lastResetTime = now;
    }
  }
  
  /**
   * 手动重置失败的密钥记录
   */
  resetFailedKeys() {
    console.log('手动重置失败的API密钥记录');
    this.failedKeys.clear();
    this.lastResetTime = Date.now();
  }
  
  /**
   * 获取状态信息
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      totalKeys: this.apiKeys.length,
      currentIndex: this.currentIndex,
      failedKeys: Array.from(this.failedKeys),
      availableKeys: this.apiKeys.length - this.failedKeys.size,
      lastResetTime: new Date(this.lastResetTime).toISOString()
    };
  }
}

module.exports = ApiKeyManager;
