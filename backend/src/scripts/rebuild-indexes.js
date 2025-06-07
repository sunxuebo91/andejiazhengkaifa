// 重建MongoDB索引脚本
// 用于解决idNumber索引问题

// 获取数据库连接
db = db.getSiblingDB('housekeeping');

// 删除现有的索引
print('删除现有的idNumber索引...');
db.resumes.dropIndex('idNumber_1');
print('索引已删除');

// 更新有null idNumber的记录
print('更新所有null的idNumber记录...');
db.resumes.updateMany(
  { idNumber: null }, 
  { $unset: { idNumber: "" } }
);
print('记录已更新');

// 重新创建索引，确保使用sparse选项
print('重新创建idNumber索引...');
db.resumes.createIndex(
  { idNumber: 1 }, 
  { 
    unique: true, 
    sparse: true,
    background: true,
    name: 'idNumber_1'
  }
);
print('新索引已创建');

print('索引重建完成!'); 