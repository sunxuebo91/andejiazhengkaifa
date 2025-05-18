export const cosConfig = {
  SecretId: process.env.COS_SECRET_ID || 'AKIDjNmxrVs53we6JG0VllVzDArIcppZ9UZN',
  SecretKey: process.env.COS_SECRET_KEY || 'czCML4XrwlJadYDcldFeojOmumPmsiJe',
  Bucket: process.env.COS_BUCKET || 'housekeeping-1254058915', // 已更新为实际的存储桶名称
  Region: process.env.COS_REGION || 'ap-guangzhou', // 已更新为实际的地域
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'application/json'], // 已扩展支持JSON
  allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/json'], // 已扩展支持JSON
};
// coscmd putbucketwebsite \
//   --bucket=housekeeping-1254058915 \
//   --region=ap-guangzhou \
//   --index=index.html \
//   --error=error-pages/404.html \
//   --enable-https

// COS存储桶配置建议
// CORS规则:
// <CORSRule>
//   <AllowedOrigin>http://localhost:3000</AllowedOrigin>
//   <AllowedOrigin>http://localhost:5174</AllowedOrigin>
//   <AllowedMethod>GET</AllowedMethod>
//   <AllowedMethod>PUT</AllowedMethod>
//   <AllowedHeader>*</AllowedHeader>
// </CORSRule>
// 存储桶权限配置建议
// 生产环境应设置为私有读写
// 静态网站托管配置:
// - 索引文档: index.html
// - 错误文档: 404.html
// - 访问日志: 建议开启

// 注意：在生产环境中，建议使用环境变量而不是直接在代码中存储密钥