/**
 * 视频面试 API 调用工具
 * 用于小程序调用后端面试间接口
 */

const BASE_URL = 'https://crm.andejiazheng.com/api/interview';

/**
 * 通用请求方法
 */
function request(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('access_token') || wx.getStorageSync('token');
    
    if (!token) {
      reject(new Error('未登录，请先登录'));
      return;
    }

    const options = {
      url: `${BASE_URL}${url}`,
      method: method,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log(`✅ API 请求成功: ${method} ${url}`, res.data);
        if (res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (err) => {
        console.error(`❌ API 请求失败: ${method} ${url}`, err);
        reject(new Error(err.errMsg || '网络错误'));
      }
    };

    if (data && method !== 'GET') {
      options.data = data;
    }

    wx.request(options);
  });
}

/**
 * 1️⃣ 保存面试间（H5 创建房间后调用）
 * 
 * @param {string} roomId - 房间ID
 * @param {string} inviteLink - 邀请链接
 * @returns {Promise<{success: boolean, message: string, data: {roomId: string, inviteLink: string}}>}
 * 
 * @example
 * saveInterviewRoom('room_1763717963708_abc123', 'https://crm.andejiazheng.com/miniprogram/video-interview-guest.html?roomId=room_1763717963708_abc123')
 *   .then(res => console.log('保存成功:', res.data))
 *   .catch(err => console.error('保存失败:', err));
 */
function saveInterviewRoom(roomId, inviteLink) {
  return request('/create-room', 'POST', {
    roomId: roomId,
    inviteLink: inviteLink
  });
}

/**
 * 2️⃣ 获取最新的活跃面试间
 * 
 * @returns {Promise<{success: boolean, data: {roomId: string, inviteLink: string, roomName: string, createdAt: string}}>}
 * 
 * @example
 * getLatestRoom()
 *   .then(res => {
 *     if (res.success) {
 *       console.log('最新面试间:', res.data.roomId);
 *       console.log('邀请链接:', res.data.inviteLink);
 *     } else {
 *       console.log('没有活跃的面试间');
 *     }
 *   })
 *   .catch(err => console.error('获取失败:', err));
 */
function getLatestRoom() {
  return request('/latest-room', 'GET');
}

/**
 * 3️⃣ 获取面试间列表
 * 
 * @param {Object} params - 查询参数
 * @param {string} params.status - 状态：'active' 或 'ended'
 * @param {number} params.page - 页码（默认1）
 * @param {number} params.pageSize - 每页数量（默认10）
 * @returns {Promise}
 */
function getRoomList(params = {}) {
  const query = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
  return request(`/rooms?${query}`, 'GET');
}

/**
 * 4️⃣ 结束面试间
 * 
 * @param {string} roomId - 房间ID
 * @returns {Promise}
 */
function endRoom(roomId) {
  return request(`/rooms/${roomId}/end`, 'POST');
}

// 导出方法
module.exports = {
  saveInterviewRoom,
  getLatestRoom,
  getRoomList,
  endRoom
};

