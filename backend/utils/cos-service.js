require('dotenv').config();
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

class COSService {
  constructor() {
    // 创建COS实例
    this.cos = new COS({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY
    });
    
    this.bucket = process.env.COS_BUCKET;
    this.region = process.env.COS_REGION;
    this.baseUrl = process.env.COS_BASE_URL || `https://${this.bucket}.cos.${this.region}.myqcloud.com`;
  }

  /**
   * 上传文件到腾讯云COS
   * @param {Object} fileInfo - 文件信息
   * @param {string} fileInfo.path - 本地文件路径
   * @param {string} fileInfo.originalname - 原始文件名
   * @param {string} category - 文件分类，例如：id-cards, photos, certificates, medical-reports
   * @returns {Promise<string>} 返回文件的URL
   */
  async uploadFile(fileInfo, category = 'general') {
    const { path: filePath, originalname } = fileInfo;
    
    // 生成唯一文件名和路径
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const key = `${category}/${uniqueSuffix}-${originalname}`;
    
    try {
      // 上传文件到COS
      const result = await new Promise((resolve, reject) => {
        this.cos.putObject({
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: fs.createReadStream(filePath),
        }, (err, data) => {
          // 上传完成后删除本地临时文件
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('删除临时文件失败:', unlinkErr);
            }
          });
          
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
      
      // 返回文件URL
      return `${this.baseUrl}/${key}`;
    } catch (error) {
      console.error('COS上传失败:', error);
      throw new Error(`文件上传到COS失败: ${error.message}`);
    }
  }
}

// 导出COS服务实例
module.exports = new COSService(); 