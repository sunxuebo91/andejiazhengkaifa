/**
 * 设备检测工具
 * 用于检测设备类型、屏幕尺寸等信息
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallScreen: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  platform: 'ios' | 'android' | 'windows' | 'mac' | 'unknown';
}

export class DeviceDetector {
  /**
   * 检测是否为移动设备
   */
  static isMobile(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipod|android.*mobile|windows.*phone|blackberry.*mobile/i.test(userAgent);
  }

  /**
   * 检测是否为平板设备
   */
  static isTablet(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  }

  /**
   * 检测是否为桌面设备
   */
  static isDesktop(): boolean {
    return !this.isMobile() && !this.isTablet();
  }

  /**
   * 检测是否为小屏幕
   */
  static isSmallScreen(): boolean {
    return window.innerWidth < 768;
  }

  /**
   * 检测是否为iOS设备
   */
  static isIOS(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/i.test(userAgent);
  }

  /**
   * 检测是否为Android设备
   */
  static isAndroid(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android/i.test(userAgent);
  }

  /**
   * 检测是否在微信中
   */
  static isWeChat(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /micromessenger/i.test(userAgent);
  }

  /**
   * 检测是否在微信小程序WebView中
   */
  static isWeChatMiniProgram(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /miniprogram/i.test(userAgent);
  }

  /**
   * 获取屏幕方向
   */
  static getOrientation(): 'portrait' | 'landscape' {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  /**
   * 获取平台类型
   */
  static getPlatform(): 'ios' | 'android' | 'windows' | 'mac' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/i.test(userAgent)) {
      return 'ios';
    } else if (/android/i.test(userAgent)) {
      return 'android';
    } else if (/windows/i.test(userAgent)) {
      return 'windows';
    } else if (/mac/i.test(userAgent)) {
      return 'mac';
    }
    
    return 'unknown';
  }

  /**
   * 获取完整的设备信息
   */
  static getDeviceInfo(): DeviceInfo {
    return {
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: this.isDesktop(),
      isSmallScreen: this.isSmallScreen(),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      orientation: this.getOrientation(),
      platform: this.getPlatform(),
    };
  }

  /**
   * 获取最优的ZEGO配置
   */
  static getOptimalZegoConfig() {
    const isMobile = this.isMobile();
    const isSmallScreen = this.isSmallScreen();
    const networkType = this.getNetworkType();

    // 根据设备和网络类型选择分辨率
    let videoResolution = '720P';
    let frameRate = 30;
    let bitrate = 1500;

    if (isMobile || isSmallScreen) {
      // 移动设备根据网络类型调整
      if (networkType === 'slow-2g' || networkType === '2g') {
        videoResolution = '180P';
        frameRate = 15;
        bitrate = 200;
      } else if (networkType === '3g') {
        videoResolution = '360P';
        frameRate = 20;
        bitrate = 400;
      } else {
        // 4G/WiFi
        videoResolution = '360P';
        frameRate = 24;
        bitrate = 600;
      }
    }

    return {
      // 视频分辨率
      videoResolution,

      // 帧率
      frameRate,

      // 码率 (kbps)
      bitrate,

      // 布局模式
      layout: isMobile ? 'mobile' : 'desktop',

      // 是否使用前置摄像头
      useFrontFacingCamera: isMobile,

      // UI配置
      ui: {
        showScreenSharingButton: !isMobile, // 移动端隐藏屏幕共享
        showLayoutButton: !isMobile, // 移动端隐藏布局切换
        showAudioVideoSettingsButton: !isMobile, // 移动端隐藏设置
        showParticipantList: true,
        showChatButton: true,
      },
    };
  }

  /**
   * 获取ZEGO分辨率枚举值
   * @param ZegoUIKitPrebuilt - ZEGO SDK对象
   */
  static getZegoResolutionEnum(ZegoUIKitPrebuilt: any): any {
    const config = this.getOptimalZegoConfig();

    switch (config.videoResolution) {
      case '180P':
        return ZegoUIKitPrebuilt.VideoResolution_180P;
      case '360P':
        return ZegoUIKitPrebuilt.VideoResolution_360P;
      case '480P':
        return ZegoUIKitPrebuilt.VideoResolution_480P;
      case '720P':
        return ZegoUIKitPrebuilt.VideoResolution_720P;
      default:
        return ZegoUIKitPrebuilt.VideoResolution_360P;
    }
  }

  /**
   * 锁定屏幕方向
   */
  static async lockOrientation(orientation: 'portrait' | 'landscape' = 'portrait'): Promise<boolean> {
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock(orientation);
        console.log(`✅ 屏幕方向已锁定为: ${orientation}`);
        return true;
      }
      console.warn('⚠️ 当前浏览器不支持锁定屏幕方向');
      return false;
    } catch (error) {
      console.warn('⚠️ 无法锁定屏幕方向:', error);
      return false;
    }
  }

  /**
   * 解锁屏幕方向
   */
  static unlockOrientation(): void {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
        console.log('✅ 屏幕方向已解锁');
      }
    } catch (error) {
      console.warn('⚠️ 无法解锁屏幕方向:', error);
    }
  }

  /**
   * 监听屏幕方向变化
   */
  static onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): () => void {
    const handler = () => {
      const orientation = this.getOrientation();
      callback(orientation);
    };

    // 监听orientationchange事件
    window.addEventListener('orientationchange', handler);
    
    // 监听resize事件作为备选
    window.addEventListener('resize', handler);

    // 返回清理函数
    return () => {
      window.removeEventListener('orientationchange', handler);
      window.removeEventListener('resize', handler);
    };
  }

  /**
   * 检测网络类型
   */
  static getNetworkType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return connection.effectiveType || connection.type || 'unknown';
    }
    
    return 'unknown';
  }

  /**
   * 检测是否为慢速网络
   */
  static isSlowNetwork(): boolean {
    const networkType = this.getNetworkType();
    return ['slow-2g', '2g'].includes(networkType);
  }

  /**
   * 获取推荐的视频质量
   */
  static getRecommendedVideoQuality(): 'low' | 'medium' | 'high' {
    const isMobile = this.isMobile();
    const networkType = this.getNetworkType();
    
    // 慢速网络使用低质量
    if (this.isSlowNetwork()) {
      return 'low';
    }
    
    // 移动设备使用中等质量
    if (isMobile) {
      return 'medium';
    }
    
    // 4G或WiFi使用高质量
    if (['4g', 'wifi'].includes(networkType)) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * 打印设备信息(用于调试)
   */
  static logDeviceInfo(): void {
    const info = this.getDeviceInfo();
    const networkType = this.getNetworkType();
    const videoQuality = this.getRecommendedVideoQuality();
    
    console.group('📱 设备信息');
    console.log('设备类型:', info.isMobile ? '移动设备' : info.isTablet ? '平板' : '桌面');
    console.log('平台:', info.platform);
    console.log('屏幕尺寸:', `${info.screenWidth}x${info.screenHeight}`);
    console.log('屏幕方向:', info.orientation);
    console.log('是否小屏幕:', info.isSmallScreen);
    console.log('网络类型:', networkType);
    console.log('推荐视频质量:', videoQuality);
    console.log('是否微信:', this.isWeChat());
    console.log('是否小程序:', this.isWeChatMiniProgram());
    console.groupEnd();
  }
}

// 导出单例
export default DeviceDetector;

