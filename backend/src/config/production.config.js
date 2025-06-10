/**
 * 生产环境配置
 */
module.exports = {
  // 环境
  environment: 'production',
  
  // 服务器配置
  server: {
    port: process.env.API_PORT || 3001,
    host: process.env.API_HOST || '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://your-frontend-domain.com',
      credentials: true
    }
  },

  // 数据库配置
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'andejiazheng_crm_prod',
    username: process.env.DB_USERNAME || 'crm_user',
    password: process.env.DB_PASSWORD,
    synchronize: false, // 生产环境不自动同步
    logging: false, // 关闭SQL日志
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    pool: {
      min: 2,
      max: 10
    }
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'andejiazheng-crm',
    audience: 'crm-users'
  },

  // 文件上传配置
  upload: {
    path: process.env.UPLOAD_PATH || '/var/www/uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'warn',
    file: process.env.LOG_FILE || '/var/log/andejiazheng-crm/app.log',
    maxFiles: 30,
    maxSize: '20m',
    format: 'json',
    errorFile: '/var/log/andejiazheng-crm/error.log'
  },

  // Redis配置 (缓存)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    ttl: 3600, // 1小时
    maxRetriesPerRequest: 3
  },

  // 安全配置
  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15分钟
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 限制每个IP 100次请求
      message: '请求过于频繁，请稍后再试',
      standardHeaders: true,
      legacyHeaders: false
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      },
      crossOriginEmbedderPolicy: false
    },
    session: {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true, // 只在HTTPS下使用
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
      }
    }
  },

  // 邮件配置
  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    },
    from: process.env.MAIL_FROM || 'noreply@your-domain.com'
  },

  // 监控配置
  monitoring: {
    healthCheck: process.env.HEALTH_CHECK_ENABLED === 'true',
    metrics: process.env.METRICS_ENABLED === 'true',
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090
    }
  },

  // 性能配置
  performance: {
    compression: true,
    cache: {
      ttl: 300, // 5分钟
      max: 1000
    }
  }
}; 