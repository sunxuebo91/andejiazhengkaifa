#!/usr/bin/env node

/**
 * AI配置守护脚本 - 智能保护配置文件，防止AI误修改
 * AI Config Guard - Intelligently protect configuration files from AI mismodification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const chokidar = require('chokidar');

class AIConfigGuard {
  constructor() {
    // 核心保护文件 - 绝对不允许修改
    this.criticalFiles = [
      'ecosystem.config.js',
      'deploy.sh', 
      'pm2-deploy.sh',
      'startup.sh',
      'backend/src/main.ts',
      'backend/src/modules/auth/jwt.strategy.ts',
      'backend/src/modules/auth/auth.module.ts'
    ];
    
    // 敏感配置文件 - 需要确认才能修改
    this.sensitiveFiles = [
      'frontend/.env.prod',
      'backend/.env.prod',
      'frontend/vite.config.ts', 
      'backend/src/config/database.config.ts',
      'nginx/conf.d/prod.conf'
    ];
    
    // 开发环境文件 - 相对宽松
    this.devFiles = [
      'frontend/.env.dev',
      'backend/.env.dev',
      'nginx/conf.d/dev.conf'
    ];
    
    // AI 活动检测关键词
    this.aiIndicators = [
      'AI', 'assistant', 'claude', 'gpt', 'llm',
      'automated', 'generated', 'auto-', 'cursor',
      'copilot', 'suggestion', 'completion'
    ];
    
    // 保护状态
    this.protectionEnabled = true;
    this.aiDetectionEnabled = true;
    this.strictMode = false; // 严格模式下拒绝所有AI修改
    
    this.baselineDir = path.join(__dirname, '.ai-config-guard');
    this.configFile = path.join(this.baselineDir, 'guard-config.json');
    this.logFile = path.join(__dirname, 'ai-config-guard.log');
    this.policyFile = path.join(this.baselineDir, 'protection-policy.json');
    
    this.init();
  }
  
  init() {
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }
    
    this.loadConfig();
    this.loadProtectionPolicy();
    this.log('AI配置守护初始化完成');
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }
  
  // 加载保护配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        this.protectionEnabled = config.protectionEnabled ?? true;
        this.strictMode = config.strictMode ?? false;
        this.aiDetectionEnabled = config.aiDetectionEnabled ?? true;
      }
    } catch (error) {
      this.log(`加载配置失败: ${error.message}`, 'ERROR');
    }
  }
  
  // 保存配置
  saveConfig() {
    const config = {
      protectionEnabled: this.protectionEnabled,
      strictMode: this.strictMode,
      aiDetectionEnabled: this.aiDetectionEnabled,
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
  }
  
  // 加载保护策略
  loadProtectionPolicy() {
    try {
      if (fs.existsSync(this.policyFile)) {
        const policy = JSON.parse(fs.readFileSync(this.policyFile, 'utf8'));
        if (policy.criticalFiles) this.criticalFiles = policy.criticalFiles;
        if (policy.sensitiveFiles) this.sensitiveFiles = policy.sensitiveFiles;
        if (policy.devFiles) this.devFiles = policy.devFiles;
      } else {
        this.saveProtectionPolicy();
      }
    } catch (error) {
      this.log(`加载保护策略失败: ${error.message}`, 'ERROR');
    }
  }
  
  // 保存保护策略
  saveProtectionPolicy() {
    const policy = {
      criticalFiles: this.criticalFiles,
      sensitiveFiles: this.sensitiveFiles,
      devFiles: this.devFiles,
      description: {
        criticalFiles: "绝对不允许修改的核心文件",
        sensitiveFiles: "需要确认才能修改的敏感文件", 
        devFiles: "开发环境相对宽松的文件"
      },
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(this.policyFile, JSON.stringify(policy, null, 2));
  }
  
  // 检测是否为AI活动
  detectAIActivity() {
    try {
      // 检查环境变量
      const userAgent = process.env.USER_AGENT || '';
      const editor = process.env.EDITOR || process.env.VISUAL || '';
      const term = process.env.TERM_PROGRAM || '';
      
      // 检查当前工作环境
      const envCheck = [userAgent, editor, term, process.title].join(' ').toLowerCase();
      
      for (const indicator of this.aiIndicators) {
        if (envCheck.includes(indicator.toLowerCase())) {
          return {
            isAI: true,
            confidence: 0.8,
            indicator: indicator,
            source: 'environment'
          };
        }
      }
      
      // 检查最近的git提交信息
      try {
        const { execSync } = require('child_process');
        const lastCommit = execSync('git log -1 --pretty=%B', { encoding: 'utf8', timeout: 1000 });
        
        for (const indicator of this.aiIndicators) {
          if (lastCommit.toLowerCase().includes(indicator.toLowerCase())) {
            return {
              isAI: true,
              confidence: 0.9,
              indicator: indicator,
              source: 'git_commit'
            };
          }
        }
      } catch (error) {
        // Git检查失败，忽略
      }
      
      return { isAI: false, confidence: 0 };
    } catch (error) {
      this.log(`AI检测失败: ${error.message}`, 'ERROR');
      return { isAI: false, confidence: 0 };
    }
  }
  
  // 获取文件保护等级
  getFileProtectionLevel(filePath) {
    const normalizedPath = path.normalize(filePath);
    
    if (this.criticalFiles.some(f => normalizedPath.includes(f) || normalizedPath.endsWith(f))) {
      return 'critical';
    }
    
    if (this.sensitiveFiles.some(f => normalizedPath.includes(f) || normalizedPath.endsWith(f))) {
      return 'sensitive';
    }
    
    if (this.devFiles.some(f => normalizedPath.includes(f) || normalizedPath.endsWith(f))) {
      return 'dev';
    }
    
    return 'normal';
  }
  
  // 智能决策是否允许修改
  async shouldAllowModification(filePath, aiDetection) {
    const protectionLevel = this.getFileProtectionLevel(filePath);
    
    this.log(`文件保护检查: ${filePath} [等级: ${protectionLevel}]`);
    
    // 如果保护被禁用
    if (!this.protectionEnabled) {
      this.log('保护已禁用，允许修改', 'WARN');
      return { allow: true, reason: 'protection_disabled' };
    }
    
    // 严格模式下，如果检测到AI活动就拒绝
    if (this.strictMode && aiDetection.isAI) {
      this.log(`严格模式: 拒绝AI修改 [置信度: ${aiDetection.confidence}]`, 'WARN');
      return { 
        allow: false, 
        reason: 'strict_mode_ai_detected',
        details: aiDetection 
      };
    }
    
    // 核心文件保护
    if (protectionLevel === 'critical') {
      if (aiDetection.isAI && aiDetection.confidence > 0.7) {
        this.log(`🚫 拒绝AI修改核心文件: ${filePath}`, 'ERROR');
        return { 
          allow: false, 
          reason: 'critical_file_ai_protection',
          message: '核心配置文件不允许AI修改'
        };
      }
      
      // 即使不是AI，核心文件也需要确认
      if (this.requiresConfirmation()) {
        const confirmed = await this.promptConfirmation(filePath, protectionLevel, aiDetection);
        return { 
          allow: confirmed, 
          reason: confirmed ? 'user_confirmed' : 'user_rejected' 
        };
      }
    }
    
    // 敏感文件保护
    if (protectionLevel === 'sensitive') {
      if (aiDetection.isAI && aiDetection.confidence > 0.6) {
        const confirmed = await this.promptConfirmation(filePath, protectionLevel, aiDetection);
        return { 
          allow: confirmed, 
          reason: confirmed ? 'user_confirmed_ai' : 'user_rejected_ai' 
        };
      }
    }
    
    // 开发文件相对宽松
    if (protectionLevel === 'dev') {
      if (aiDetection.isAI && aiDetection.confidence > 0.8) {
        this.log(`⚠️  AI修改开发文件: ${filePath} [置信度: ${aiDetection.confidence}]`, 'WARN');
        // 记录但允许
        return { allow: true, reason: 'dev_file_ai_allowed' };
      }
    }
    
    return { allow: true, reason: 'normal_modification' };
  }
  
  // 检查是否需要确认
  requiresConfirmation() {
    // 在交互环境中才需要确认
    return process.stdin.isTTY && process.stdout.isTTY;
  }
  
  // 提示确认
  async promptConfirmation(filePath, protectionLevel, aiDetection) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      console.log('\n🛡️  配置文件保护触发!');
      console.log(`文件: ${filePath}`);
      console.log(`保护等级: ${protectionLevel}`);
      console.log(`AI检测: ${aiDetection.isAI ? '是' : '否'} (置信度: ${aiDetection.confidence})`);
      
      if (aiDetection.isAI) {
        console.log(`检测源: ${aiDetection.source}`);
        console.log(`触发指标: ${aiDetection.indicator}`);
      }
      
      console.log('\n选择操作:');
      console.log('y/yes - 允许修改');
      console.log('n/no  - 拒绝修改');
      console.log('a/always - 总是允许 (禁用此文件保护)');
      console.log('s/strict - 启用严格模式 (拒绝所有AI修改)');
      
      rl.question('\n您的选择 [n]: ', (answer) => {
        rl.close();
        
        const choice = (answer || 'n').toLowerCase();
        
        switch (choice) {
          case 'y':
          case 'yes':
            this.log(`用户确认允许修改: ${filePath}`);
            resolve(true);
            break;
            
          case 'a':
          case 'always':
            this.log(`用户选择总是允许: ${filePath}`);
            this.addToWhitelist(filePath);
            resolve(true);
            break;
            
          case 's':
          case 'strict':
            this.log('用户启用严格模式');
            this.strictMode = true;
            this.saveConfig();
            resolve(false);
            break;
            
          default:
            this.log(`用户拒绝修改: ${filePath}`);
            resolve(false);
        }
      });
    });
  }
  
  // 添加到白名单
  addToWhitelist(filePath) {
    // 从保护列表中移除
    this.criticalFiles = this.criticalFiles.filter(f => !filePath.includes(f));
    this.sensitiveFiles = this.sensitiveFiles.filter(f => !filePath.includes(f));
    this.saveProtectionPolicy();
    this.log(`文件已添加到白名单: ${filePath}`);
  }
  
  // 检查文件修改
  async checkFileModification(filePath) {
    if (!this.protectionEnabled) {
      return { allow: true };
    }
    
    const aiDetection = this.aiDetectionEnabled ? this.detectAIActivity() : { isAI: false };
    const decision = await this.shouldAllowModification(filePath, aiDetection);
    
    // 记录决策
    this.logDecision(filePath, aiDetection, decision);
    
    return decision;
  }
  
  // 记录决策
  logDecision(filePath, aiDetection, decision) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      filePath,
      aiDetection,
      decision,
      protectionLevel: this.getFileProtectionLevel(filePath)
    };
    
    const decisionLogFile = path.join(this.baselineDir, 'decisions.log');
    fs.appendFileSync(decisionLogFile, JSON.stringify(logEntry) + '\n');
  }
  
  // 开始监控
  startWatching() {
    const allProtectedFiles = [
      ...this.criticalFiles,
      ...this.sensitiveFiles,
      ...this.devFiles
    ];
    
    // 过滤存在的文件
    const watchPaths = allProtectedFiles.filter(file => {
      const fullPath = path.resolve(file);
      return fs.existsSync(fullPath);
    });
    
    if (watchPaths.length === 0) {
      this.log('没有找到需要监控的文件', 'WARN');
      return;
    }
    
    this.log(`开始监控 ${watchPaths.length} 个配置文件...`);
    
    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      atomic: 300
    });
    
    this.watcher
      .on('change', async (filePath) => {
        this.log(`检测到文件变更: ${filePath}`);
        const decision = await this.checkFileModification(filePath);
        
        if (!decision.allow) {
          this.log(`🚫 拒绝文件修改: ${filePath} - ${decision.reason}`, 'ERROR');
          
          // 在实际环境中，这里可以执行恢复操作
          // 比如从git恢复或使用备份文件
          
          if (decision.message) {
            console.log(`\n❌ ${decision.message}`);
          }
        } else {
          this.log(`✅ 允许文件修改: ${filePath} - ${decision.reason}`);
        }
      })
      .on('error', (error) => {
        this.log(`监控错误: ${error.message}`, 'ERROR');
      });
    
    this.log(`✅ AI配置守护已启动，监控 ${watchPaths.length} 个文件`);
  }
  
  // 停止监控
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.log('监控已停止');
    }
  }
  
  // 显示状态
  showStatus() {
    console.log('\n🛡️  AI配置守护状态');
    console.log('==================');
    console.log(`保护状态: ${this.protectionEnabled ? '启用' : '禁用'}`);
    console.log(`严格模式: ${this.strictMode ? '启用' : '禁用'}`);
    console.log(`AI检测: ${this.aiDetectionEnabled ? '启用' : '禁用'}`);
    console.log(`核心文件: ${this.criticalFiles.length} 个`);
    console.log(`敏感文件: ${this.sensitiveFiles.length} 个`);
    console.log(`开发文件: ${this.devFiles.length} 个`);
    
    const aiDetection = this.detectAIActivity();
    console.log(`\nAI活动检测: ${aiDetection.isAI ? '检测到' : '未检测到'}`);
    if (aiDetection.isAI) {
      console.log(`置信度: ${aiDetection.confidence}`);
      console.log(`检测源: ${aiDetection.source}`);
    }
  }
  
  // 配置命令
  configure(setting, value) {
    switch (setting) {
      case 'protection':
        this.protectionEnabled = value === 'on' || value === 'true';
        this.saveConfig();
        this.log(`保护已${this.protectionEnabled ? '启用' : '禁用'}`);
        break;
        
      case 'strict':
        this.strictMode = value === 'on' || value === 'true';
        this.saveConfig();
        this.log(`严格模式已${this.strictMode ? '启用' : '禁用'}`);
        break;
        
      case 'ai-detection':
        this.aiDetectionEnabled = value === 'on' || value === 'true';
        this.saveConfig();
        this.log(`AI检测已${this.aiDetectionEnabled ? '启用' : '禁用'}`);
        break;
        
      default:
        console.log('可配置选项: protection, strict, ai-detection');
        console.log('值: on/off, true/false');
    }
  }
}

// 命令行接口
function main() {
  const guard = new AIConfigGuard();
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'watch':
    case 'start':
      guard.startWatching();
      
      // 保持进程运行
      process.on('SIGINT', () => {
        console.log('\n收到停止信号，关闭AI守护...');
        guard.stopWatching();
        process.exit(0);
      });
      
      setInterval(() => {}, 1000);
      break;
      
    case 'status':
      guard.showStatus();
      break;
      
    case 'config':
      if (arg1 && arg2) {
        guard.configure(arg1, arg2);
      } else {
        console.log('用法: node ai-config-guard.js config <setting> <value>');
        console.log('设置: protection, strict, ai-detection');
        console.log('值: on/off');
      }
      break;
      
    case 'check':
      const aiDetection = guard.detectAIActivity();
      console.log('AI活动检测结果:');
      console.log(JSON.stringify(aiDetection, null, 2));
      break;
      
    case 'test':
      // 测试模式
      if (arg1) {
        guard.checkFileModification(arg1).then(result => {
          console.log('测试结果:', JSON.stringify(result, null, 2));
        });
      } else {
        console.log('用法: node ai-config-guard.js test <filepath>');
      }
      break;
      
    default:
      console.log(`
🛡️  AI配置守护脚本 v2.0

用法: node ai-config-guard.js <command> [options]

命令:
  watch/start         开始监控配置文件
  status              显示守护状态
  config <key> <val>  修改配置 (protection|strict|ai-detection on/off)
  check               检测当前AI活动
  test <file>         测试文件保护逻辑

保护策略:
  🔴 核心文件 - 绝对保护，AI修改需确认
  🟡 敏感文件 - 高置信度AI修改需确认  
  🟢 开发文件 - 记录AI修改但允许

特性:
  ✅ 智能AI活动检测
  ✅ 分级保护策略
  ✅ 交互式确认
  ✅ 严格模式支持
  ✅ 白名单管理
  ✅ 决策记录

示例:
  node ai-config-guard.js watch           # 开始守护
  node ai-config-guard.js config strict on    # 启用严格模式
  node ai-config-guard.js status          # 查看状态
      `);
  }
}

if (require.main === module) {
  main();
}

module.exports = AIConfigGuard; 