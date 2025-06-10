#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class AtomicDevGuard {
  constructor() {
    this.config = null;
    this.currentModule = null;
    this.attempts = new Map();
    this.backups = new Map();
    this.logFile = path.join(process.cwd(), 'atomic-dev.log');
  }

  async init() {
    try {
      const configPath = path.join(process.cwd(), 'atomic-dev-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData).atomicDevelopment;
      await this.log('🚀 原子性开发守护器已启动');
    } catch (error) {
      console.error('❌ 配置文件加载失败:', error.message);
      process.exit(1);
    }
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    await fs.appendFile(this.logFile, logEntry);
    console.log(message);
  }

  async startModule(moduleName, moduleType = 'nestjs-module', targetPaths = []) {
    await this.log(`🎯 开始原子性模块开发: ${moduleName}`);
    
    this.currentModule = {
      name: moduleName,
      type: moduleType,
      paths: targetPaths,
      startTime: Date.now(),
      backupId: crypto.randomUUID()
    };

    // 重置尝试计数
    this.attempts.set(moduleName, 0);

    // 创建备份点
    if (this.config.rollbackStrategy.backupBeforeStart) {
      await this.createBackup();
    }

    // Git集成
    if (this.config.rollbackStrategy.gitIntegration) {
      await this.createGitCheckpoint();
    }

    await this.log(`📦 模块 "${moduleName}" 准备就绪，开始开发...`);
    return this.currentModule.backupId;
  }

  async createBackup() {
    const backupDir = path.join(process.cwd(), '.atomic-backups', this.currentModule.backupId);
    await fs.mkdir(backupDir, { recursive: true });

    for (const targetPath of this.currentModule.paths) {
      const fullPath = path.join(process.cwd(), targetPath);
      const backupPath = path.join(backupDir, targetPath);
      
      try {
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(fullPath, backupPath);
      } catch (error) {
        // 文件可能不存在，这是正常的（新模块）
      }
    }

    this.backups.set(this.currentModule.name, backupDir);
    await this.log(`💾 备份已创建: ${backupDir}`);
  }

  async createGitCheckpoint() {
    try {
      const commitMessage = `🔄 ATOMIC_DEV_CHECKPOINT: ${this.currentModule.name}`;
      execSync(`git add -A && git commit -m "${commitMessage}"`, { stdio: 'pipe' });
      await this.log(`📌 Git检查点已创建`);
    } catch (error) {
      await this.log(`⚠️ Git检查点创建失败: ${error.message}`);
    }
  }

  async validateModule() {
    if (!this.currentModule) {
      throw new Error('没有活动的模块开发会话');
    }

    const moduleName = this.currentModule.name;
    const currentAttempt = this.attempts.get(moduleName) + 1;
    this.attempts.set(moduleName, currentAttempt);

    await this.log(`🔍 开始验证模块 "${moduleName}" (第${currentAttempt}次尝试)`);

    const validationResults = {
      success: true,
      errors: [],
      warnings: [],
      details: {}
    };

    // 执行所有验证规则
    for (const [ruleName, rule] of Object.entries(this.config.validationRules)) {
      if (!rule.enabled) continue;

      try {
        await this.log(`  检查: ${ruleName}...`);
        const result = await this.runValidationRule(ruleName, rule);
        validationResults.details[ruleName] = result;

        if (!result.success && rule.required) {
          validationResults.success = false;
          validationResults.errors.push({
            rule: ruleName,
            message: result.error,
            weight: rule.weight
          });
        } else if (!result.success) {
          validationResults.warnings.push({
            rule: ruleName,
            message: result.error,
            weight: rule.weight
          });
        }
      } catch (error) {
        await this.log(`  ❌ 验证规则 "${ruleName}" 执行失败: ${error.message}`);
        if (rule.required) {
          validationResults.success = false;
          validationResults.errors.push({
            rule: ruleName,
            message: error.message,
            weight: rule.weight
          });
        }
      }
    }

    // 处理验证结果
    if (validationResults.success) {
      await this.handleSuccess();
    } else {
      await this.handleFailure(validationResults, currentAttempt);
    }

    return validationResults;
  }

  async runValidationRule(ruleName, rule) {
    switch (ruleName) {
      case 'typescript':
        return await this.runCommand(rule.command);
      
      case 'eslint':
        return await this.runCommand(rule.command + ' ' + this.currentModule.paths.join(' '));
      
      case 'tests':
        return await this.runCommand(rule.command, rule.timeout);
      
      case 'prettier':
        return await this.runCommand(rule.command + ' ' + this.currentModule.paths.join(' '));
      
      case 'imports':
        return await this.checkImports();
      
      default:
        return await this.runCommand(rule.command);
    }
  }

  async runCommand(command, timeout = 10000) {
    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout 
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: stderr,
          exitCode: code
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          exitCode: -1
        });
      });
    });
  }

  async checkImports() {
    // 简化的import检查逻辑
    const importIssues = [];
    
    for (const filePath of this.currentModule.paths) {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        
        // 检查未使用的导入
        const imports = content.match(/import\s+.*\s+from\s+['"].*['"];?/g) || [];
        const usedImports = new Set();
        
        imports.forEach(imp => {
          const match = imp.match(/import\s+\{([^}]+)\}/);
          if (match) {
            const importedItems = match[1].split(',').map(item => item.trim());
            importedItems.forEach(item => {
              if (!content.includes(item, imp.length)) {
                importIssues.push(`未使用的导入: ${item} in ${filePath}`);
              }
            });
          }
        });
      } catch (error) {
        // 文件可能不存在
      }
    }

    return {
      success: importIssues.length === 0,
      error: importIssues.join('; '),
      issues: importIssues
    };
  }

  async handleSuccess() {
    await this.log(this.config.notifications.onSuccess);
    
    // 清理备份（如果配置了）
    if (this.config.rollbackStrategy.cleanupOnSuccess) {
      await this.cleanupBackups();
    }

    // 重置状态
    this.currentModule = null;
  }

  async handleFailure(validationResults, currentAttempt) {
    await this.log(this.config.notifications.onFailure);
    await this.log(`💥 验证失败详情:`);
    
    validationResults.errors.forEach(error => {
      this.log(`  ❌ ${error.rule}: ${error.message}`);
    });

    if (currentAttempt >= this.config.maxAttempts) {
      await this.log(this.config.notifications.onMaxAttempts);
      await this.log(`🛑 模块 "${this.currentModule.name}" 开发失败，已达到最大尝试次数`);
      return false;
    }

    // 执行回滚
    if (this.config.autoRollback) {
      await this.rollback();
      await this.log(`🔄 准备第${currentAttempt + 1}次尝试...`);
      return true; // 表示可以重试
    }

    return false;
  }

  async rollback() {
    await this.log(`⏪ 回滚模块 "${this.currentModule.name}"`);

    // Git回滚
    if (this.config.rollbackStrategy.gitIntegration) {
      try {
        execSync('git reset --hard HEAD~1', { stdio: 'pipe' });
        await this.log(`📌 Git状态已回滚`);
      } catch (error) {
        await this.log(`⚠️ Git回滚失败: ${error.message}`);
      }
    }

    // 文件系统回滚
    const backupDir = this.backups.get(this.currentModule.name);
    if (backupDir) {
      try {
        for (const targetPath of this.currentModule.paths) {
          const backupPath = path.join(backupDir, targetPath);
          const fullPath = path.join(process.cwd(), targetPath);
          
          try {
            await fs.copyFile(backupPath, fullPath);
          } catch (error) {
            // 尝试删除可能错误创建的文件
            try {
              await fs.unlink(fullPath);
            } catch (unlinkError) {
              // 忽略删除失败
            }
          }
        }
        await this.log(`💾 文件已从备份恢复`);
      } catch (error) {
        await this.log(`⚠️ 文件恢复失败: ${error.message}`);
      }
    }
  }

  async cleanupBackups() {
    const backupDir = this.backups.get(this.currentModule.name);
    if (backupDir) {
      try {
        await fs.rmdir(backupDir, { recursive: true });
        this.backups.delete(this.currentModule.name);
        await this.log(`🗑️ 备份已清理`);
      } catch (error) {
        await this.log(`⚠️ 备份清理失败: ${error.message}`);
      }
    }
  }

  async status() {
    if (!this.currentModule) {
      console.log('💤 当前没有活动的模块开发会话');
      return;
    }

    const moduleName = this.currentModule.name;
    const currentAttempt = this.attempts.get(moduleName) || 0;
    const maxAttempts = this.config.maxAttempts;

    console.log(`🎯 当前模块: ${moduleName}`);
    console.log(`🔄 尝试次数: ${currentAttempt}/${maxAttempts}`);
    console.log(`⏱️ 开始时间: ${new Date(this.currentModule.startTime).toLocaleString()}`);
    console.log(`📂 目标路径: ${this.currentModule.paths.join(', ')}`);
  }
}

// CLI接口
async function main() {
  const guard = new AtomicDevGuard();
  await guard.init();

  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'start':
      const moduleName = args[0];
      const moduleType = args[1] || 'nestjs-module';
      const targetPaths = args.slice(2);
      await guard.startModule(moduleName, moduleType, targetPaths);
      break;

    case 'validate':
      const result = await guard.validateModule();
      process.exit(result.success ? 0 : 1);
      break;

    case 'status':
      await guard.status();
      break;

    case 'rollback':
      await guard.rollback();
      break;

    default:
      console.log(`
🤖 原子性开发守护器

用法:
  node atomic-dev-guard.js start <模块名> [模块类型] [目标路径...]
  node atomic-dev-guard.js validate
  node atomic-dev-guard.js status
  node atomic-dev-guard.js rollback

示例:
  node atomic-dev-guard.js start customer-management nestjs-module src/modules/customers
  node atomic-dev-guard.js validate
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AtomicDevGuard; 