// 文件上传辅助函数

/**
 * 从文件对象中提取文件URL
 */
export const extractFileUrl = (file: any): string | null => {
  if (!file) return null;
  
  // 如果文件对象有url属性，直接返回
  if (file.url) return file.url;
  
  // 如果文件对象有response属性，从response中提取
  if (file.response && file.response.data && file.response.data.url) {
    return file.response.data.url;
  }
  
  // 如果文件对象有response属性，从response中提取fileId
  if (file.response && file.response.data && file.response.data.fileId) {
    return `/api/upload/file/${file.response.data.fileId}`;
  }
  
  return null;
};

/**
 * 从文件URL中提取文件ID
 */
export const extractFileId = (url: string): string | null => {
  if (!url) return null;
  
  // 从URL中提取文件ID
  const match = url.match(/\/api\/upload\/file\/([^/?]+)/);
  return match ? match[1] : null;
};

/**
 * 判断文件是否为PDF
 */
export const isPdfFile = (file: any): boolean => {
  if (!file) return false;
  
  // 检查文件类型
  if (file.type === 'application/pdf') return true;
  
  // 检查文件名
  if (file.name && file.name.toLowerCase().endsWith('.pdf')) return true;
  
  // 检查URL
  if (file.url && file.url.toLowerCase().includes('.pdf')) return true;
  
  return false;
};

/**
 * 处理图片URL，确保是完整的URL
 */
export const processImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  // 如果已经是完整的API路径，直接返回
  if (url.startsWith('/api/upload/file/')) return url;
  
  // 否则构建完整的API路径
  return `/api/upload/file/${url}`;
};

/**
 * 验证文件类型
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * 验证文件大小
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 