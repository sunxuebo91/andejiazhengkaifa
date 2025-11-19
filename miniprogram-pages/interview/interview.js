// 视频面试页面
Page({
  data: {
    webviewUrl: '',
    roomId: ''
  },

  onLoad(options) {
    console.log('📱 [小程序] 视频面试页面加载', options);

    // 从页面参数获取房间ID
    const roomId = options.roomId || '';

    if (!roomId) {
      wx.showModal({
        title: '提示',
        content: '房间号不能为空',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    // 获取Token和用户信息
    const token = wx.getStorageSync('access_token') || wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo') || {};
    const userName = userInfo.name || userInfo.realName || userInfo.username || '用户';

    console.log('📱 [小程序] 获取到Token:', token ? '✅ 已获取' : '❌ 未获取');
    console.log('📱 [小程序] 用户名:', userName);

    // 构建 H5 页面 URL
    let h5Url = `https://crm.andejiazheng.com/interview/h5-entry?roomId=${roomId}`;

    if (token) {
      h5Url += `&token=${encodeURIComponent(token)}`;
    }

    if (userName) {
      h5Url += `&userName=${encodeURIComponent(userName)}`;
    }

    console.log('📱 [小程序] H5 URL:', h5Url);

    // 保存数据
    this.setData({
      webviewUrl: h5Url,
      roomId: roomId
    });

    // 🔥 关键修改：直接在外部浏览器中打开（支持 WebRTC）
    wx.showModal({
      title: '视频面试',
      content: '即将在浏览器中打开视频面试页面',
      confirmText: '打开',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          console.log('📱 [小程序] 在外部浏览器中打开:', h5Url);

          // 使用 wx.openUrl 在外部浏览器中打开
          wx.openUrl({
            url: h5Url,
            success: () => {
              console.log('✅ 成功打开外部浏览器');
              // 返回上一页
              wx.navigateBack();
            },
            fail: (err) => {
              console.error('❌ 打开外部浏览器失败:', err);

              // 降级方案：复制链接
              wx.setClipboardData({
                data: h5Url,
                success: () => {
                  wx.showModal({
                    title: '链接已复制',
                    content: '请在浏览器中粘贴打开',
                    showCancel: false,
                    success: () => {
                      wx.navigateBack();
                    }
                  });
                }
              });
            }
          });
        } else {
          console.log('📱 [小程序] 用户取消');
          wx.navigateBack();
        }
      }
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
        case 'roomCreated':
          // 🔥 房间创建成功
          console.log('✅ 面试间创建成功:', lastMessage.roomId);
          console.log('📤 访客H5链接: https://crm.andejiazheng.com/miniprogram/video-interview-guest.html?roomId=' + lastMessage.roomId);
          break;

        case 'triggerShare':
          // 🔥 触发分享
          console.log('📤 触发分享:', lastMessage);
          console.log('📤 访客链接:', lastMessage.inviteLink);
          break;

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

