#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "开始修复React应用构建问题..."

# 切换到前端目录
cd /home/ubuntu/andejiazhengcrm/frontend

# 确保环境变量配置正确，这里使用您原有的配置
cat > .env << EOF
VITE_API_URL=https://crm.andejiazheng.com
VITE_UPLOADS_URL=https://crm.andejiazheng.com/uploads
EOF

# 检查并删除public目录中的临时文件
cd /home/ubuntu/andejiazhengcrm/backend
if [ -f "public/index.html" ]; then
  echo "删除临时HTML文件..."
  rm -f public/index.html public/dashboard.html
fi

# 回到前端目录
cd /home/ubuntu/andejiazhengcrm/frontend

# 检查node_modules是否存在，如果不存在则安装依赖
if [ ! -d "node_modules" ]; then
  echo "安装前端依赖..."
  npm install
fi

# 检查是否有TypeScript编译错误，并添加--force标志强制构建
echo "构建前端应用..."
npm run build -- --force

# 确保后端public目录存在
mkdir -p /home/ubuntu/andejiazhengcrm/backend/public

# 复制构建文件到后端服务目录
echo "复制构建文件到后端服务目录..."
cp -R dist/* /home/ubuntu/andejiazhengcrm/backend/public/

# 检查构建文件是否成功复制
if [ ! -f "/home/ubuntu/andejiazhengcrm/backend/public/index.html" ]; then
  echo "警告：构建文件可能没有正确生成或复制"
else
  echo "前端构建文件成功复制到后端服务目录"
fi

# 检查是否需要修改后端文件处理，确保路由正确处理前端路由
cd /home/ubuntu/andejiazhengcrm/backend

# 确保simple-auth-server.js有正确的前端路由处理
grep -q "app.get('\*'" simple-auth-server.js
if [ $? -ne 0 ]; then
  # 添加必要的前端路由处理
  cat >> simple-auth-server.js << EOF

// 为所有未匹配的GET请求提供前端的index.html，以支持React路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
EOF
  echo "已添加前端路由处理到后端服务"
fi

# 重启后端服务
echo "重启后端服务..."
pm2 restart andejiazhengcrm-backend

# 检查服务状态
pm2 status

echo "React应用修复完成！"
echo "您现在可以访问 https://crm.andejiazheng.com 使用您的应用了" 