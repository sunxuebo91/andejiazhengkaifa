const COS = require('cos-nodejs-sdk-v5');
const path = require('path');
require('dotenv').config();

// 初始化COS实例
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY
});

/**
 * 上传文件到腾讯云COS
 * @param {Object} file - Multer文件对象
 * @param {String} folder - 存储文件夹
 * @returns {Promise<Object>} 上传结果
 */
const uploadToCOS = (file, folder) => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(file.originalname);
    const key = `uploads/${folder}/${Date.now()}${ext}`;
    
    cos.putObject({
      Bucket: process.env.COS_BUCKET,
      Region: process.env.COS_REGION,
      Key: key,
      Body: file.buffer,
      ContentLength: file.size
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          url: `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/${key}`,
          key: key,
          etag: data.ETag,
          location: data.Location
        });
      }
    });
  });
};

module.exports = uploadToCOS;