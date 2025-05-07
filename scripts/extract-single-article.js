/**
 * 从单个URL提取文章内容的测试脚本
 * 
 * 使用方法:
 * node scripts/extract-single-article.js <文章URL>
 * 
 * 例如:
 * node scripts/extract-single-article.js https://finance.yahoo.com/news/nvidia-stock-split-details-130004895.html
 */

require('dotenv').config();
const cheerio = require('cheerio');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * 主函数
 */
async function main() {
  try {
    // 获取命令行参数中的URL
    const url = process.argv[2];
    
    if (!url) {
      console.error('错误: 请提供文章URL');
      console.error('使用方法: node scripts/extract-single-article.js <文章URL>');
      process.exit(1);
    }
    
    console.log(`开始从URL提取文章内容: ${url}`);
    
    // 使用curl获取文章内容
    const article = await fetchWithCurl(url);
    
    console.log('\n提取结果:');
    console.log(`标题: ${article.title}`);
    console.log(`发布日期: ${article.publishDate}`);
    console.log(`来源: ${article.source}`);
    console.log(`内容长度: ${article.content.length} 字符`);
    console.log('\n内容预览:');
    console.log('-----------------------------------');
    console.log(article.content.substring(0, 500) + '...');
    console.log('-----------------------------------');
    
    // 保存提取的内容到文件
    const outputFile = path.join(__dirname, '../extracted_article.txt');
    await fs.writeFile(outputFile, 
      `URL: ${url}\n\n` +
      `标题: ${article.title}\n\n` +
      `发布日期: ${article.publishDate}\n\n` +
      `来源: ${article.source}\n\n` +
      `内容:\n${article.content}`
    );
    console.log(`\n文章内容已保存到: ${outputFile}`);
    
  } catch (error) {
    console.error('提取文章内容失败:', error);
  }
}

/**
 * 使用curl获取页面内容并解析为文章对象
 * @param {string} url 页面URL
 * @returns {Promise<Object>} 文章对象
 */
async function fetchWithCurl(url) {
  // 创建临时文件路径
  const tempFile = path.join(__dirname, '../temp_content.html');
  
  // 构建curl命令
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const curlCommand = `curl -s -A "${userAgent}" -L "${url}" -o "${tempFile}"`;
  
  try {
    console.log('执行curl命令...');
    
    // 执行curl命令
    await new Promise((resolve, reject) => {
      exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
    
    // 读取下载的文件
    console.log('读取下载的内容...');
    const htmlContent = await fs.readFile(tempFile, 'utf8');
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(htmlContent);
    
    // 获取页面标题
    const title = $('title').text().trim() || $('h1').first().text().trim();
    
    // 获取发布日期
    let publishDate = '';
    const timeElement = $('time').first();
    if (timeElement.length) {
      publishDate = timeElement.attr('datetime') || timeElement.text().trim();
    }
    
    // 如果找不到日期，使用当前日期
    if (!publishDate) {
      publishDate = new Date().toISOString();
    }
    
    // 获取文章内容
    let content = '';
    
    // 针对Yahoo Finance的特定选择器
    if (url.includes('finance.yahoo.com')) {
      console.log('检测到Yahoo Finance文章，使用特定选择器...');
      
      // 尝试视频描述
      const videoDescription = $('.caas-description').text().trim();
      if (videoDescription) {
        console.log('找到视频描述');
        content += videoDescription + '\n\n';
      }
      
      // 尝试文章正文
      const articleBody = $('.caas-body');
      if (articleBody.length) {
        console.log('找到文章正文');
        articleBody.find('p').each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            content += text + '\n\n';
          }
        });
      }
    }
    
    // 如果上面的方法没有找到内容，尝试通用选择器
    if (!content) {
      console.log('使用通用选择器...');
      
      // 尝试多种可能的文章内容选择器
      const selectors = [
        'article',
        '.article-content',
        '.article-body',
        '.story-body',
        '.story-content',
        '.news-content',
        '.post-content',
        '.entry-content',
        '.content',
        'main'
      ];
      
      let articleElement = null;
      
      // 尝试找到文章内容元素
      for (const selector of selectors) {
        if ($(selector).length) {
          console.log(`找到选择器: ${selector}`);
          articleElement = $(selector);
          break;
        }
      }
      
      // 如果找不到特定元素，使用body
      if (!articleElement) {
        console.log('未找到特定元素，使用body');
        articleElement = $('body');
      }
      
      // 获取所有段落
      articleElement.find('p').each((_, p) => {
        const text = $(p).text().trim();
        // 过滤掉太短的段落和可能的广告/导航
        if (text.length > 30 &&
            !$(p).parents('nav').length &&
            !$(p).parents('header').length &&
            !$(p).parents('footer').length &&
            !$(p).parents('.ad').length &&
            !$(p).parents('.advertisement').length) {
          content += text + '\n\n';
        }
      });
    }
    
    // 如果仍然没有内容，尝试获取所有文本
    if (!content) {
      console.log('未找到结构化内容，提取所有文本');
      content = $('body').text().replace(/\s+/g, ' ').trim();
    }
    
    // 清理临时文件
    try {
      await fs.unlink(tempFile);
    } catch (unlinkError) {
      console.error('清理临时文件失败:', unlinkError);
    }
    
    return {
      title,
      url,
      content,
      publishDate: new Date(publishDate),
      source: new URL(url).hostname
    };
  } catch (error) {
    console.error('使用curl获取内容失败:', error);
    throw error;
  }
}

// 执行主函数
main();
