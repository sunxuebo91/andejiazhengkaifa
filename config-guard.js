#!/usr/bin/env node

/**
 * 配置守护脚本 - 保护重要配置文件不被意外修改
 * Config Guard - Protect critical configuration files from accidental modification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const chokidar = require('chokidar');

class ConfigGuard {
  constructor() {
    // 需要保护的关键配置文件
    this.protectedFiles = [
      // 环境配置
      'frontend/.env.prod',
      'frontend/.env.dev', 
      'backend/.env.prod',
      'backend/.env.dev',
      
      // PM2配置
      'ecosystem.config.js',
      'frontend/ecosystem.config.js',
      'backend/ecosystem.config.js',
      'frontend/ecosystem.config.prod.js',
      'frontend/ecosystem.config.dev.js', 
      'backend/ecosystem.config.prod.js',
      'backend/ecosystem.config.dev.js',
      
      // 部署脚本
      'deploy.sh',
      'pm2-deploy.sh', 
      'startup.sh',
      
      // 数据库配置
      'backend/src/config/database.config.ts',
      'backend/src/config/app.config.ts',
      
      // Nginx配置
      'nginx/conf.d/prod.conf',
      'nginx/conf.d/dev.conf',
      
      // 安全相关
      'backend/src/modules/auth/jwt.strategy.ts',
      'backend/src/modules/auth/auth.module.ts',
      
      // 核心业务配置
      'backend/src/main.ts',
      'frontend/vite.config.ts',
      
      // 项目配置
      'package.json',
      'frontend/package.json', 
      'backend/package.json'
    ];
    
    // 文件指纹存储
    this.baselineDir = path.join(__dirname, '.config-baseline');
    this.fingerprintsFile = path.join(this.baselineDir, 'file-fingerprints.json');
    this.logFile = path.join(__dirname, 'config-guard.log');
    
    // 配置变更历史
    this.changeHistoryFile = path.join(this.baselineDir, 'change-history.json');
    
    // 监控状态
    this.isWatching = false;
    this.watcher = null;
    
    // 初始化
    this.init();
  }
  
  init() {
    // 创建基线目录
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }
    
    this.log('配置守护初始化完成');
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }
  
  // 计算文件哈希
  calculateHash(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      this.log(`计算文件哈希失败 ${filePath}: ${error.message}`);
      return null;
    }
  }
  
  // 创建配置基线
  createBaseline() {
    this.log('开始创建配置基线...');
    const fingerprints = {};
    
    for (const file of this.protectedFiles) {
      const fullPath = path.resolve(file);
      const hash = this.calculateHash(fullPath);
      
      if (hash) {
        fingerprints[file] = {
          hash,
          size: fs.statSync(fullPath).size,
          mtime: fs.statSync(fullPath).mtime.toISOString(),
          protected: true
        };
        this.log(`✓ 已记录配置文件: ${file}`);
      } else {
        this.log(`⚠ 文件不存在，跳过: ${file}`);
      }
    }
    
    // 保存指纹
    fs.writeFileSync(this.fingerprintsFile, JSON.stringify(fingerprints, null, 2));
    this.log(`配置基线已保存: ${Object.keys(fingerprints).length} 个文件`);
  }
  
  // 加载配置基线
  loadBaseline() {
    try {
      if (!fs.existsSync(this.fingerprintsFile)) {
        this.log('基线文件不存在，请先运行 createBaseline');
        return null;
      }
      return JSON.parse(fs.readFileSync(this.fingerprintsFile, 'utf8'));
    } catch (error) {
      this.log(`加载基线失败: ${error.message}`);
      return null;
    }
  }
  
  // 检查配置完整性
  checkIntegrity() {
    this.log('开始检查配置完整性...');
    const baseline = this.loadBaseline();
    if (!baseline) return false;
    
    let hasChanges = false;
    const changes = [];
    
    for (const [file, baselineInfo] of Object.entries(baseline)) {
      const fullPath = path.resolve(file);
      const currentHash = this.calculateHash(fullPath);
      
      if (!currentHash) {
        this.log(`❌ 文件已删除: ${file}`);
        changes.push({ file, type: 'deleted' });
        hasChanges = true;
        continue;
      }
      
      if (currentHash !== baselineInfo.hash) {
        this.log(`❌ 文件已修改: ${file}`);
        changes.push({ 
          file, 
          type: 'modified',
          oldHash: baselineInfo.hash,
          newHash: currentHash
        });
        hasChanges = true;
      } else {
        this.log(`✓ 文件完整: ${file}`);
      }
    }
    
    if (hasChanges) {
      this.recordChanges(changes);
      return false;
    }
    
    this.log('✅ 所有配置文件完整性检查通过');
    return true;
  }
  
  // 记录变更历史
  recordChanges(changes) {
    const timestamp = new Date().toISOString();
    const historyEntry = {
      timestamp,
      changes,
      count: changes.length
    };
    
    let history = [];
    if (fs.existsSync(this.changeHistoryFile)) {
      try {
        history = JSON.parse(fs.readFileSync(this.changeHistoryFile, 'utf8'));
      } catch (error) {
        this.log(`读取变更历史失败: ${error.message}`);
      }
    }
    
    history.push(historyEntry);
    
    // 只保留最近100条记录
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    fs.writeFileSync(this.changeHistoryFile, JSON.stringify(history, null, 2));
    this.log(`变更历史已记录: ${changes.length} 个文件`);
  }
  
  // 恢复配置文件
  restoreFile(filePath) {
    const backupDir = path.join(this.baselineDir, 'backups');
    const backupFile = path.join(backupDir, filePath.replace(/[\/\\]/g, '_'));
    
    if (!fs.existsSync(backupFile)) {
      this.log(`❌ 备份文件不存在: ${backupFile}`);
      return false;
    }
    
    try {
      const fullPath = path.resolve(filePath);
      fs.copyFileSync(backupFile, fullPath);
      this.log(`✅ 文件已恢复: ${filePath}`);
      return true;
    } catch (error) {
      this.log(`恢复文件失败 ${filePath}: ${error.message}`);
      return false;
    }
  }
  
  // 备份当前配置
  backupConfigs() {
    this.log('开始备份当前配置...');
    const backupDir = path.join(this.baselineDir, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    let backupCount = 0;
    for (const file of this.protectedFiles) {
      const fullPath = path.resolve(file);
      if (fs.existsSync(fullPath)) {
        const backupFile = path.join(backupDir, file.replace(/[\/\\]/g, '_'));
        try {
          fs.copyFileSync(fullPath, backupFile);
          backupCount++;
        } catch (error) {
          this.log(`备份文件失败 ${file}: ${error.message}`);
        }
      }
    }
    
    this.log(`配置备份完成: ${backupCount} 个文件`);
  }
  
  // 开始监控
  startWatching() {
    if (this.isWatching) {
      this.log('监控已在运行中');
      return;
    }
    
    const baseline = this.loadBaseline();
    if (!baseline) {
      this.log('请先创建配置基线');
      return;
    }
    
    this.log('开始监控配置文件变更...');
    
    // 监控所有保护的文件
    const watchPaths = this.protectedFiles.filter(file => fs.existsSync(path.resolve(file)));
    
    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      atomic: 500 // 延迟500ms处理，避免频繁触发
    });
    
    this.watcher
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileDelete(filePath))
      .on('error', (error) => this.log(`监控错误: ${error.message}`));
    
    this.isWatching = true;
    this.log(`✅ 开始监控 ${watchPaths.length} 个配置文件`);
  }
  
  // 停止监控
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
    this.log('监控已停止');
  }
  
  // 处理文件变更
  handleFileChange(filePath) {
    this.log(`🚨 检测到文件变更: ${filePath}`);
    
    const relativePath = path.relative(process.cwd(), filePath);
    const baseline = this.loadBaseline();
    
    if (!baseline || !baseline[relativePath]) {
      return;
    }
    
    const currentHash = this.calculateHash(filePath);
    const baselineHash = baseline[relativePath].hash;
    
    if (currentHash !== baselineHash) {
      this.log(`❌ 配置文件被未授权修改: ${relativePath}`);
      this.log(`原始哈希: ${baselineHash}`);
      this.log(`当前哈希: ${currentHash}`);
      
      // 询问是否需要恢复
      this.promptRestore(relativePath);
    }
  }
  
  // 处理文件删除
  handleFileDelete(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    this.log(`🚨 配置文件被删除: ${relativePath}`);
    this.promptRestore(relativePath);
  }
  
  // 提示恢复选项
  promptRestore(filePath) {
    console.log('\n⚠️  检测到关键配置文件变更!');
    console.log(`文件: ${filePath}`);
    console.log('\n选择操作:');
    console.log('1. 恢复到基线版本 (推荐)');
    console.log('2. 接受变更并更新基线');
    console.log('3. 忽略此次变更');
    
    // 在实际部署中，这里可以集成更复杂的决策逻辑
    // 比如自动恢复关键文件，或发送告警通知
  }
  
  // 生成完整性报告
  generateReport() {
    this.log('生成配置完整性报告...');
    
    const baseline = this.loadBaseline();
    if (!baseline) {
      this.log('基线不存在，无法生成报告');
      return;
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      totalFiles: this.protectedFiles.length,
      protectedFiles: Object.keys(baseline).length,
      integrity: {},
      summary: {
        intact: 0,
        modified: 0,
        missing: 0
      }
    };
    
    for (const [file, baselineInfo] of Object.entries(baseline)) {
      const fullPath = path.resolve(file);
      const currentHash = this.calculateHash(fullPath);
      
      if (!currentHash) {
        report.integrity[file] = { status: 'missing' };
        report.summary.missing++;
      } else if (currentHash === baselineInfo.hash) {
        report.integrity[file] = { status: 'intact' };
        report.summary.intact++;
      } else {
        report.integrity[file] = { 
          status: 'modified',
          baselineHash: baselineInfo.hash,
          currentHash: currentHash
        };
        report.summary.modified++;
      }
    }
    
    const reportFile = path.join(this.baselineDir, `integrity-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`完整性报告已生成: ${reportFile}`);
    this.log(`状态统计 - 完整: ${report.summary.intact}, 修改: ${report.summary.modified}, 缺失: ${report.summary.missing}`);
    
    return report;
  }
}

// 命令行接口
function main() {
  const guard = new ConfigGuard();
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
    case 'baseline':
      guard.backupConfigs();
      guard.createBaseline();
      break;
      
    case 'check':
      guard.checkIntegrity();
      break;
      
    case 'watch':
      guard.startWatching();
      
      // 保持进程运行
      process.on('SIGINT', () => {
        console.log('\n收到停止信号，关闭监控...');
        guard.stopWatching();
        process.exit(0);
      });
      
      // 防止进程退出
      setInterval(() => {}, 1000);
      break;
      
    case 'backup':
      guard.backupConfigs();
      break;
      
    case 'report':
      guard.generateReport();
      break;
      
    case 'restore':
      const filePath = process.argv[3];
      if (!filePath) {
        console.log('请指定要恢复的文件路径');
        process.exit(1);
      }
      guard.restoreFile(filePath);
      break;
      
    default:
      console.log(`
配置守护脚本 v1.0

用法: node config-guard.js <command> [options]

命令:
  init        初始化配置基线（包含备份）
  check       检查配置完整性
  watch       开始监控配置文件变更
  backup      备份当前配置文件
  report      生成完整性报告
  restore     恢复指定文件 <filepath>

示例:
  node config-guard.js init           # 初始化保护
  node config-guard.js check          # 检查完整性
  node config-guard.js watch          # 开始监控
  node config-guard.js restore deploy.sh  # 恢复文件

守护范围:
  - 环境配置文件 (.env*)
  - PM2配置文件 (ecosystem.config.js)
  - 部署脚本 (deploy.sh, pm2-deploy.sh)
  - 核心业务配置文件
  - 数据库和认证配置
      `);
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = ConfigGuard; 