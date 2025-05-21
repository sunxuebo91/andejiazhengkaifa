import { DataSource, DataSourceOptions } from 'typeorm';
import { ResumeEntity } from './modules/resume/models/resume.entity';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mongodb',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '27017', 10),
  database: process.env.DB_NAME || 'housekeeping',
  entities: [ResumeEntity],
  synchronize: process.env.NODE_ENV === 'development',
  logging: ['error', 'warn', 'info'],
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority',
};

const dataSource = new DataSource(dataSourceOptions);

// 添加错误处理
dataSource.initialize()
  .then(() => {
    console.log('MongoDB 数据源已初始化');
  })
  .catch((err) => {
    console.error('MongoDB 数据源初始化失败:', err);
  });

export default dataSource;
