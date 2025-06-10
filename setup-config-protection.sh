#!/bin/bash

# 配置保护系统安装脚本
# Configuration Protection System Setup

echo "🛡️  配置保护系统安装程序"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 检查依赖
check_dependencies() {
    log "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装，请先安装 Node.js"
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        error "npm 未安装，请先安装 npm"
    fi
    
    log "✅ 系统依赖检查通过"
}

# 安装npm依赖
install_npm_dependencies() {
    log "安装npm依赖..."
    
    # 创建临时package.json来安装依赖
    if [ ! -f "package.json" ]; then
        log "创建临时package.json..."
        cat > package.json << 'EOF'
{
  "name": "config-protection-system",
  "version": "1.0.0",
  "description": "Configuration protection system for preventing AI mismodification",
  "dependencies": {
    "chokidar": "^3.5.3"
  },
  "devDependencies": {},
  "scripts": {
    "guard": "node config-guard.js",
    "ai-guard": "node ai-config-guard.js"
  }
}
EOF
    fi
    
    # 安装依赖
    npm install chokidar
    
    if [ $? -eq 0 ]; then
        log "✅ npm依赖安装成功"
    else
        error "npm依赖安装失败"
    fi
}

# 设置文件权限
setup_permissions() {
    log "设置文件权限..."
    
    # 设置脚本可执行权限
    chmod +x config-guard.js
    chmod +x ai-config-guard.js
    chmod +x setup-config-protection.sh
    
    log "✅ 文件权限设置完成"
}

