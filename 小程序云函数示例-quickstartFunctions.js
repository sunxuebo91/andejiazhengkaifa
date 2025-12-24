/**
 * 小程序云函数示例 - quickstartFunctions
 * 
 * 部署位置: cloudfunctions/quickstartFunctions/index.js
 * 
 * 功能: 接收CRM端的通知请求，发送订阅消息给用户
 */

const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV  // 使用当前云环境
});

// 获取数据库引用
const db = cloud.database();

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  console.log('📥 收到云函数调用:', event);

  const { type, notificationData } = event;

  // 处理客户分配通知
  if (type === 'sendCustomerAssignNotify') {
    return await sendCustomerAssignNotification(notificationData);
  }

  return {
    success: false,
    message: '未知的操作类型',
    type: type
  };
};

/**
 * 发送客户分配订阅消息
 */
async function sendCustomerAssignNotification(notificationData) {
  try {
    console.log('📱 准备发送客户分配通知:', notificationData);

    const {
      assignedToId,    // 被分配人的用户ID
      customerName,    // 客户姓名
      source,          // 分配原因
      assignerName,    // 分配人姓名
      customerId,      // 客户ID
      assignTime       // 分配时间
    } = notificationData;

    // 1. 根据用户ID查询用户的openid
    // 注意: 这里需要从你的用户表中查询openid
    // 假设你有一个 users 集合，存储了 userId 和 openid 的映射
    const userResult = await db.collection('users')
      .where({
        _id: assignedToId  // 或者使用其他字段，如 userId: assignedToId
      })
      .get();

    if (!userResult.data || userResult.data.length === 0) {
      console.error('❌ 未找到用户:', assignedToId);
      return {
        success: false,
        message: '未找到用户'
      };
    }

    const user = userResult.data[0];
    const openid = user.openid || user.wechatOpenId;

    if (!openid) {
      console.error('❌ 用户未绑定微信:', assignedToId);
      return {
        success: false,
        message: '用户未绑定微信'
      };
    }

    console.log('✅ 找到用户openid:', openid);

    // 2. 发送订阅消息
    // 注意: 需要在小程序后台配置订阅消息模板
    const templateId = 'YOUR_TEMPLATE_ID_HERE';  // 替换为实际的模板ID

    // 格式化时间
    const formattedTime = new Date(assignTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: templateId,
      page: `pages/customer/detail?id=${customerId}`,  // 跳转到客户详情页
      data: {
        // 根据你的模板配置调整字段
        thing1: {
          value: customerName.substring(0, 20)  // 客户姓名（最多20个字符）
        },
        thing2: {
          value: source.substring(0, 20)  // 分配原因（最多20个字符）
        },
        name3: {
          value: assignerName.substring(0, 20)  // 分配人姓名（最多20个字符）
        },
        time4: {
          value: formattedTime  // 分配时间
        }
      },
      miniprogramState: 'formal'  // 正式版小程序
    });

    console.log('✅ 订阅消息发送成功:', result);

    return {
      success: true,
      message: '通知发送成功',
      data: result
    };

  } catch (error) {
    console.error('❌ 发送通知失败:', error);
    
    // 返回详细的错误信息
    return {
      success: false,
      message: error.message || '发送通知失败',
      error: {
        code: error.errCode,
        message: error.errMsg
      }
    };
  }
}

/**
 * 订阅消息模板配置说明
 * 
 * 1. 登录小程序后台: https://mp.weixin.qq.com
 * 2. 功能 → 订阅消息 → 公共模板库
 * 3. 搜索"任务分配"或"工作提醒"类型的模板
 * 4. 选择包含以下字段的模板:
 *    - 客户姓名 (thing)
 *    - 分配原因 (thing)
 *    - 分配人 (name)
 *    - 分配时间 (time)
 * 5. 添加模板后，获取模板ID
 * 6. 将模板ID替换到上面的 templateId 变量中
 * 
 * 示例模板格式:
 * ┌─────────────────────────┐
 * │ 📋 新客户分配通知        │
 * ├─────────────────────────┤
 * │ 客户姓名: {{thing1.DATA}} │
 * │ 分配原因: {{thing2.DATA}} │
 * │ 分配人: {{name3.DATA}}   │
 * │ 分配时间: {{time4.DATA}}  │
 * └─────────────────────────┘
 */

