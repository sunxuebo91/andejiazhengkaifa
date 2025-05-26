// 文件上传辅助函数

export const extractFileUrl = (file: any): string | null => {
  // 如果文件已经有URL，直接返回
  if (file.url) return file.url;
  
  // 如果是上传响应，从响应中提取
  if (file.response && file.response.success && file.response.data) {
    const { fileId } = file.response.data;
    if (fileId) {
      return `/api/upload/file/${fileId}`;
    }
  }
  
  return null;
};

export const extractFileId = (fileUrl: string): string => {
  // 从URL中提取文件ID
  if (fileUrl.includes('/api/upload/file/')) {
    return fileUrl.split('/api/upload/file/').pop() || '';
  }
  return fileUrl.split('/').pop() || '';
};

export const isPdfFile = (file: any): boolean => {
  // 检查文件类型
  if (file.type === 'application/pdf') return true;
  
  // 检查文件名
  if (file.name?.toLowerCase().endsWith('.pdf')) return true;
  
  // 检查URL
  const url = extractFileUrl(file);
  if (url?.toLowerCase().endsWith('.pdf')) return true;
  
  // 检查响应中的mimeType
  if (file.response?.data?.mimeType === 'application/pdf') return true;
  
  return false;
}; 