// 视频面试页面
Page({
  data: {
    webviewUrl: '',
    roomId: ''
  },

  onLoad(options) {
    console.log('📱 视频面试页面加载', options);

    // 从页面参数获取房间ID
    const roomId = options.roomId || '';

    if (!roomId) {
      wx.showToast({
        title: '房间号不能为空',
        icon: 'none',
        duration: 2000
      });

      // 2秒后返回
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
      return;
    }

    // 构建 H5 页面 URL - 使用HR主持人移动端页面
    const h5Url = `https://crm.andejiazheng.com/interview/video-mobile/${roomId}`;

    console.log('📱 加载视频面试页面:', h5Url);

    this.setData({
      webviewUrl: h5Url,
      roomId: roomId
    });
  },

  // 接收 H5 页面发送的消息
  handleMessage(e) {
    console.log('📥 收到H5消息:', e.detail.data);
    
    // 处理不同的消息类型
    const messages = e.detail.data;
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      console.log('📥 处理消息:', lastMessage);
      
      switch (lastMessage.type) {
        case 'joined':
          // 用户成功加入视频通话
          console.log('✅ 用户已加入视频面试');
          wx.showToast({
            title: '已加入视频面试',
            icon: 'success',
            duration: 1500
          });
          break;
          
        case 'leave':
          // 用户离开视频通话，返回上一页
          console.log('👋 用户离开视频面试');
          wx.showToast({
            title: '已离开视频面试',
            icon: 'success',
            duration: 1000
          });
          
          // 延迟返回，让用户看到提示
          setTimeout(() => {
            wx.navigateBack({
              delta: 1
            });
          }, 1000);
          break;
          
        case 'error':
          // 发生错误
          console.error('❌ 视频面试错误:', lastMessage.message);
          wx.showToast({
            title: lastMessage.message || '发生错误',
            icon: 'none',
            duration: 2000
          });
          break;
          
        default:
          console.log('📥 未知消息类型:', lastMessage.type);
      }
    }
  },

  onShow() {
    console.log('📱 视频面试页面显示');
  },

  onHide() {
    console.log('📱 视频面试页面隐藏');
  },

  onUnload() {
    console.log('📱 视频面试页面卸载');
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '视频面试邀请',
      path: `/pages/interview/interview?roomId=${this.data.roomId}`,
      imageUrl: '/images/share-interview.png' // 需要准备分享图片
    };
  },

  // 分享到朋友圈（需要开通权限）
  onShareTimeline() {
    return {
      title: '视频面试邀请',
      query: `roomId=${this.data.roomId}`,
      imageUrl: '/images/share-interview.png'
    };
  }
});

