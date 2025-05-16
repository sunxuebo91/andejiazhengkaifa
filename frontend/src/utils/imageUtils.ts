import imageCompression from 'browser-image-compression';

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param maxSizeMB 最大大小（MB）
 * @param maxWidthOrHeight 最大宽度或高度（像素）
 * @returns 压缩后的图片文件
 */
export const compressImage = async (
  file: File, 
  maxSizeMB: number = 1, 
  maxWidthOrHeight: number = 1920
): Promise<File> => {
  console.log('开始压缩图片:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    const options = {
      maxSizeMB, // 最大文件大小
      maxWidthOrHeight, // 最大宽度或高度
      useWebWorker: true, // 使用Web Worker提高性能
      preserveExif: true, // 保留EXIF数据
    };
    
    const compressedFile = await imageCompression(file, options);
    console.log(
      '图片压缩完成:', 
      compressedFile.name,
      `(${(compressedFile.size / 1024 / 1024).toFixed(2)}MB)`,
      `压缩率: ${((1 - compressedFile.size / file.size) * 100).toFixed(2)}%`
    );
    
    return compressedFile;
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 如果压缩失败，返回原始文件
    return file;
  }
};

/**
 * 创建图片的预览URL
 * @param file 图片文件
 * @returns 预览URL
 */
export const createImagePreview = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * 释放预览URL以避免内存泄漏
 * @param url 预览URL
 */
export const revokeImagePreview = (url: string): void => {
  URL.revokeObjectURL(url);
};

/**
 * 将图片转换为Base64编码
 * @param file 图片文件
 * @returns Promise<string> Base64编码的图片数据
 */
export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * 检查文件是否为有效图片
 * @param file 要检查的文件
 * @returns boolean 是否为有效图片
 */
export const isValidImage = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  return validTypes.includes(file.type);
}; 