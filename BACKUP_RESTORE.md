# MongoDB 数据库备份与恢复方案

本文档介绍了安得家政CRM系统的数据库备份与恢复方案，包括自动备份和手动恢复的详细步骤。

## 备份方案

系统使用自动脚本定期备份MongoDB数据库，确保数据安全。

### 备份文件存储位置

- 备份文件存储路径：`/home/ubuntu/andejiazhengcrm/backups/mongodb/`
- 备份文件格式：`{数据库名}_{年月日_时分秒}.tar.gz`（例如：`housekeeping_20250607_141419.tar.gz`）
- 日志文件路径：`/home/ubuntu/andejiazhengcrm/logs/db_backup.log`

### 自动备份计划

系统支持以下自动备份频率：

1. **每日备份**：每天凌晨2点执行
2. **每周备份**：每周日凌晨3点执行
3. **每月备份**：每月1日凌晨4点执行

默认配置为每日备份，备份文件保留30天。

### 设置自动备份

执行以下命令设置自动备份：

```bash
# 设置每日备份
./scripts/setup_cron_backup.sh daily

# 设置每周备份
./scripts/setup_cron_backup.sh weekly

# 设置每月备份
./scripts/setup_cron_backup.sh monthly
```

## 手动备份与恢复

系统提供了简单的命令行工具，用于手动备份和恢复数据库。

### 手动备份

执行以下命令进行手动备份：

```bash
./scripts/db_backup.sh backup
```

### 查看备份列表

执行以下命令查看所有可用的备份：

```bash
./scripts/db_backup.sh list
```

### 数据库恢复

数据库恢复操作将**覆盖**当前数据库中的数据，请谨慎操作。

#### 恢复最新备份

```bash
./scripts/db_backup.sh restore
```

#### 恢复指定备份

```bash
./scripts/db_backup.sh restore housekeeping_20250607_141419.tar.gz
```

## 紧急恢复步骤

当系统发生数据丢失或损坏时，按照以下步骤进行恢复：

1. **停止应用服务**：
   ```bash
   pm2 stop all
   ```

2. **查看可用备份**：
   ```bash
   ./scripts/db_backup.sh list
   ```

3. **选择合适的备份进行恢复**：
   ```bash
   ./scripts/db_backup.sh restore <备份文件名>
   ```
   如果不指定备份文件名，将恢复最新的备份。

4. **恢复确认**：
   系统会提示确认恢复操作，输入 `y` 确认。

5. **重启应用服务**：
   ```bash
   pm2 restart all
   ```

6. **验证恢复结果**：
   访问系统并验证数据是否正确恢复。

## 备份脚本参数说明

备份脚本 `./scripts/db_backup.sh` 支持以下命令：

- `backup`：创建新的数据库备份
- `restore [文件名]`：恢复指定的备份文件（不指定则使用最新备份）
- `list`：列出所有可用备份
- `help`：显示帮助信息

## 备份策略

1. **差异化备份**：每日备份保留30天，每周备份保留3个月，每月备份保留1年
2. **备份监控**：系统将备份结果记录到日志文件中，可通过查看日志了解备份状态
3. **备份测试**：建议每月进行一次备份恢复测试，确保备份有效可用

## 注意事项

1. 恢复操作会**完全覆盖**当前数据库，请谨慎操作
2. 恢复前建议创建当前数据库的备份
3. 大型数据库的恢复操作可能需要较长时间，请耐心等待
4. 如遇到备份或恢复问题，请查看日志文件 `/home/ubuntu/andejiazhengcrm/logs/db_backup.log`

## 常见问题

1. **Q: 备份失败怎么办？**
   A: 检查日志文件，确认MongoDB连接参数是否正确，确保磁盘空间充足。

2. **Q: 恢复失败怎么办？**
   A: 检查备份文件是否完整，确认MongoDB连接参数是否正确。

3. **Q: 如何更改备份设置？**
   A: 编辑 `scripts/db_backup.sh` 文件修改配置参数。

4. **Q: 如何手动清理旧备份？**
   A: 使用 `find /home/ubuntu/andejiazhengcrm/backups/mongodb -name "*.tar.gz" -mtime +30 -delete` 命令删除30天前的备份。 