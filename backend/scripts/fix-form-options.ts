import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 修复表单字段选项的脚本
 * 将空的 label 字段填充为默认值
 */
async function fixFormOptions() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';
  const client = new MongoClient(mongoUri);

  try {
    // 连接到 MongoDB
    console.log('连接到 MongoDB:', mongoUri);
    await client.connect();
    console.log('✓ 已连接到 MongoDB');

    // 获取数据库和集合
    const db = client.db();
    const FormField = db.collection('form_fields');

    console.log('\n开始检查表单字段选项...');

    // 查找所有有选项的字段
    const fields = await FormField.find({
      fieldType: { $in: ['radio', 'checkbox', 'select'] },
      options: { $exists: true, $ne: [] }
    }).toArray();

    console.log(`找到 ${fields.length} 个包含选项的字段\n`);

    let fixedCount = 0;

    for (const field of fields) {
      let needsUpdate = false;
      const updatedOptions = field.options.map((option: any, index: number) => {
        // 检查 label 是否为空或不存在
        if (!option.label || option.label.trim() === '') {
          needsUpdate = true;
          console.log(`字段 "${field.label}" (${field._id}) 的选项 ${index + 1} 缺少 label`);
          console.log(`  原始值: ${JSON.stringify(option)}`);

          // 如果 value 看起来像 "option_1" 或 "option.1"，提取数字
          const match = option.value.match(/option[._](\d+)/);
          if (match) {
            const newOption = {
              value: option.value,
              label: `选项${match[1]}`
            };
            console.log(`  修复为: ${JSON.stringify(newOption)}`);
            return newOption;
          } else {
            const newOption = {
              value: option.value,
              label: `选项${index + 1}`
            };
            console.log(`  修复为: ${JSON.stringify(newOption)}`);
            return newOption;
          }
        }
        return option;
      });

      if (needsUpdate) {
        await FormField.updateOne(
          { _id: field._id },
          { $set: { options: updatedOptions } }
        );
        fixedCount++;
        console.log(`✓ 已修复字段 "${field.label}" (${field._id})\n`);
      }
    }

    console.log(`\n修复完成！共修复了 ${fixedCount} 个字段`);

  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await client.close();
    console.log('已断开 MongoDB 连接');
  }
}

fixFormOptions();

