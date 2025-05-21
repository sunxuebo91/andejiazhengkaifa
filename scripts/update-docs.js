#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const moment = require('moment');

// 文档路径配置
const DOCS = {
  development: path.join(__dirname, '../docs/DEVELOPMENT.md'),
  changelog: path.join(__dirname, '../docs/CHANGELOG.md'),
  api: path.join(__dirname, '../backend/src/docs/API_SPEC.md'),
  database: path.join(__dirname, '../backend/src/docs/DATABASE_SCHEMA.md')
};

// 获取Git变更信息
function getGitChanges() {
  try {
    const lastCommit = execSync('git log -1 --pretty=format:"%h|%s|%an|%ad" --date=short').toString();
    const [hash, message, author, date] = lastCommit.split('|');
    const diff = execSync('git diff --name-only HEAD~1 HEAD').toString().split('\n').filter(Boolean);
    return { hash, message, author, date, files: diff };
  } catch (error) {
    console.error('获取Git变更信息失败:', error);
    return null;
  }
}

// 更新更新日志
function updateChangelog(changes) {
  if (!changes) return;

  const { hash, message, author, date, files } = changes;
  const changelogEntry = `
### ${date} (${hash})
- 提交信息: ${message}
- 作者: ${author}
- 变更文件:
${files.map(file => `  - ${file}`).join('\n')}
`;

  let changelogContent = '';
  if (fs.existsSync(DOCS.changelog)) {
    changelogContent = fs.readFileSync(DOCS.changelog, 'utf8');
  } else {
    changelogContent = `# 更新日志\n\n本文档记录项目的所有重要变更。\n\n`;
  }

  // 在文件开头插入新的更新记录
  const updatedContent = changelogContent.replace(
    /# 更新日志\n\n/,
    `# 更新日志\n\n${changelogEntry}\n`
  );

  fs.writeFileSync(DOCS.changelog, updatedContent);
  console.log('更新日志已更新');
}

// 更新开发文档
function updateDevelopmentDoc(changes) {
  if (!changes) return;

  const { date, files } = changes;
  let docContent = fs.readFileSync(DOCS.development, 'utf8');

  // 更新最后修改时间
  const lastModifiedRegex = /最后更新：\d{4}-\d{2}-\d{2}/;
  const lastModifiedText = `最后更新：${date}`;
  
  if (lastModifiedRegex.test(docContent)) {
    docContent = docContent.replace(lastModifiedRegex, lastModifiedText);
  } else {
    docContent = `最后更新：${date}\n\n${docContent}`;
  }

  // 更新变更记录部分
  const changesSection = `
## 最近变更 (${date})
${files.map(file => `- ${file}`).join('\n')}
`;

  if (docContent.includes('## 最近变更')) {
    const regex = /## 最近变更[\s\S]*?(?=##|$)/;
    docContent = docContent.replace(regex, changesSection);
  } else {
    docContent = docContent.replace(
      /## 更新日志/,
      `${changesSection}\n\n## 更新日志`
    );
  }

  fs.writeFileSync(DOCS.development, docContent);
  console.log('开发文档已更新');
}

// 检查文档是否需要更新
function checkDocsUpdate() {
  const changes = getGitChanges();
  if (!changes) return;

  // 检查是否有文档相关的变更
  const hasDocChanges = changes.files.some(file => 
    file.includes('docs/') || 
    file.includes('API_SPEC.md') || 
    file.includes('DATABASE_SCHEMA.md')
  );

  if (hasDocChanges) {
    updateChangelog(changes);
    updateDevelopmentDoc(changes);
  }
}

// 执行更新
checkDocsUpdate(); 