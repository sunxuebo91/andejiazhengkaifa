FROM node:18-alpine

WORKDIR /app

# 复制package.json和package-lock.json
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# 安装依赖
RUN cd backend && npm install
RUN cd frontend && npm install
RUN npm install

# 复制项目文件
COPY . .

# 构建前端
RUN cd frontend && npm run build

# 构建后端
RUN cd backend && npm run build

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "backend/dist/main.js"]
