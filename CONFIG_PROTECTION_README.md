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
