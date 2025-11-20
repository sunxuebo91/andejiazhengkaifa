/**
 * 小程序 H5 页面访问日志记录器
 * 自动发送访问日志到后端
 */
(function() {
  'use strict';

  // 获取当前页面信息
  const pageInfo = {
    url: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    fileName: window.location.pathname.split('/').pop() || 'unknown',
    timestamp: new Date().toISOString(),
    loadTime: Date.now(),
  };

  // 获取环境信息
  const userAgent = navigator.userAgent || 'unknown';
  const isWechat = /MicroMessenger/i.test(userAgent);
  const isMiniProgram = /miniProgram/i.test(userAgent) || window.__wxjs_environment === 'miniprogram';
  
  // 判断环境类型
  let environment = '普通浏览器';
  if (isMiniProgram) {
    environment = '小程序WebView';
  } else if (isWechat) {
    environment = '微信浏览器';
  }

  // 解析 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const queryParams = {};
  urlParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // 构建日志数据
  const logData = {
    ...pageInfo,
    userAgent,
    isWechat,
    isMiniProgram,
    environment,
    queryParams,
    referrer: document.referrer || 'direct',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language || 'unknown',
  };

  // 🔥 在控制台输出详细日志（便于调试）
  console.log('%c╔════════════════════════════════════════════════════════════════', 'color: #5fb3a3; font-weight: bold;');
  console.log('%c║ 📊 页面访问日志', 'color: #5fb3a3; font-weight: bold;');
  console.log('%c╠════════════════════════════════════════════════════════════════', 'color: #5fb3a3; font-weight: bold;');
  console.log('%c║ 📄 访问文件:', pageInfo.fileName, 'color: #333;');
  console.log('%c║ 🔗 完整URL:', pageInfo.url, 'color: #333;');
  console.log('%c║ 🌐 环境:', environment, 'color: #333;');
  console.log('%c║ 📋 Query参数:', JSON.stringify(queryParams), 'color: #333;');
  console.log('%c║ 🕐 时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }), 'color: #333;');
  console.log('%c╚════════════════════════════════════════════════════════════════', 'color: #5fb3a3; font-weight: bold;');

  // 🔥 发送日志到后端（异步，不阻塞页面加载）
  function sendLogToBackend() {
    const apiUrl = 'https://crm.andejiazheng.com/api/miniprogram-access-log';
    
    // 使用 fetch 发送日志（不等待响应）
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
      // 使用 keepalive 确保即使页面关闭也能发送
      keepalive: true,
    }).then(response => {
      if (response.ok) {
        console.log('✅ 访问日志已发送到后端');
      } else {
        console.warn('⚠️ 访问日志发送失败:', response.status);
      }
    }).catch(error => {
      console.warn('⚠️ 访问日志发送失败:', error.message);
    });
  }

  // 页面加载完成后发送日志
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendLogToBackend);
  } else {
    // DOM 已经加载完成
    sendLogToBackend();
  }

  // 页面卸载时也发送一次（记录停留时间）
  window.addEventListener('beforeunload', function() {
    const stayDuration = Date.now() - pageInfo.loadTime;
    const unloadLogData = {
      ...logData,
      event: 'page_unload',
      stayDuration: stayDuration, // 停留时间（毫秒）
      stayDurationSeconds: Math.round(stayDuration / 1000), // 停留时间（秒）
    };

    // 使用 sendBeacon 确保日志能发送出去
    const apiUrl = 'https://crm.andejiazheng.com/api/miniprogram-access-log';
    const blob = new Blob([JSON.stringify(unloadLogData)], { type: 'application/json' });
    navigator.sendBeacon(apiUrl, blob);
  });

  // 暴露到全局（便于调试）
  window.__pageAccessLog = logData;
})();

