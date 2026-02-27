# MongoDB 备份与恢复系统

完整的 MongoDB 数据库备份和恢复解决方案。

## 📋 目录

- [快速开始](#快速开始)
- [脚本说明](#脚本说明)
- [使用指南](#使用指南)
- [定时备份](#定时备份)
- [常见问题](#常见问题)

## 🚀 快速开始

### 1. 立即备份

```bash
# 快速备份（推荐）
bash scripts/mongodb-quick-backup.sh

# 带标签的备份
bash scripts/mongodb-quick-backup.sh "before-update"
```

### 2. 设置自动备份

```bash
# 交互式设置定时任务
bash scripts/setup-backup-cron.sh
```

### 3. 恢复数据

```bash
# 交互式恢复
bash scripts/mongodb-restore.sh

# 恢复最新备份（无需确认）
bash scripts/mongodb-restore.sh latest --force
```

## 📦 脚本说明

### 1. `mongodb-backup.sh` - 完整备份脚本

**功能：**
- 备份指定的 MongoDB 数据库
- 自动压缩备份文件
- 保留最近 30 天的备份
- 记录详细的备份日志

**使用：**
```bash
bash scripts/mongodb-backup.sh
```

**配置参数：**
- `MONGODB_HOST`: MongoDB 主机地址（默认：127.0.0.1）
- `MONGODB_PORT`: MongoDB 端口（默认：27017）
- `MONGODB_DB`: 数据库名称（默认：housekeeping）
- `BACKUP_DIR`: 备份目录（默认：/home/ubuntu/mongodb_backups）
- `RETENTION_DAYS`: 保留天数（默认：30）

### 2. `mongodb-restore.sh` - 数据恢复脚本

**功能：**
- 列出所有可用备份
- 交互式选择要恢复的备份
- 安全恢复数据（带确认）
- 验证恢复结果

**使用：**
```bash
# 交互式恢复
bash scripts/mongodb-restore.sh

# 恢复最新备份
bash scripts/mongodb-restore.sh latest

# 恢复指定序号的备份（跳过确认）
bash scripts/mongodb-restore.sh 1 --force
```

### 3. `mongodb-quick-backup.sh` - 快速备份脚本

**功能：**
- 快速执行备份
- 支持备份标签
- 适合手动备份

**使用：**
```bash
# 普通备份
bash scripts/mongodb-quick-backup.sh

# 带标签备份
bash scripts/mongodb-quick-backup.sh "before-deploy"
bash scripts/mongodb-quick-backup.sh "before-migration"
```

### 4. `mongodb-backup-manager.sh` - 备份管理工具

**功能：**
- 列出所有备份
- 查看备份详情
- 删除指定备份
- 清理旧备份
- 显示统计信息

**使用：**
```bash
# 列出所有备份
bash scripts/mongodb-backup-manager.sh list

# 查看备份详情
bash scripts/mongodb-backup-manager.sh info 1

# 删除指定备份
bash scripts/mongodb-backup-manager.sh delete 3

# 清理 60 天前的备份
bash scripts/mongodb-backup-manager.sh clean 60

# 显示统计信息
bash scripts/mongodb-backup-manager.sh stats
```

### 5. `setup-backup-cron.sh` - 定时任务设置

**功能：**
- 交互式设置定时备份
- 多种预设时间选项
- 支持自定义 cron 表达式
- 查看和删除定时任务

**使用：**
```bash
bash scripts/setup-backup-cron.sh
```

## ⏰ 定时备份

### 设置定时任务

```bash
bash scripts/setup-backup-cron.sh
```

选项：
1. 每天凌晨 2:00 备份（推荐）
2. 每天凌晨 3:00 备份
3. 每天凌晨 4:00 备份
4. 每 6 小时备份一次
5. 每 12 小时备份一次
6. 自定义时间
7. 查看当前定时任务
8. 删除定时任务

### 查看定时任务

```bash
crontab -l | grep mongodb-backup
```

### 查看备份日志

```bash
# 查看最新备份日志
tail -f /home/ubuntu/mongodb_backups/logs/backup_$(date +%Y%m%d).log

# 查看 cron 执行日志
tail -f /home/ubuntu/mongodb_backups/logs/cron.log
```

## 📂 目录结构

```
/home/ubuntu/mongodb_backups/
├── backup_housekeeping_20260225_020000.tar.gz
├── backup_housekeeping_20260226_020000.tar.gz
├── ...
└── logs/
    ├── backup_20260225.log
    ├── backup_20260226.log
    └── cron.log
```

## 💡 使用场景

### 场景 1: 日常自动备份

```bash
# 1. 设置每天凌晨 2 点自动备份
bash scripts/setup-backup-cron.sh
# 选择选项 1

# 2. 系统会自动执行备份，无需人工干预
```

### 场景 2: 重要操作前手动备份

```bash
# 在执行重要操作前备份
bash scripts/mongodb-quick-backup.sh "before-important-update"
```

### 场景 3: 数据恢复

```bash
# 1. 查看可用备份
bash scripts/mongodb-backup-manager.sh list

# 2. 恢复数据
bash scripts/mongodb-restore.sh
```

### 场景 4: 清理旧备份

```bash
# 删除 60 天前的备份
bash scripts/mongodb-backup-manager.sh clean 60
```

## ⚠️ 注意事项

1. **备份前确认**：恢复操作会覆盖现有数据，请谨慎操作
2. **磁盘空间**：定期检查备份目录的磁盘空间
3. **备份测试**：定期测试备份恢复功能
4. **权限问题**：确保脚本有执行权限（chmod +x）
5. **数据库连接**：确保 MongoDB 服务正在运行

## 🔧 故障排除

### 问题 1: mongodump 命令不存在

```bash
# 安装 MongoDB 数据库工具
sudo apt-get update
sudo apt-get install mongodb-database-tools
```

### 问题 2: 权限不足

```bash
# 添加执行权限
chmod +x scripts/mongodb-*.sh
```

### 问题 3: 备份失败

```bash
# 检查 MongoDB 是否运行
sudo systemctl status mongod

# 检查磁盘空间
df -h /home/ubuntu/mongodb_backups
```

## 📞 支持

如有问题，请查看日志文件：
- 备份日志：`/home/ubuntu/mongodb_backups/logs/backup_*.log`
- Cron 日志：`/home/ubuntu/mongodb_backups/logs/cron.log`

