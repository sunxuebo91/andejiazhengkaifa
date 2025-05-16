require('dotenv').config();
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

// 创建COS实例
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY
});

// 创建测试文件
const createTestFile = () => {
  const testFilePath = path.join(__dirname, 'test-image.jpg');
  
  // 如果文件不存在，创建一个简单的测试图片
  if (!fs.existsSync(testFilePath)) {
    console.log('创建测试图片文件...');
    // 创建一个1x1像素的黑色JPEG图片
    const buffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x03, 0x02, 0x02, 0x02, 0x02, 0x02, 0x03, 0x02, 0x02, 0x02, 0x03,
      0x03, 0x03, 0x03, 0x04, 0x06, 0x04, 0x04, 0x04, 0x04, 0x04, 0x08, 0x06,
      0x06, 0x05, 0x06, 0x09, 0x08, 0x0a, 0x0a, 0x09, 0x08, 0x09, 0x09, 0x0a,
      0x0c, 0x0f, 0x0c, 0x0a, 0x0b, 0x0e, 0x0b, 0x09, 0x09, 0x0d, 0x11, 0x0d,
      0x0e, 0x0f, 0x10, 0x10, 0x11, 0x10, 0x0a, 0x0c, 0x12, 0x13, 0x12, 0x10,
      0x13, 0x0f, 0x10, 0x10, 0x10, 0xff, 0xc9, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xcc, 0x00, 0x06, 0x00, 0x10,
      0x10, 0x05, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0xd2, 0xcf, 0x20, 0xff, 0xd9
    ]);
    
    fs.writeFileSync(testFilePath, buffer);
    console.log(`测试图片已创建: ${testFilePath}`);
  }
  
  return testFilePath;
};

// 测试上传
const testUpload = async () => {
  try {
    console.log('开始测试COS上传...');
    console.log('COS配置:');
    console.log(`- 存储桶: ${process.env.COS_BUCKET}`);
    console.log(`- 地域: ${process.env.COS_REGION}`);
    
    const testFilePath = createTestFile();
    const key = `test/test-upload-${Date.now()}.jpg`;
    
    console.log(`上传文件: ${testFilePath}`);
    console.log(`目标路径: ${key}`);
    
    return new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: process.env.COS_BUCKET,
        Region: process.env.COS_REGION,
        Key: key,
        Body: fs.createReadStream(testFilePath),
      }, function(err, data) {
        if (err) {
          console.error('上传失败:', err);
          reject(err);
        } else {
          console.log('上传成功:', data);
          const url = `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/${key}`;
          console.log('访问URL:', url);
          resolve(url);
        }
      });
    });
  } catch (error) {
    console.error('测试过程中出错:', error);
    throw error;
  }
};

// 执行测试
testUpload()
  .then(url => {
    console.log('测试完成，文件URL:', url);
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });