import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 检查表单字段的脚本
 */
async function checkFormFields() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';
  const client = new MongoClient(mongoUri);
  
  try {
    // 连接到 MongoDB
    console.log('连接到 MongoDB:', mongoUri);
    await client.connect();
    console.log('✓ 已连接到 MongoDB\n');
    
    // 获取数据库和集合
    const db = client.db();
    const FormField = db.collection('form_fields');
    
    console.log('检查所有表单字段...\n');
    
    // 查找所有字段
    const allFields = await FormField.find({}).toArray();
    console.log(`总共有 ${allFields.length} 个字段\n`);
    
    // 查找有选项的字段
    const fieldsWithOptions = await FormField.find({
      fieldType: { $in: ['radio', 'checkbox', 'select'] }
    }).toArray();
    
    console.log(`有 ${fieldsWithOptions.length} 个包含选项类型的字段:\n`);
    
    for (const field of fieldsWithOptions) {
      console.log(`字段: "${field.label}" (${field._id})`);
      console.log(`  类型: ${field.fieldType}`);
      console.log(`  选项数量: ${field.options?.length || 0}`);
      if (field.options && field.options.length > 0) {
        console.log(`  选项:`);
        field.options.forEach((option: any, index: number) => {
          console.log(`    ${index + 1}. value: "${option.value}", label: "${option.label || '(空)'}"`);
        });
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    await client.close();
    console.log('已断开 MongoDB 连接');
  }
}

checkFormFields();

