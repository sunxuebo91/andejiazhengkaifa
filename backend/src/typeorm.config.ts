import { DataSource, DataSourceOptions } from 'typeorm';
import { Resume } from './modules/resume/models/resume.entity';
import { User } from './modules/user/models/user.entity';
import { RefreshToken } from './modules/auth/models/refresh-token.entity';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mongodb',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '27017', 10),
  database: process.env.DB_NAME || 'housekeeping',
  entities: [Resume, User, RefreshToken],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
