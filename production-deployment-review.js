#!/usr/bin/env node

/**
 * 生产环境部署审查 MCP 服务
 * 用于全面审查生产环境部署准备情况
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const header = (message) => {
  log('\n' + '='.repeat(60), 'cyan');
  log(`🚀 ${message}`, 'cyan');
  log('='.repeat(60), 'cyan');
};

const section = (message) => {
  log(`\n📋 ${message}`, 'blue');
  log('-'.repeat(50), 'blue');
};

const check = (message, status, details = '') => {
  const icon = status ? '✅' : '❌';
  const color = status ? 'green' : 'red';
  log(`${icon} ${message}`, color);
  if (details) {
    log(`   ${details}`, 'white');
  }
};

const warn = (message, details = '') => {
  log(`⚠️  ${message}`, 'yellow');
  if (details) {
    log(`   ${details}`, 'white');
  }
};

class ProductionDeploymentReviewer {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0
    };
    this.criticalIssues = [];
    this.warnings = [];
  }

  // 检查代码质量和构建状态
  checkCodeQuality() {
    section('代码质量检查');
    
    try {
      // 检查是否有未提交的更改
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus.trim() === '') {
        check('Git工作区清洁', true, '没有未提交的更改');
        this.results.passed++;
      } else {
        check('Git工作区清洁', false, '存在未提交的更改');
        this.results.failed++;
        this.criticalIssues.push('存在未提交的代码更改');
      }
    } catch (error) {
      check('Git状态检查', false, error.message);
      this.results.failed++;
    }

    // 检查当前标签
    try {
      const currentTag = execSync('git describe --exact-match --tags HEAD 2>/dev/null || echo "no-tag"', { encoding: 'utf8' }).trim();
      if (currentTag !== 'no-tag') {
        check('版本标签', true, `当前版本: ${currentTag}`);
        this.results.passed++;
      } else {
        warn('版本标签', '当前提交没有版本标签');
        this.results.warnings++;
        this.warnings.push('建议为当前版本创建版本标签');
      }
    } catch (error) {
      warn('版本标签检查', error.message);
      this.results.warnings++;
    }

    this.results.total += 2;
  }

  // 检查依赖和构建
  checkDependenciesAndBuild() {
    section('依赖和构建检查');

    // 检查后端依赖
    try {
      const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
      check('后端package.json', true, `版本: ${backendPackage.version}`);
      this.results.passed++;
    } catch (error) {
      check('后端package.json', false, '文件读取失败');
      this.results.failed++;
      this.criticalIssues.push('后端package.json文件不存在或损坏');
    }

    // 检查前端依赖
    try {
      const frontendPackage = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
      check('前端package.json', true, `版本: ${frontendPackage.version}`);
      this.results.passed++;
    } catch (error) {
      check('前端package.json', false, '文件读取失败');
      this.results.failed++;
      this.criticalIssues.push('前端package.json文件不存在或损坏');
    }

    // 检查构建文件
    const backendBuildExists = fs.existsSync('backend/dist');
    check('后端构建目录', backendBuildExists, backendBuildExists ? '构建文件存在' : '需要执行构建');
    if (backendBuildExists) {
      this.results.passed++;
    } else {
      this.results.failed++;
      this.criticalIssues.push('后端未构建，需要执行 npm run build');
    }

    const frontendBuildExists = fs.existsSync('frontend/dist') || fs.existsSync('frontend/build');
    check('前端构建目录', frontendBuildExists, frontendBuildExists ? '构建文件存在' : '需要执行构建');
    if (frontendBuildExists) {
      this.results.passed++;
    } else {
      this.results.failed++;
      this.criticalIssues.push('前端未构建，需要执行 npm run build');
    }

    this.results.total += 4;
  }

  // 检查环境配置
  checkEnvironmentConfig() {
    section('环境配置检查');

    // 检查生产环境配置文件
    const prodConfigFiles = [
      'backend/.env.production',
      'backend/src/config/production.config.js',
      'ecosystem.config.js'
    ];

    prodConfigFiles.forEach(file => {
      const exists = fs.existsSync(file);
      check(`配置文件: ${file}`, exists, exists ? '文件存在' : '文件缺失');
      if (exists) {
        this.results.passed++;
      } else {
        this.results.failed++;
        this.criticalIssues.push(`缺少生产环境配置文件: ${file}`);
      }
      this.results.total++;
    });

    // 检查PM2配置
    try {
      const pm2Config = require('./ecosystem.config.js');
      const hasProdApp = pm2Config.apps.some(app => app.name.includes('prod'));
      check('PM2生产环境配置', hasProdApp, hasProdApp ? '包含生产环境应用配置' : '缺少生产环境配置');
      if (hasProdApp) {
        this.results.passed++;
      } else {
        this.results.failed++;
        this.criticalIssues.push('PM2配置中缺少生产环境应用定义');
      }
    } catch (error) {
      check('PM2配置文件', false, error.message);
      this.results.failed++;
      this.criticalIssues.push('PM2配置文件无法加载');
    }
    this.results.total++;
  }

  // 检查安全性
  checkSecurity() {
    section('安全性检查');

    // 检查敏感文件
    const sensitiveFiles = [
      '.env',
      'backend/.env',
      'frontend/.env',
      'backend/.env.local',
      'frontend/.env.local'
    ];

    sensitiveFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const hasSecrets = content.includes('password') || content.includes('secret') || content.includes('key');
          if (hasSecrets) {
            warn(`敏感文件检查: ${file}`, '包含敏感信息，确保不会暴露');
            this.results.warnings++;
            this.warnings.push(`${file} 包含敏感信息`);
          } else {
            check(`敏感文件检查: ${file}`, true, '文件安全');
            this.results.passed++;
          }
        } catch (error) {
          warn(`敏感文件检查: ${file}`, '无法读取文件');
          this.results.warnings++;
        }
        this.results.total++;
      }
    });

    // 检查node_modules是否被忽略
    try {
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      const ignoresNodeModules = gitignore.includes('node_modules');
      check('node_modules忽略', ignoresNodeModules, ignoresNodeModules ? '已正确忽略' : '建议添加到.gitignore');
      if (ignoresNodeModules) {
        this.results.passed++;
      } else {
        this.results.warnings++;
        this.warnings.push('建议在.gitignore中添加node_modules');
      }
    } catch (error) {
      warn('.gitignore检查', '文件不存在或无法读取');
      this.results.warnings++;
    }
    this.results.total++;
  }

  // 检查服务状态
  checkServiceStatus() {
    section('服务状态检查');

    try {
      // 检查PM2状态
      const pm2Status = execSync('pm2 jlist 2>/dev/null || echo "[]"', { encoding: 'utf8' });
      const processes = JSON.parse(pm2Status);
      
      const runningProcesses = processes.filter(p => p.pm2_env.status === 'online');
      check('PM2服务状态', runningProcesses.length > 0, `${runningProcesses.length} 个进程运行中`);
      if (runningProcesses.length > 0) {
        this.results.passed++;
      } else {
        this.results.warnings++;
        this.warnings.push('没有PM2进程运行，生产环境需要启动服务');
      }
    } catch (error) {
      warn('PM2状态检查', 'PM2可能未安装或未运行');
      this.results.warnings++;
    }
    this.results.total++;

    // 检查端口占用
    const checkPort = (port, service) => {
      try {
        execSync(`netstat -tlnp | grep :${port} >/dev/null 2>&1`);
        check(`端口${port}检查 (${service})`, true, '端口已被占用');
        this.results.passed++;
      } catch (error) {
        warn(`端口${port}检查 (${service})`, '端口未被占用，服务可能未启动');
        this.results.warnings++;
        this.warnings.push(`${service}服务(端口${port})可能未启动`);
      }
      this.results.total++;
    };

    checkPort(3001, '后端API');
    checkPort(3000, '前端');
  }

  // 检查数据库连接
  checkDatabase() {
    section('数据库连接检查');

    // 这里可以添加具体的数据库连接检查
    // 由于没有具体的数据库配置，我们检查配置文件
    try {
      const backendFiles = fs.readdirSync('backend/src');
      const hasDbConfig = backendFiles.some(file => file.includes('database') || file.includes('db'));
      check('数据库配置', hasDbConfig, hasDbConfig ? '找到数据库相关配置' : '未找到数据库配置');
      if (hasDbConfig) {
        this.results.passed++;
      } else {
        this.results.warnings++;
        this.warnings.push('未找到明确的数据库配置文件');
      }
    } catch (error) {
      warn('数据库配置检查', '无法检查后端配置目录');
      this.results.warnings++;
    }
    this.results.total++;
  }

  // 生成报告
  generateReport() {
    header('生产环境部署审查报告');

    log(`\n📊 检查统计:`, 'white');
    log(`   总检查项目: ${this.results.total}`, 'white');
    log(`   ✅ 通过: ${this.results.passed}`, 'green');
    log(`   ❌ 失败: ${this.results.failed}`, 'red');
    log(`   ⚠️  警告: ${this.results.warnings}`, 'yellow');

    const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    log(`\n通过率: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');

    if (this.criticalIssues.length > 0) {
      log('\n🚨 关键问题 (必须解决):', 'red');
      this.criticalIssues.forEach((issue, index) => {
        log(`   ${index + 1}. ${issue}`, 'red');
      });
    }

    if (this.warnings.length > 0) {
      log('\n⚠️  警告 (建议解决):', 'yellow');
      this.warnings.forEach((warning, index) => {
        log(`   ${index + 1}. ${warning}`, 'yellow');
      });
    }

    // 部署建议
    log('\n🚀 部署建议:', 'cyan');
    if (this.results.failed === 0) {
      log('   ✅ 系统已准备好生产环境部署', 'green');
      log('   💡 建议：执行最终测试后即可部署', 'green');
    } else {
      log('   ❌ 系统尚未准备好生产环境部署', 'red');
      log('   💡 建议：解决所有关键问题后再进行部署', 'red');
    }

    // 部署命令建议
    log('\n📋 部署命令:', 'blue');
    log('   1. 构建应用: npm run build (在backend和frontend目录)', 'white');
    log('   2. 启动生产服务: ./pm2-deploy.sh prod start', 'white');
    log('   3. 检查服务状态: ./pm2-deploy.sh prod status', 'white');
    log('   4. 查看日志: ./pm2-deploy.sh prod logs', 'white');

    return {
      canDeploy: this.results.failed === 0,
      score: passRate,
      critical: this.criticalIssues.length,
      warnings: this.warnings.length
    };
  }

  // 执行完整审查
  runFullReview() {
    header('生产环境部署审查开始');
    log('正在进行全面的生产环境部署准备检查...', 'white');

    this.checkCodeQuality();
    this.checkDependenciesAndBuild();
    this.checkEnvironmentConfig();
    this.checkSecurity();
    this.checkServiceStatus();
    this.checkDatabase();

    return this.generateReport();
  }
}

// 执行审查
const reviewer = new ProductionDeploymentReviewer();
const result = reviewer.runFullReview();

// 输出JSON格式的结果供MCP使用
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
}

// 设置退出码
process.exit(result.canDeploy ? 0 : 1); 