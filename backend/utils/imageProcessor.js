const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * 压缩图片
 * @param {string} filePath - 源文件路径
 * @param {Object} options - 压缩选项
 * @param {number} options.quality - 压缩质量 (1-100)
 * @param {number} options.width - 最大宽度
 * @param {number} options.height - 最大高度
 * @param {string} outputPath - 输出文件路径 (可选，默认覆盖源文件)
 * @returns {Promise<string>} 压缩后文件路径
 */
exports.compressImage = async (filePath, options = {}, outputPath = null) => {
  // 设置默认选项
  const defaultOptions = {
    quality: 80,
    width: 1920,
    height: 1920
  };

  const finalOptions = { ...defaultOptions, ...options };
  const finalOutputPath = outputPath || filePath;
  
  try {
    // 获取文件信息
    const originalSize = fs.statSync(filePath).size;
    console.log(`开始压缩图片: ${path.basename(filePath)}, 原始大小: ${(originalSize / 1024).toFixed(2)}KB`);
    
    // 使用sharp进行压缩
    await sharp(filePath)
      .resize({
        width: finalOptions.width,
        height: finalOptions.height,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: finalOptions.quality, progressive: true })
      .toFile(finalOutputPath + '.tmp');
    
    // 替换原文件
    fs.unlinkSync(filePath);
    fs.renameSync(finalOutputPath + '.tmp', finalOutputPath);
    
    // 获取压缩后文件信息
    const compressedSize = fs.statSync(finalOutputPath).size;
    const compressionRatio = (1 - compressedSize / originalSize) * 100;
    console.log(`图片压缩完成: ${path.basename(finalOutputPath)}, 压缩后大小: ${(compressedSize / 1024).toFixed(2)}KB, 压缩率: ${compressionRatio.toFixed(2)}%`);
    
    return finalOutputPath;
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 如果压缩失败，返回原文件路径
    return filePath;
  }
};

/**
 * 批量压缩目录中的图片
 * @param {string} dirPath - 目录路径
 * @param {Object} options - 压缩选项
 * @returns {Promise<Array<string>>} 压缩后的文件路径列表
 */
exports.compressImagesInDirectory = async (dirPath, options = {}) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const results = [];
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile() && imageExtensions.includes(path.extname(file).toLowerCase())) {
        const result = await exports.compressImage(filePath, options);
        results.push(result);
      }
    }
    
    return results;
  } catch (error) {
    console.error('批量压缩图片失败:', error);
    return results;
  }
};

/**
 * 转换图片格式
 * @param {string} filePath - 源文件路径
 * @param {string} format - 目标格式 ('jpeg', 'png', 'webp' 等)
 * @param {Object} options - 转换选项
 * @returns {Promise<string>} 转换后的文件路径
 */
exports.convertImageFormat = async (filePath, format, options = {}) => {
  try {
    const dirname = path.dirname(filePath);
    const filename = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(dirname, `${filename}.${format}`);
    
    console.log(`开始转换图片格式: ${path.basename(filePath)} -> ${format}`);
    
    await sharp(filePath)[format](options).toFile(outputPath);
    
    console.log(`图片格式转换完成: ${path.basename(outputPath)}`);
    
    return outputPath;
  } catch (error) {
    console.error('图片格式转换失败:', error);
    return filePath;
  }
};

/**
 * 生成图片缩略图
 * @param {string} filePath - 源文件路径
 * @param {number} width - 缩略图宽度
 * @param {number} height - 缩略图高度
 * @param {string} outputPath - 输出文件路径 (可选)
 * @returns {Promise<string>} 缩略图文件路径
 */
exports.generateThumbnail = async (filePath, width = 200, height = 200, outputPath = null) => {
  try {
    const dirname = path.dirname(filePath);
    const filename = path.basename(filePath, path.extname(filePath));
    const finalOutputPath = outputPath || path.join(dirname, `${filename}-thumb${path.extname(filePath)}`);
    
    console.log(`开始生成缩略图: ${path.basename(filePath)}, 大小: ${width}x${height}`);
    
    await sharp(filePath)
      .resize({
        width,
        height,
        fit: 'cover',
        position: 'centre'
      })
      .toFile(finalOutputPath);
    
    console.log(`缩略图生成完成: ${path.basename(finalOutputPath)}`);
    
    return finalOutputPath;
  } catch (error) {
    console.error('缩略图生成失败:', error);
    return null;
  }
}; 