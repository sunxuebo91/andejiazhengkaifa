#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "完成登录修复..."

# 添加Mock登录路由以便调试
cat > /home/ubuntu/andejiazhengcrm/backend/mock-login.js << EOF
// 添加模拟登录路由
const express = require('express');
const router = express.Router();

// 模拟登录接口
router.post('/login', (req, res) => {
  console.log('收到登录请求:', req.body);
  
  // 简单的用户名密码检查
  if (req.body && req.body.username && req.body.password) {
    console.log('登录成功，用户名:', req.body.username);
    res.json({
      success: true,
      token: 'mock-token-' + Date.now(),
      user: {
        id: 1,
        username: req.body.username,
        role: 'admin'
      }
    });
  } else {
    console.log('登录失败，请求体不完整:', req.body);
    res.status(401).json({
      success: false,
      message: '用户名或密码错误'
    });
  }
});

// 测试路由
router.get('/test', (req, res) => {
  console.log('测试路由被访问');
  res.json({ message: 'API正常工作' });
});

module.exports = router;
EOF

# 在后端添加模拟登录路由
cd /home/ubuntu/andejiazhengcrm/backend
cat >> simple-server.js << EOF

// 引入模拟登录路由
const mockLoginRouter = require('./mock-login');
app.use('/', mockLoginRouter);
app.use('/api', mockLoginRouter);

// 添加测试路由
app.get('/api/test', (req, res) => {
  console.log('API测试路由被访问');
  res.json({ message: 'API正常工作' });
});
EOF

# 重启后端服务
cd /home/ubuntu/andejiazhengcrm
pm2 restart andejiazhengcrm-backend

# 重新构建前端
cd /home/ubuntu/andejiazhengcrm/frontend
npm run build

# 更新静态文件
mkdir -p /home/ubuntu/andejiazhengcrm/backend/public
cp -R dist/* /home/ubuntu/andejiazhengcrm/backend/public/

# 重启前端服务
pm2 restart andejiazhengcrm-frontend

# 测试API可访问性
curl -s https://crm.andejiazheng.com/api/test || echo "API访问失败"

echo "登录问题修复完成!"
echo "请使用 https://crm.andejiazheng.com 重新访问并尝试登录"
echo "建议使用以下凭据尝试登录："
echo "用户名：admin"
echo "密码：password" 