import imageCompression from 'browser-image-compression';

// 添加缓存来避免重复压缩同一个文件
const compressionCache = new Map<string, File>();

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param maxSizeMB 最大大小（MB），默认0.05MB(50KB)
 * @param maxWidthOrHeight 最大宽度或高度（像素）
 * @returns 压缩后的图片文件
 */
export const compressImage = async (
  file: File, 
  maxSizeMB: number = 0.05, // 增加默认大小阈值，避免过度压缩
  maxWidthOrHeight: number = 1200
): Promise<File> => {
  console.log('开始压缩图片:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    // 创建文件指纹，用于缓存检查
    const fileFingerprint = `${file.name}-${file.size}-${file.lastModified}`;
    
    // 检查缓存中是否已有此文件的压缩版本
    if (compressionCache.has(fileFingerprint)) {
      console.log('使用缓存的压缩图片:', file.name);
      return compressionCache.get(fileFingerprint) as File;
    }
    
    // 跳过PDF文件压缩
    if (file.type === 'application/pdf') {
      console.log('PDF文件无需压缩:', file.name);
      return file;
    }
    
    // 检查文件大小，如果已经小于阈值，直接返回
    if (file.size <= maxSizeMB * 1024 * 1024) {
      console.log('图片已经足够小，跳过压缩:', file.name);
      return file;
    }
    
    // 检查是否为图片文件
    if (!isValidImage(file)) {
      console.log('非图片文件，跳过压缩:', file.name, file.type);
      return file;
    }
    
    // 计算合适的压缩参数，根据原始大小动态调整
    const fileSizeMB = file.size / (1024 * 1024);
    
    // 动态调整压缩质量，大文件压缩更多
    let initialQuality = 0.7;
    if (fileSizeMB > 2) initialQuality = 0.5;
    else if (fileSizeMB > 1) initialQuality = 0.6;
    
    const options = {
      maxSizeMB, 
      maxWidthOrHeight,
      useWebWorker: true, 
      preserveExif: false, // 不保留EXIF数据以减少文件大小
      initialQuality, // 动态压缩质量
      alwaysKeepResolution: true, // 保持原始分辨率以避免文件变形
    };
    
    // 移除对global对象的引用，因为浏览器环境中不存在
    // 尝试手动触发一些内存清理
    try {
      // 在浏览器中没有直接的垃圾回收方法，可以通过以下方式尝试释放一些内存
      if (window.performance && window.performance.memory) {
        console.log('当前内存使用:', window.performance.memory);
      }
      // 其他可能的内存优化操作可以放在这里
    } catch (e) {
      // 忽略任何内存操作错误
    }
    
    const compressedFile = await imageCompression(file, options);
    
    // 检查是否达到目标大小，如果未达到但足够小就不进行二次压缩
    if (compressedFile.size > 50 * 1024 && compressedFile.size > file.size * 0.3) {
      console.log('需要二次压缩，当前大小:', (compressedFile.size / 1024).toFixed(2), 'KB');
      
      // 二次压缩参数更严格
      const secondOptions = {
        maxSizeMB: 0.03, // 更严格的大小限制
        maxWidthOrHeight: 900, // 进一步降低尺寸
        useWebWorker: true,
        preserveExif: false,
        initialQuality: 0.5, // 更低的质量
      };
      
      const secondCompressed = await imageCompression(compressedFile, secondOptions);
      
      console.log(
        '图片压缩完成(二次压缩):', 
        secondCompressed.name,
        `(${(secondCompressed.size / 1024).toFixed(2)}KB)`,
        `压缩率: ${((1 - secondCompressed.size / file.size) * 100).toFixed(2)}%`
      );
      
      // 保存到缓存
      compressionCache.set(fileFingerprint, secondCompressed);
      
      return secondCompressed;
    }
    
    console.log(
      '图片压缩完成:', 
      compressedFile.name,
      `(${(compressedFile.size / 1024).toFixed(2)}KB)`,
      `压缩率: ${((1 - compressedFile.size / file.size) * 100).toFixed(2)}%`
    );
    
    // 保存到缓存
    compressionCache.set(fileFingerprint, compressedFile);
    
    return compressedFile;
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 如果压缩失败，返回原始文件
    return file;
  }
};

/**
 * 批量压缩图片，每次处理一部分以避免内存溢出
 * @param files 要压缩的文件数组
 * @param batchSize 每批处理的文件数
 * @returns Promise<File[]> 压缩后的文件数组
 */
export const batchCompressImages = async (
  files: File[], 
  batchSize: number = 3
): Promise<File[]> => {
  const result: File[] = [];
  
  // 对文件进行分批
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    console.log(`处理第${i/batchSize + 1}批图片，共${Math.ceil(files.length/batchSize)}批`);
    
    // 并行处理当前批次
    const batchResults = await Promise.all(
      batch.map(file => compressImage(file))
    );
    
    result.push(...batchResults);
    
    // 如果还有更多批次，添加短暂延迟让浏览器有时间回收内存
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return result;
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
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('释放预览URL失败:', error);
  }
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

/**
 * 清理图片压缩缓存
 */
export const clearCompressionCache = () => {
  compressionCache.clear();
}; 