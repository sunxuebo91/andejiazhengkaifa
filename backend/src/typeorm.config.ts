import { DataSource, DataSourceOptions } from 'typeorm';
import { ResumeEntity } from './modules/resume/models/resume.entity';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

// 注意：此文件仅用于 TypeORM 实体定义，实际数据库连接使用 Mongoose
export const dataSourceOptions: DataSourceOptions = {
  type: 'mongodb',
  url: process.env.MONGODB_URI || 'mongodb://localhost:27017/housekeeping',
  entities: [ResumeEntity],
  synchronize: process.env.NODE_ENV === 'development',
  logging: ['error', 'warn', 'info'],
};

const dataSource = new DataSource(dataSourceOptions);

// 添加错误处理
dataSource.initialize()
  .then(() => {
    console.log('TypeORM 数据源已初始化（仅用于实体定义）');
  })
  .catch((err) => {
    console.error('TypeORM 数据源初始化失败:', err);
  });

export default dataSource;
