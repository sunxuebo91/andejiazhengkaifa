# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 只安装生产依赖
RUN npm install --only=production --legacy-peer-deps

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 创建必要的目录
RUN mkdir -p uploads logs cache

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "dist/main"]