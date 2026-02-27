# MongoDB 备份恢复 - 快速参考

## 🚀 常用命令

### 立即备份
```bash
bash scripts/mongodb-quick-backup.sh
```

### 带标签备份
```bash
bash scripts/mongodb-quick-backup.sh "before-update"
```

### 恢复最新备份
```bash
bash scripts/mongodb-restore.sh latest --force
```

### 交互式恢复
```bash
bash scripts/mongodb-restore.sh
```

### 列出所有备份
```bash
bash scripts/mongodb-backup-manager.sh list
```

### 查看备份统计
```bash
bash scripts/mongodb-backup-manager.sh stats
```

### 设置自动备份
```bash
bash scripts/setup-backup-cron.sh
```

## 📁 备份位置

- **备份目录**: `/home/ubuntu/mongodb_backups/`
- **日志目录**: `/home/ubuntu/mongodb_backups/logs/`

## 🔍 查看日志

```bash
# 查看今天的备份日志
tail -f /home/ubuntu/mongodb_backups/logs/backup_$(date +%Y%m%d).log

# 查看 cron 日志
tail -f /home/ubuntu/mongodb_backups/logs/cron.log
```

## ⚠️ 重要提示

1. **恢复前备份**: 恢复操作会覆盖现有数据，建议先备份
2. **定期测试**: 定期测试恢复功能确保备份可用
3. **磁盘空间**: 定期检查备份目录的磁盘空间

## 📞 紧急恢复步骤

如果数据丢失，按以下步骤操作：

1. **不要慌张**，停止所有可能修改数据的操作
2. 立即执行备份（保存当前状态）：
   ```bash
   bash scripts/mongodb-quick-backup.sh "before-emergency-restore"
   ```
3. 查看可用备份：
   ```bash
   bash scripts/mongodb-backup-manager.sh list
   ```
4. 恢复数据：
   ```bash
   bash scripts/mongodb-restore.sh
   ```
5. 验证恢复结果

## 🛠️ 故障排除

### 问题：mongodump 命令不存在
```bash
sudo apt-get update
sudo apt-get install mongodb-database-tools
```

### 问题：权限不足
```bash
chmod +x scripts/mongodb-*.sh
```

### 问题：磁盘空间不足
```bash
# 清理 60 天前的备份
bash scripts/mongodb-backup-manager.sh clean 60
```

