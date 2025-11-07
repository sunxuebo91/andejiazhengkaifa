/**
 * 设备检测工具
 * 用于判断用户设备类型并自动跳转到对应版本
 */

/**
 * 检测是否为移动设备
 */
export const isMobileDevice = (): boolean => {
  // 检测 User Agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // 移动设备的 User Agent 特征
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  // 检测屏幕宽度
  const isMobileScreen = window.innerWidth <= 768;
  
  // 检测触摸屏
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return mobileRegex.test(userAgent) || (isMobileScreen && isTouchDevice);
};

/**
 * 检测是否在微信内置浏览器中
 */
export const isWeChatBrowser = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /micromessenger/.test(userAgent);
};

/**
 * 检测是否在微信小程序 WebView 中
 */
export const isWeChatMiniProgram = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /miniprogram/.test(userAgent) || (window as any).__wxjs_environment === 'miniprogram';
};

/**
 * 检测是否为 iOS 设备
 */
export const isIOS = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
};

/**
 * 检测是否为 Android 设备
 */
export const isAndroid = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
};

/**
 * 检测是否为平板设备
 */
export const isTablet = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /ipad|android(?!.*mobile)|tablet/.test(userAgent);
};

/**
 * 获取设备类型
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isTablet()) return 'tablet';
  if (isMobileDevice()) return 'mobile';
  return 'desktop';
};

/**
 * 获取设备信息
 */
export const getDeviceInfo = () => {
  return {
    isMobile: isMobileDevice(),
    isWeChatBrowser: isWeChatBrowser(),
    isWeChatMiniProgram: isWeChatMiniProgram(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isTablet: isTablet(),
    deviceType: getDeviceType(),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent,
  };
};

/**
 * 根据设备类型自动跳转
 * @param roomId 房间ID
 * @param type 页面类型：'join' | 'video'
 */
export const redirectToDeviceVersion = (roomId: string, type: 'join' | 'video' = 'join') => {
  const deviceInfo = getDeviceInfo();
  
  console.log('📱 设备信息:', deviceInfo);
  
  // 如果是移动设备，跳转到移动端版本
  if (deviceInfo.isMobile || deviceInfo.isTablet) {
    const mobileUrl = type === 'join' 
      ? `/interview/join-mobile/${roomId}`
      : `/interview/video-mobile/${roomId}`;
    
    console.log('📱 检测到移动设备，跳转到移动端版本:', mobileUrl);
    window.location.href = mobileUrl;
    return true;
  }
  
  return false;
};

/**
 * 在组件中使用的 Hook
 */
export const useDeviceDetect = () => {
  const deviceInfo = getDeviceInfo();
  
  return {
    ...deviceInfo,
    redirectToMobile: (roomId: string, type: 'join' | 'video' = 'join') => {
      return redirectToDeviceVersion(roomId, type);
    },
  };
};

