import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getDatabaseConfig = (configService: ConfigService): MongooseModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  // 生产环境配置
  if (nodeEnv === 'production') {
    return {
      uri: configService.get<string>('MONGODB_URI') || 
           `mongodb://${configService.get('DB_HOST', 'localhost')}:${configService.get('DB_PORT', '27017')}/${configService.get('DB_NAME', 'andejiazheng_crm_prod')}`,
      
      // 生产环境优化配置
      retryWrites: true,
      w: 'majority',
      
      // 连接池配置
      maxPoolSize: parseInt(configService.get('DB_MAX_POOL_SIZE', '10')),
      minPoolSize: parseInt(configService.get('DB_MIN_POOL_SIZE', '2')),
      
      // 超时配置
      serverSelectionTimeoutMS: parseInt(configService.get('DB_SERVER_TIMEOUT', '30000')),
      socketTimeoutMS: parseInt(configService.get('DB_SOCKET_TIMEOUT', '45000')),
      connectTimeoutMS: parseInt(configService.get('DB_CONNECT_TIMEOUT', '30000')),
      
      // 监控配置
      heartbeatFrequencyMS: parseInt(configService.get('DB_HEARTBEAT_FREQ', '10000')),
      
      // 安全配置
      authSource: configService.get('DB_AUTH_SOURCE', 'admin'),
      ssl: configService.get('DB_SSL') === 'true',
      
      // 应用名称识别
      appName: 'andejiazheng-crm-prod',
      
      // 副本集配置（如果使用）
      replicaSet: configService.get('DB_REPLICA_SET'),
      readPreference: configService.get('DB_READ_PREFERENCE', 'primary'),
      
      // 压缩配置
      compressors: configService.get('DB_COMPRESSORS', 'snappy,zlib').split(','),
      
      // 认证配置
      ...(configService.get('DB_USERNAME') && {
        auth: {
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
        }
      })
    };
  }
  
  // 开发环境配置
  return {
    uri: configService.get<string>('MONGODB_URI', 'mongodb://127.0.0.1:27017/housekeeping'),
    retryWrites: true,
    w: 'majority',
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    appName: 'andejiazheng-crm-dev',
    
    // 开发环境可以启用详细日志
    ...(nodeEnv === 'development' && {
      bufferCommands: false, // 在开发环境中关闭命令缓冲
    })
  };
};

// 数据库健康检查配置
export const getDatabaseHealthConfig = () => ({
  timeout: 5000,
  retries: 3,
  pingTimeout: 3000
});

// 数据库索引配置
export const getDatabaseIndexes = () => {
  return {
    // 用户集合索引
    users: [
      { key: { username: 1 }, unique: true },
      { key: { email: 1 }, sparse: true },
      { key: { phone: 1 }, sparse: true },
      { key: { role: 1 } },
      { key: { createdAt: -1 } }
    ],
    
    // 简历集合索引
    resumes: [
      { key: { phone: 1 }, unique: true },
      { key: { name: 1 } },
      { key: { jobType: 1 } },
      { key: { leadSource: 1 } },
      { key: { orderStatus: 1 } },
      { key: { createdAt: -1 } },
      { key: { expectedSalary: 1 } },
      // 复合索引
      { key: { jobType: 1, orderStatus: 1 } },
      { key: { leadSource: 1, createdAt: -1 } }
    ],
    
    // 客户集合索引
    customers: [
      { key: { phone: 1 }, unique: true },
      { key: { name: 1 } },
      { key: { leadSource: 1 } },
      { key: { status: 1 } },
      { key: { createdAt: -1 } },
      { key: { salaryBudget: 1 } },
      { key: { creatorName: 1 } },
      // 复合索引
      { key: { status: 1, createdAt: -1 } },
      { key: { leadSource: 1, status: 1 } }
    ],
    
    // 跟进记录集合索引
    customerFollowUps: [
      { key: { customerId: 1 } },
      { key: { followUpType: 1 } },
      { key: { createdAt: -1 } },
      { key: { creatorName: 1 } },
      // 复合索引
      { key: { customerId: 1, createdAt: -1 } },
      { key: { customerId: 1, followUpType: 1 } }
    ]
  };
};

// 数据库备份配置
export const getDatabaseBackupConfig = (configService: ConfigService) => ({
  enabled: configService.get('DB_BACKUP_ENABLED', 'true') === 'true',
  schedule: configService.get('DB_BACKUP_SCHEDULE', '0 2 * * *'), // 每天凌晨2点
  retention: parseInt(configService.get('DB_BACKUP_RETENTION', '30')), // 保留30天
  path: configService.get('DB_BACKUP_PATH', '/var/backups/mongodb'),
  compression: configService.get('DB_BACKUP_COMPRESSION', 'gzip'),
  auth: {
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    authDatabase: configService.get('DB_AUTH_SOURCE', 'admin')
  }
}); 