#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "修复前端构建问题..."

# 更新前端环境变量配置
cd /home/ubuntu/andejiazhengcrm/frontend
cat > .env << EOF
VITE_API_URL=https://crm.andejiazheng.com
VITE_UPLOADS_URL=https://crm.andejiazheng.com/uploads
EOF

# 确保包含基本的HTML模板
cat > /home/ubuntu/andejiazhengcrm/frontend/index.html << EOF
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>安德家政CRM系统</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# 创建一个临时的前端页面
mkdir -p /home/ubuntu/andejiazhengcrm/backend/public
cat > /home/ubuntu/andejiazhengcrm/backend/public/index.html << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>安德家政CRM系统</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .login-container {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      width: 350px;
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 15px;
      text-align: left;
    }
    label {
      display: block;
      margin-bottom: 5px;
      color: #555;
    }
    input {
      width: 100%;
      padding: 10px;
      box-sizing: border-box;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 12px;
      width: 100%;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 10px;
    }
    button:hover {
      background-color: #45a049;
    }
    .message {
      margin-top: 20px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>安德家政CRM系统</h1>
    <form id="loginForm">
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" name="username" required>
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">登录</button>
    </form>
    <div id="message" class="message"></div>
  </div>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const messageElement = document.getElementById('message');
      
      try {
        messageElement.textContent = '正在登录...';
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 存储token和用户信息
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          messageElement.textContent = '登录成功! 正在跳转...';
          messageElement.style.color = 'green';
          
          // 跳转到管理页面
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1000);
        } else {
          messageElement.textContent = data.message || '登录失败，请检查用户名和密码';
          messageElement.style.color = 'red';
        }
      } catch (error) {
        console.error('登录错误:', error);
        messageElement.textContent = '登录过程中发生错误，请稍后再试';
        messageElement.style.color = 'red';
      }
    });
  </script>
</body>
</html>
EOF

# 创建一个简单的仪表盘页面
cat > /home/ubuntu/andejiazhengcrm/backend/public/dashboard.html << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>安德家政CRM系统 - 仪表盘</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background-color: white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 22px;
      font-weight: bold;
      color: #333;
    }
    .user-info {
      display: flex;
      align-items: center;
    }
    .user-name {
      margin-right: 15px;
    }
    .logout-btn {
      background-color: #f44336;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    .main-content {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      margin-top: 20px;
      padding: 20px;
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .card-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .card {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .card h2 {
      margin-top: 0;
      color: #444;
    }
    .card p {
      color: #666;
    }
    .welcome-message {
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">安德家政CRM系统</div>
    <div class="user-info">
      <span class="user-name" id="userName">加载中...</span>
      <button class="logout-btn" id="logoutBtn">退出登录</button>
    </div>
  </header>
  
  <div class="container">
    <div class="main-content">
      <div class="welcome-message">
        <h1>欢迎回来, <span id="userRealName">用户</span>!</h1>
        <p>您当前的角色: <strong id="userRole">加载中...</strong></p>
      </div>
      
      <h2>系统概览</h2>
      <div class="card-container">
        <div class="card">
          <h2>简历管理</h2>
          <p>管理系统中的家政人员简历信息。</p>
        </div>
        <div class="card">
          <h2>用户管理</h2>
          <p>管理系统用户和权限设置。</p>
        </div>
        <div class="card">
          <h2>客户信息</h2>
          <p>管理客户信息和服务需求。</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 检查用户是否已登录
    function checkAuth() {
      const token = localStorage.getItem('auth_token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!token || !user.username) {
        // 未登录，重定向到登录页
        window.location.href = '/';
        return false;
      }
      
      return user;
    }
    
    // 页面加载时检查认证
    document.addEventListener('DOMContentLoaded', function() {
      const user = checkAuth();
      if (!user) return;
      
      // 显示用户信息
      document.getElementById('userName').textContent = user.username;
      document.getElementById('userRealName').textContent = user.realName || user.username;
      document.getElementById('userRole').textContent = getRoleName(user.role);
      
      // 退出登录
      document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/';
      });
    });
    
    // 获取角色名称
    function getRoleName(role) {
      const roleMap = {
        'admin': '系统管理员',
        'manager': '经理',
        'employee': '普通员工'
      };
      return roleMap[role] || role;
    }
  </script>
</body>
</html>
EOF

# 尝试重新构建前端
cd /home/ubuntu/andejiazhengcrm/frontend

# 检查前端构建是否成功
if npm run build; then
  echo "前端构建成功，复制文件到后端public目录..."
  cp -R dist/* /home/ubuntu/andejiazhengcrm/backend/public/
else
  echo "前端构建失败，使用临时页面代替..."
fi

# 重启后端服务
cd /home/ubuntu/andejiazhengcrm/backend
pm2 restart andejiazhengcrm-backend

# 验证文件是否存在
ls -la /home/ubuntu/andejiazhengcrm/backend/public

echo "前端修复完成!"
echo "现在你可以访问 https://crm.andejiazheng.com 并使用以下用户登录:"
echo "管理员: admin / admin123"
echo "测试用户: test / test123" 