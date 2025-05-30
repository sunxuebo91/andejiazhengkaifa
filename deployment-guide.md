# 安得家政CRM系统 - 生产环境部署指南

## 🚀 部署上线流程

### Phase 1: 服务器准备

#### 1.1 系统要求
- Ubuntu 20.04+ 或 CentOS 7+
- 最少4GB内存，推荐8GB+
- 50GB+ 可用存储空间
- 公网IP和域名

#### 1.2 基础环境安装
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 安装Nginx
sudo apt install nginx -y
sudo systemctl enable nginx

# 安装SSL证书工具
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### Phase 2: 项目配置

#### 2.1 生产环境变量配置

**创建 `backend/.env.production`:**
```env
# 基础配置
NODE_ENV=production
PORT=3000

# 数据库配置
MONGODB_URI=mongodb://mongodb:27017/housekeeping_prod

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# 腾讯云COS配置
TENCENT_COS_SECRET_ID=your_secret_id
TENCENT_COS_SECRET_KEY=your_secret_key
TENCENT_COS_BUCKET=your_bucket_name
TENCENT_COS_REGION=your_region

# 百度OCR配置
BAIDU_OCR_API_KEY=your_api_key
BAIDU_OCR_SECRET_KEY=your_secret_key

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs/
```

**创建 `frontend/.env.production`:**
```env
NODE_ENV=production
VITE_API_URL=https://your-domain.com/api
VITE_UPLOAD_URL=https://your-domain.com/api/upload
```

#### 2.2 优化Docker配置

**更新 `docker-compose.prod.yml`:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: housekeeping_mongodb_prod
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./mongodb/init:/docker-entrypoint-initdb.d
    environment:
      MONGO_INITDB_ROOT_USERNAME=admin
      MONGO_INITDB_ROOT_PASSWORD=secure_password_here
      MONGO_INITDB_DATABASE=housekeeping_prod
    networks:
      - housekeeping_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: housekeeping_backend_prod
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - ./backend/.env.production
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    depends_on:
      - mongodb
    networks:
      - housekeeping_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: housekeeping_frontend_prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./ssl:/etc/ssl/certs
    depends_on:
      - backend
    networks:
      - housekeeping_network

volumes:
  mongodb_data:

networks:
  housekeeping_network:
    driver: bridge
```

### Phase 3: Nginx配置

#### 3.1 创建Nginx配置
**创建 `/etc/nginx/sites-available/housekeeping`:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # HTTP重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # API代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件
    location / {
        root /var/www/housekeeping;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 文件上传大小限制
    client_max_body_size 50M;
}
```

### Phase 4: 部署执行

#### 4.1 域名和SSL配置
```bash
# 配置域名解析（在域名管理后台）
# A记录: your-domain.com -> 服务器IP
# CNAME记录: www.your-domain.com -> your-domain.com

# 获取SSL证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加行: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 4.2 构建和部署
```bash
# 1. 构建项目
npm run build

# 2. 创建生产环境配置
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production
# 编辑配置文件填入真实值

# 3. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 4. 检查服务状态
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

### Phase 5: 监控和维护

#### 5.1 日志监控
```bash
# 查看实时日志
docker-compose -f docker-compose.prod.yml logs -f

# 设置日志轮转
sudo logrotate -d /etc/logrotate.d/housekeeping
```

#### 5.2 备份策略
```bash
# 创建备份脚本
#!/bin/bash
# backup.sh
BACKUP_DIR="/backup/housekeeping"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份数据库
docker exec housekeeping_mongodb_prod mongodump --out /backup/db_$DATE

# 备份文件
tar -czf $BACKUP_DIR/files_$DATE.tar.gz ./backend/uploads

# 清理7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

#### 5.3 性能优化
- 启用Gzip压缩
- 配置Redis缓存
- 数据库索引优化
- CDN加速静态资源

### Phase 6: 上线检查清单

#### 6.1 部署前检查
- [ ] 环境变量配置正确
- [ ] 数据库连接测试
- [ ] 第三方API密钥有效
- [ ] SSL证书安装
- [ ] 防火墙配置

#### 6.2 上线后验证
- [ ] 网站可正常访问
- [ ] API接口响应正常
- [ ] 用户注册登录功能
- [ ] 文件上传功能
- [ ] OCR识别功能
- [ ] 日志记录正常

### 🔧 故障排查

#### 常见问题解决
1. **容器启动失败**: 检查端口占用和权限
2. **数据库连接失败**: 检查MongoDB配置和网络
3. **API请求失败**: 检查Nginx代理配置
4. **SSL证书问题**: 检查域名解析和证书路径

### 📞 技术支持
- 监控告警: 配置邮件/短信通知
- 备份恢复: 定期测试恢复流程
- 性能监控: 使用PM2或Docker健康检查 