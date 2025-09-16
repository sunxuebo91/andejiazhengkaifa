const http = require('http');

// HTTP请求工具函数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(body),
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: { error: 'Invalid JSON response', body },
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试订阅消息内容
async function testMessageContent() {
  console.log('📝 开始测试订阅消息内容...\n');

  // 首先设置顾问订阅
  console.log('1️⃣ 设置顾问订阅状态');
  try {
    const subscribeResponse = await makeRequest('POST', '/advisor/subscribe', {
      advisorId: 'advisor_message_test',
      openid: 'wx_advisor_openid_123',
      templateId: 'template_message_test',
      subscribed: true,
      subscribeData: {
        source: 'test',
        timestamp: new Date().toISOString()
      }
    });
    
    if (subscribeResponse.data.success) {
      console.log('✅ 顾问订阅设置成功');
    } else {
      console.log('❌ 顾问订阅设置失败');
      return;
    }
  } catch (error) {
    console.log('❌ 顾问订阅设置异常:', error.message);
    return;
  }

  console.log('');

  // 测试场景
  const testScenarios = [
    {
      name: '场景1: 新客户查看简历 -> 应该显示"新客户查看了您的简历"',
      data: {
        customerId: 'wx_message_test_new_001',
        advisorId: 'advisor_message_test',
        actionType: 'view_resume',
        actionData: {
          resumeId: 'resume_message_test_001',
          viewTime: new Date().toISOString(),
          duration: 30
        },
        customerName: '消息测试新客户',
        customerPhone: '13900139001', // 新手机号
        resumeId: 'resume_message_test_001'
      },
      expectedMessageType: '新客户'
    },
    {
      name: '场景2: 老客户联系顾问 -> 应该显示"客户想要联系您"',
      data: {
        customerId: 'wx_message_test_old_001',
        advisorId: 'advisor_message_test',
        actionType: 'contact_advisor',
        actionData: {
          contactMethod: 'phone',
          contactTime: new Date().toISOString()
        },
        customerName: '消息测试新客户', // 同一个客户
        customerPhone: '13900139001', // 重复手机号
      },
      expectedMessageType: '普通客户'
    },
    {
      name: '场景3: 没有手机号的客户预约服务 -> 应该显示"客户预约了您的服务"',
      data: {
        customerId: 'wx_message_test_no_phone',
        advisorId: 'advisor_message_test',
        actionType: 'book_service',
        actionData: {
          serviceType: '家政服务',
          bookingTime: new Date().toISOString()
        },
        customerName: '无手机号客户',
        // 没有customerPhone
      },
      expectedMessageType: '普通客户'
    }
  ];

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`${i + 2}️⃣ ${scenario.name}`);
    
    try {
      const response = await makeRequest('POST', '/customer/action', scenario.data);
      
      if (response.status === 200 && response.data.success) {
        const result = response.data.data;
        
        console.log(`✅ 行为记录成功`);
        console.log(`   - 客户创建状态: ${result.customerCreated}`);
        console.log(`   - 预期消息类型: ${scenario.expectedMessageType}`);
        
        // 注意：由于微信API需要真实的access_token，消息发送会失败
        // 但我们可以通过日志查看消息内容的构建是否正确
        console.log(`   - 消息发送: 将异步发送给顾问（需要真实微信凭证）`);
        
      } else {
        console.log('❌ 请求失败');
        console.log(`   - 响应: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      console.log('❌ 请求异常:', error.message);
    }
    
    console.log('');
  }

  console.log('📋 消息内容测试说明:');
  console.log('   - 新客户行为会触发"新客户xxx"的消息');
  console.log('   - 老客户行为会触发"客户xxx"的消息');
  console.log('   - 没有手机号的客户不会创建客户记录，发送普通消息');
  console.log('   - 实际消息发送需要真实的微信小程序凭证');
  console.log('');
  console.log('💡 可以查看服务器日志确认消息内容构建是否正确');
}

// 主函数
async function main() {
  console.log('='.repeat(80));
  console.log('📝 微信订阅消息内容测试脚本');
  console.log('='.repeat(80));
  console.log('');

  await testMessageContent();

  console.log('='.repeat(80));
}

// 运行测试
main().catch(console.error);
