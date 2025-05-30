export const cosConfig = {
  SecretId: 'AKIDjNmxrVs53we6JG0VllVzDArIcppZ9UZN',
  SecretKey: 'czCML4XrwlJadYDcldFeojOmumPmsiJe',
  Bucket: 'housekeeping-1254058915',
  Region: 'ap-guangzhou',
  
  // 其他可选配置
  Protocol: 'https:', // 使用 HTTPS 协议
  Domain: `housekeeping-1254058915.cos.${process.env.COS_REGION || 'ap-guangzhou'}.myqcloud.com`, // COS 访问域名
  
  // 上传配置
  UploadMaxSize: 1024 * 1024 * 50, // 最大上传大小（50MB）
  UploadExpireTime: 600, // 上传凭证有效期（秒）
  
  // 下载配置
  DownloadExpireTime: 3600, // 下载链接有效期（秒）
};

// 导出类型定义
export type CosConfig = typeof cosConfig;