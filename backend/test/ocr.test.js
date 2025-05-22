const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/main');

describe('OCR Controller (e2e)', () => {
  let testImagePath;

  beforeAll(() => {
    // 使用测试图片路径
    testImagePath = path.join(__dirname, '../test-image.jpg');
  });

  it('/ocr/idcard (POST) - should process front side id card', async () => {
    const response = await request(app)
      .post('/ocr/idcard')
      .attach('image', testImagePath)
      .expect(201);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('message', '识别成功');
    expect(response.body.data).toHaveProperty('words_result');
  });

  it('should handle invalid image format', async () => {
    // 创建一个无效的图片文件
    const invalidImagePath = path.join(__dirname, 'invalid.txt');
    fs.writeFileSync(invalidImagePath, 'invalid image data');

    try {
      const response = await request(app)
        .post('/ocr/idcard')
        .attach('image', invalidImagePath)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('只支持JPG/PNG格式的图片');
    } finally {
      // 清理测试文件
      fs.unlinkSync(invalidImagePath);
    }
  });

  it('should handle missing file', async () => {
    const response = await request(app)
      .post('/ocr/idcard')
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.message).toBe('没有上传文件');
  });
});