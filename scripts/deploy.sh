#!/bin/bash

# 安得家政CRM系统生产环境部署脚本
# 使用方法: ./scripts/deploy.sh [domain]

set -e  # 遇到错误立即停止

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "正在以root用户运行，建议使用普通用户+sudo"
        read -p "继续执行? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    local deps=("docker" "docker-compose" "nginx" "certbot")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少依赖: ${missing_deps[*]}"
        log_info "请运行以下命令安装依赖:"
        echo "sudo apt update"
        echo "sudo apt install docker.io docker-compose nginx certbot python3-certbot-nginx -y"
        exit 1
    fi
    
    log_success "所有依赖已安装"
}

# 检查环境变量文件
check_env_file() {
    log_info "检查环境变量配置..."
    
    if [ ! -f ".env.production" ]; then
        log_warning "未找到 .env.production 文件"
        
        if [ -f "env.production.example" ]; then
            log_info "复制示例配置文件..."
            cp env.production.example .env.production
            log_warning "请编辑 .env.production 文件，填入真实的配置值"
            read -p "配置完成后按回车继续..."
        else
            log_error "未找到配置文件模板"
            exit 1
        fi
    fi
    
    # 检查关键配置项
    local required_vars=("MONGO_ROOT_PASSWORD" "JWT_SECRET" "DOMAIN")
    local missing_vars=()
    
    source .env.production
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" == *"your_"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "以下配置项需要设置真实值: ${missing_vars[*]}"
        log_info "请编辑 .env.production 文件"
        exit 1
    fi
    
    log_success "环境变量配置检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    local dirs=(
        "mongodb/logs"
        "nginx/conf.d"
        "nginx/ssl"
        "nginx/logs"
        "backend/uploads"
        "backend/logs"
        "backend/cache"
        "redis/conf"
        "backups"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    log_success "目录创建完成"
}

# 配置Nginx
setup_nginx() {
    local domain=${1:-localhost}
    
    log_info "配置Nginx..."
    
    # 创建Nginx配置文件
    cat > nginx/conf.d/housekeeping.conf << EOF
server {
    listen 80;
    server_name $domain www.$domain;
    
    # 临时配置，用于SSL证书申请
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # HTTP重定向到HTTPS（SSL证书申请后启用）
    # return 301 https://\$server_name\$request_uri;
    
    # 临时API代理（SSL证书申请前）
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}

# HTTPS配置（SSL证书申请后启用）
# server {
#     listen 443 ssl http2;
#     server_name $domain www.$domain;
# 
#     ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
#     ssl_prefer_server_ciphers off;
# 
#     add_header X-Frame-Options DENY;
#     add_header X-Content-Type-Options nosniff;
#     add_header X-XSS-Protection "1; mode=block";
# 
#     location /api/ {
#         proxy_pass http://backend:3000/api/;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#         proxy_cache_bypass \$http_upgrade;
#     }
# 
#     location / {
#         root /usr/share/nginx/html;
#         index index.html index.htm;
#         try_files \$uri \$uri/ /index.html;
#         
#         location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
#             expires 1y;
#             add_header Cache-Control "public, immutable";
#         }
#     }
# 
#     client_max_body_size 50M;
# }
EOF
    
    log_success "Nginx配置完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    # 检查Docker服务状态
    if ! systemctl is-active --quiet docker; then
        log_info "启动Docker服务..."
        sudo systemctl start docker
    fi
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    log_success "项目构建完成"
}

# 部署服务
deploy_services() {
    log_info "部署服务..."
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # 启动新服务
    log_info "启动新服务..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    log_success "服务部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        # 检查MongoDB
        if docker exec housekeeping_mongodb_prod mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            log_success "MongoDB运行正常"
        else
            log_warning "MongoDB未就绪"
        fi
        
        # 检查后端API
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            log_success "后端API运行正常"
        else
            log_warning "后端API未就绪"
        fi
        
        # 检查前端
        if curl -f http://localhost/ >/dev/null 2>&1; then
            log_success "前端服务运行正常"
            break
        else
            log_warning "前端服务未就绪"
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "健康检查失败，请检查服务状态"
            docker-compose -f docker-compose.prod.yml logs
            exit 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_success "所有服务运行正常"
}

# SSL证书申请（可选）
setup_ssl() {
    local domain=${1:-localhost}
    
    if [ "$domain" = "localhost" ]; then
        log_warning "跳过SSL证书申请（使用localhost）"
        return
    fi
    
    log_info "申请SSL证书..."
    
    # 停止nginx避免端口冲突
    sudo systemctl stop nginx 2>/dev/null || true
    
    # 申请证书
    sudo certbot certonly --standalone -d "$domain" -d "www.$domain" --non-interactive --agree-tos --email "admin@$domain"
    
    if [ $? -eq 0 ]; then
        log_success "SSL证书申请成功"
        
        # 启用HTTPS配置
        log_info "启用HTTPS配置..."
        sed -i 's/# return 301/return 301/' nginx/conf.d/housekeeping.conf
        sed -i 's/# server {/server {/' nginx/conf.d/housekeeping.conf
        sed -i 's/# }/}/' nginx/conf.d/housekeeping.conf
        sed -i 's/# //' nginx/conf.d/housekeeping.conf
        
        # 重启前端容器以应用新配置
        docker-compose -f docker-compose.prod.yml restart frontend
        
        log_success "HTTPS配置已启用"
    else
        log_warning "SSL证书申请失败，将使用HTTP"
    fi
}

# 创建备份脚本
create_backup_script() {
    log_info "创建备份脚本..."
    
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# 备份脚本
BACKUP_DIR="/backup/housekeeping"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# 备份数据库
echo "备份数据库..."
docker exec housekeeping_mongodb_prod mongodump --out "/tmp/db_$DATE"
docker cp "housekeeping_mongodb_prod:/tmp/db_$DATE" "$BACKUP_DIR/"

# 备份文件
echo "备份上传文件..."
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" ./backend/uploads

# 清理7天前的备份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "db_*" -mtime +7 -exec rm -rf {} \;

echo "备份完成: $BACKUP_DIR"
EOF
    
    chmod +x scripts/backup.sh
    
    # 添加到crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/scripts/backup.sh") | crontab -
    
    log_success "备份脚本创建完成，已添加到定时任务"
}

# 显示部署信息
show_deployment_info() {
    local domain=${1:-localhost}
    
    log_success "部署完成！"
    echo
    echo "🌐 访问地址:"
    echo "   前端: http://$domain"
    echo "   API文档: http://$domain/api/docs"
    echo
    echo "🐳 Docker容器状态:"
    docker-compose -f docker-compose.prod.yml ps
    echo
    echo "📊 系统监控:"
    echo "   查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "   服务状态: docker-compose -f docker-compose.prod.yml ps"
    echo "   重启服务: docker-compose -f docker-compose.prod.yml restart"
    echo
    echo "🔧 维护命令:"
    echo "   备份数据: ./scripts/backup.sh"
    echo "   更新代码: git pull && ./scripts/deploy.sh $domain"
    echo
}

# 主函数
main() {
    local domain=${1:-localhost}
    
    echo "🚀 开始部署安得家政CRM系统"
    echo "域名: $domain"
    echo
    
    check_root
    check_dependencies
    check_env_file
    create_directories
    setup_nginx "$domain"
    build_project
    deploy_services
    health_check
    
    if [ "$domain" != "localhost" ]; then
        setup_ssl "$domain"
    fi
    
    create_backup_script
    show_deployment_info "$domain"
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi 