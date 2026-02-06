const fs = require('fs');

// 读取原始模板数据
const rawData = fs.readFileSync('template-fields-raw.json', 'utf8');
const lines = rawData.split('\n');
const jsonStart = lines.findIndex(line => line.trim() === '[');
const jsonData = lines.slice(jsonStart).join('\n');
const fields = JSON.parse(jsonData);

console.log('\n=== 模板字段分析 ===\n');
console.log(`总字段数: ${fields.length}\n`);

// 按dataType分组
const byType = {};
fields.forEach(field => {
  if (!byType[field.dataType]) {
    byType[field.dataType] = [];
  }
  byType[field.dataType].push(field.dataKey);
});

console.log('按数据类型分组:');
Object.keys(byType).sort((a, b) => a - b).forEach(type => {
  const typeNames = {
    1: '单行文本',
    4: '身份证',
    5: '日期',
    6: '签名',
    7: '印章',
    8: '多行文本',
    9: '多选',
    13: '勾选框',
    16: '单选'
  };
  console.log(`\ndataType ${type} (${typeNames[type] || '未知'}): ${byType[type].length}个字段`);
  byType[type].forEach(key => console.log(`  - ${key}`));
});

// 检查重复字段
console.log('\n\n=== 重复字段检查 ===\n');
const keyCount = {};
fields.forEach(field => {
  keyCount[field.dataKey] = (keyCount[field.dataKey] || 0) + 1;
});

const duplicates = Object.entries(keyCount).filter(([key, count]) => count > 1);
if (duplicates.length > 0) {
  console.log('发现重复字段:');
  duplicates.forEach(([key, count]) => {
    console.log(`  ${key}: ${count}次`);
    const sameKeyFields = fields.filter(f => f.dataKey === key);
    sameKeyFields.forEach((f, i) => {
      console.log(`    [${i + 1}] dataType: ${f.dataType}, required: ${f.required}, page: ${f.page}`);
    });
  });
} else {
  console.log('没有重复字段');
}

// 检查图片中提到的问题字段
console.log('\n\n=== 图片中显示的问题字段检查 ===\n');

const problemFields = [
  '合同开始时间',
  '合同结束时间',
  '阿姨姓名',
  '阿姨身份证',
  '客户身份证'
];

problemFields.forEach(fieldName => {
  const field = fields.find(f => f.dataKey === fieldName);
  if (field) {
    const typeNames = {
      1: '单行文本 → text',
      4: '身份证 → idcard',
      5: '日期 → date',
      6: '签名 → signature',
      7: '印章 → signature',
      8: '多行文本 → textarea',
      9: '多选 → multiselect',
      13: '勾选框 → checkbox',
      16: '单选 → select'
    };
    console.log(`${fieldName}:`);
    console.log(`  dataType: ${field.dataType} (${typeNames[field.dataType] || '未知'})`);
    console.log(`  required: ${field.required ? '是' : '否'}`);
    console.log(`  options: ${field.options ? JSON.stringify(field.options.map(o => o.label)) : 'null'}`);
  } else {
    console.log(`${fieldName}: 未找到`);
  }
});

