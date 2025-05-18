#!/bin/bash

echo "彻底清理Express代码和依赖"
echo "======================="

# 确保当前在backend目录
if [[ $(basename $(pwd)) != "backend" ]]; then
  echo "请在backend目录下运行此脚本"
  exit 1
fi

# 备份文件
echo "备份Express相关文件..."
mkdir -p express-backup

# 备份主要Express文件
cp -f server.js express-backup/ 2>/dev/null || true
cp -f simple-server.js express-backup/ 2>/dev/null || true
cp -f app.js express-backup/ 2>/dev/null || true
cp -rf routes express-backup/ 2>/dev/null || true
cp -rf controllers express-backup/ 2>/dev/null || true

# 备份其他旧的Express相关JS文件
if [ -f test-ocr.js ]; then cp -f test-ocr.js express-backup/ ; fi
if [ -f mongo-test.js ]; then cp -f mongo-test.js express-backup/ ; fi
if [ -f create-admin-user.js ]; then cp -f create-admin-user.js express-backup/ ; fi
if [ -f create-admin-direct.js ]; then cp -f create-admin-direct.js express-backup/ ; fi

# 移除Express相关文件
echo "移除Express相关文件..."
rm -f server.js
rm -f simple-server.js
rm -f app.js
rm -rf routes
rm -rf controllers
rm -f test-ocr.js
rm -f mongo-test.js
rm -f create-admin-user.js
rm -f create-admin-direct.js

# 更新package.json，移除Express相关依赖和脚本
echo "更新package.json..."
# 使用jq处理JSON文件
if ! command -v jq &> /dev/null; then
    echo "需要安装jq工具来处理JSON文件"
    echo "请运行: sudo apt-get install jq"
    exit 1
fi

# 创建新的package.json文件，移除Express相关依赖
jq '
  del(.dependencies.express) |
  del(.dependencies["express-session"]) |
  del(.dependencies["body-parser"]) |
  del(.dependencies["connect-mongo"]) |
  del(.dependencies["express-validator"]) |
  del(.dependencies.cors) |
  del(.dependencies.multer) |
  .scripts.start = "node dist/main.js" |
  .scripts["start:dev"] = "nest start --watch" |
  .scripts.test = "jest" |
  .scripts["test:api"] = "jest --testPathPattern=test/api" 
' package.json > package.json.new

mv package.json.new package.json

# 更新启动脚本
echo "更新启动脚本..."
cat > start.sh << 'EOF'
#!/bin/bash

echo "启动NestJS应用"
echo "=============="

NODE_ENV=${NODE_ENV:-development}
echo "环境: $NODE_ENV"

# 启动NestJS应用
if [ "$NODE_ENV" = "production" ]; then
  echo "生产环境启动..."
  node dist/main.js
else
  echo "开发环境启动..."
  npm run start:dev
fi
EOF

chmod +x start.sh

# 更新.env文件格式
echo "确保.env文件格式正确..."
if [ -f .env ]; then
  cat .env | tr '\n\\' '\n' > .env.temp
  mv .env.temp .env
fi

echo "清理完成！NestJS现已是唯一的后端框架，可以使用 ./start.sh 启动应用" 