# 创建服务脚本
create_service_scripts() {
    log "创建服务管理脚本..."
    
    # 创建启动脚本
    cat > start-config-guard.sh << 'EOF'
#!/bin/bash

# 配置守护启动脚本
echo "启动配置保护服务..."

# 基础配置守护
nohup node config-guard.js watch > config-guard.out 2>&1 &
BASIC_PID=$!
echo $BASIC_PID > .config-guard.pid
echo "基础配置守护已启动 (PID: $BASIC_PID)"

# AI智能守护
nohup node ai-config-guard.js watch > ai-config-guard.out 2>&1 &
AI_PID=$!
echo $AI_PID > .ai-config-guard.pid
echo "AI智能守护已启动 (PID: $AI_PID)"

echo "配置保护服务启动完成"
echo "日志文件:"
echo "  - config-guard.out (基础守护日志)"
echo "  - ai-config-guard.out (AI智能守护日志)"
echo "  - config-guard.log (详细日志)"
echo "  - ai-config-guard.log (AI守护详细日志)"
EOF

    # 创建停止脚本
    cat > stop-config-guard.sh << 'EOF'
#!/bin/bash

# 配置守护停止脚本
echo "停止配置保护服务..."

# 停止基础守护
if [ -f .config-guard.pid ]; then
    PID=$(cat .config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "基础配置守护已停止 (PID: $PID)"
    fi
    rm -f .config-guard.pid
fi

# 停止AI守护
if [ -f .ai-config-guard.pid ]; then
    PID=$(cat .ai-config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "AI智能守护已停止 (PID: $PID)"
    fi
    rm -f .ai-config-guard.pid
fi

echo "配置保护服务已停止"
EOF

    # 创建状态检查脚本
    cat > status-config-guard.sh << 'EOF'
#!/bin/bash

# 配置守护状态检查脚本
echo "配置保护服务状态"
echo "=================="

# 检查基础守护
if [ -f .config-guard.pid ]; then
    PID=$(cat .config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "✅ 基础配置守护: 运行中 (PID: $PID)"
    else
        echo "❌ 基础配置守护: 已停止"
        rm -f .config-guard.pid
    fi  
else
    echo "❌ 基础配置守护: 未运行"
fi

# 检查AI守护
if [ -f .ai-config-guard.pid ]; then
    PID=$(cat .ai-config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "✅ AI智能守护: 运行中 (PID: $PID)"
    else
        echo "❌ AI智能守护: 已停止"
        rm -f .ai-config-guard.pid
    fi
else
    echo "❌ AI智能守护: 未运行"
fi

echo ""
echo "详细状态:"
node ai-config-guard.js status
EOF

    # 设置可执行权限
    chmod +x start-config-guard.sh
    chmod +x stop-config-guard.sh  
    chmod +x status-config-guard.sh
    
    log "✅ 服务管理脚本创建完成"
}

# 初始化配置基线
initialize_baseline() {
    log "初始化配置基线..."
    
    # 创建基础配置基线
    node config-guard.js init
    
    if [ $? -eq 0 ]; then
        log "✅ 基础配置基线创建成功"
    else
        warn "基础配置基线创建失败，请手动运行: node config-guard.js init"
    fi
}

# 创建使用文档
create_documentation() {
    log "创建使用文档..."
    
    cat > CONFIG_PROTECTION_README.md << 'EOF'
# 配置保护系统使用指南

## 概述

配置保护系统提供两层保护：
1. **基础配置守护** (`config-guard.js`) - 基于文件指纹的完整性保护
2. **AI智能守护** (`ai-config-guard.js`) - 智能识别AI活动并分级保护

## 快速开始

### 1. 启动保护服务
```bash
./start-config-guard.sh
```

### 2. 查看服务状态
```bash
./status-config-guard.sh
```

### 3. 停止保护服务
```bash
./stop-config-guard.sh
```

## 详细功能

### 基础配置守护

#### 基本命令
```bash
# 初始化配置基线
node config-guard.js init

# 检查配置完整性
node config-guard.js check

# 开始监控
node config-guard.js watch

# 生成完整性报告
node config-guard.js report

# 恢复指定文件
node config-guard.js restore <filepath>
```

#### 保护范围
- 环境配置文件 (.env*)
- PM2配置文件 (ecosystem.config.js)
- 部署脚本 (deploy.sh, pm2-deploy.sh)
- 核心业务配置文件
- 数据库和认证配置

### AI智能守护

#### 基本命令
```bash
# 开始AI智能监控
node ai-config-guard.js watch

# 查看保护状态
node ai-config-guard.js status

# 配置保护选项
node ai-config-guard.js config protection on    # 启用保护
node ai-config-guard.js config strict on        # 启用严格模式
node ai-config-guard.js config ai-detection on  # 启用AI检测

# 检测AI活动
node ai-config-guard.js check

# 测试文件保护
node ai-config-guard.js test <filepath>
```

#### 保护策略
- 🔴 **核心文件** - 绝对保护，AI修改需确认
- 🟡 **敏感文件** - 高置信度AI修改需确认  
- 🟢 **开发文件** - 记录AI修改但允许

#### AI检测机制
- 环境变量检测 (EDITOR, TERM_PROGRAM等)
- Git提交信息分析
- 进程信息检查
- 关键词匹配 (AI, assistant, claude, gpt等)

## 配置文件

### 基础守护配置
- `.config-baseline/file-fingerprints.json` - 文件指纹基线
- `.config-baseline/change-history.json` - 变更历史记录

### AI智能守护配置  
- `.ai-config-guard/guard-config.json` - 守护配置
- `.ai-config-guard/protection-policy.json` - 保护策略
- `.ai-config-guard/decisions.log` - 决策记录

## 最佳实践

### 1. 定期备份
```bash
# 手动备份当前配置
node config-guard.js backup
```

### 2. 严格模式使用
在生产环境中建议启用严格模式：
```bash
node ai-config-guard.js config strict on
```

### 3. 监控日志
定期检查守护日志：
- `config-guard.log` - 基础守护日志
- `ai-config-guard.log` - AI守护日志

### 4. 完整性检查
定期运行完整性检查：
```bash
node config-guard.js check
node config-guard.js report
```

## 故障排除

### 服务无法启动
1. 检查Node.js版本 (需要 >= 14.x)
2. 确认npm依赖已安装: `npm install`
3. 检查文件权限: `chmod +x *.js`

### 误报处理
如果AI检测出现误报：
1. 检查环境变量设置
2. 调整AI检测敏感度
3. 将文件添加到白名单

### 配置基线损坏
如果配置基线文件损坏：
1. 删除 `.config-baseline` 目录
2. 重新运行 `node config-guard.js init`

## 技术支持

如需技术支持，请检查：
1. 日志文件中的错误信息
2. 系统环境配置
3. 文件权限设置

---
*配置保护系统 v1.0 - 智能守护您的关键配置*
EOF

    log "✅ 使用文档创建完成: CONFIG_PROTECTION_README.md"
}

# 主安装流程
main_install() {
    echo -e "${BLUE}开始安装配置保护系统...${NC}"
    echo ""
    
    check_dependencies
    install_npm_dependencies
    setup_permissions
    create_service_scripts
    initialize_baseline
    create_documentation
    
    echo ""
    echo -e "${GREEN}🎉 配置保护系统安装完成!${NC}"
    echo ""
    echo "下一步操作:"
    echo "1. 阅读使用文档: cat CONFIG_PROTECTION_README.md"
    echo "2. 启动保护服务: ./start-config-guard.sh"
    echo "3. 查看服务状态: ./status-config-guard.sh"
    echo ""
    echo "配置保护功能:"
    echo "✅ 基础配置完整性保护"
    echo "✅ AI智能活动检测"
    echo "✅ 分级保护策略"
    echo "✅ 实时监控和告警"
    echo "✅ 交互式确认机制"
    echo ""
    echo -e "${YELLOW}重要提醒: 请在修改配置前确认保护服务已启动${NC}"
}

# 卸载功能
uninstall() {
    echo -e "${YELLOW}开始卸载配置保护系统...${NC}"
    
    # 停止服务
    if [ -f stop-config-guard.sh ]; then
        ./stop-config-guard.sh
    fi
    
    # 删除服务脚本
    rm -f start-config-guard.sh stop-config-guard.sh status-config-guard.sh
    
    # 删除配置目录
    rm -rf .config-baseline .ai-config-guard
    
    # 删除日志文件
    rm -f config-guard.log ai-config-guard.log
    rm -f config-guard.out ai-config-guard.out
    rm -f .config-guard.pid .ai-config-guard.pid
    
    # 删除文档
    rm -f CONFIG_PROTECTION_README.md
    
    echo -e "${GREEN}配置保护系统已卸载${NC}"
}

# 命令行参数处理
case "${1:-install}" in
    "install")
        main_install
        ;;
    "uninstall")
        uninstall
        ;;
    "reinstall")
        uninstall
        main_install
        ;;
    *)
        echo "用法: $0 [install|uninstall|reinstall]"
        echo ""
        echo "install   - 安装配置保护系统 (默认)"
        echo "uninstall - 卸载配置保护系统"
        echo "reinstall - 重新安装配置保护系统"
        exit 1
        ;;
esac 