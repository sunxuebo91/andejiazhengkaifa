import imageCompression from 'browser-image-compression';

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param maxSizeMB 最大大小（MB），默认0.03MB(30KB)
 * @param maxWidthOrHeight 最大宽度或高度（像素）
 * @returns 压缩后的图片文件
 */
export const compressImage = async (
  file: File, 
  maxSizeMB: number = 0.03, 
  maxWidthOrHeight: number = 1280
): Promise<File> => {
  console.log('开始压缩图片:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    // 跳过PDF文件压缩
    if (file.type === 'application/pdf') {
      console.log('PDF文件无需压缩:', file.name);
      return file;
    }
    
    // 检查是否为图片文件
    if (!isValidImage(file)) {
      console.log('非图片文件，跳过压缩:', file.name, file.type);
      return file;
    }
    
    const options = {
      maxSizeMB, // 最大文件大小设为30KB
      maxWidthOrHeight, // 降低最大宽高以减小文件大小
      useWebWorker: true, 
      preserveExif: false, // 不保留EXIF数据以减少文件大小
      initialQuality: 0.6, // 降低初始质量以确保文件大小更小
    };
    
    const compressedFile = await imageCompression(file, options);
    
    // 检查是否达到目标大小，如果未达到，进行二次压缩
    if (compressedFile.size > 50 * 1024) {
      console.log('需要二次压缩，当前大小:', (compressedFile.size / 1024).toFixed(2), 'KB');
      const secondOptions = {
        maxSizeMB: 0.02, // 更严格的大小限制
        maxWidthOrHeight: 800, // 进一步降低尺寸
        useWebWorker: true,
        preserveExif: false,
        initialQuality: 0.4, // 更低的质量
      };
      
      const secondCompressed = await imageCompression(compressedFile, secondOptions);
      
      console.log(
        '图片压缩完成(二次压缩):', 
        secondCompressed.name,
        `(${(secondCompressed.size / 1024).toFixed(2)}KB)`,
        `压缩率: ${((1 - secondCompressed.size / file.size) * 100).toFixed(2)}%`
      );
      
      return secondCompressed;
    }
    
    console.log(
      '图片压缩完成:', 
      compressedFile.name,
      `(${(compressedFile.size / 1024).toFixed(2)}KB)`,
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