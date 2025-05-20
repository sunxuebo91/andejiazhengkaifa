import { Injectable } from '@nestjs/common';
// 修改导入方式
import * as BaiduAip from 'baidu-aip-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OcrService {
  private client: any;

  constructor(private configService: ConfigService) {
    // 使用完整包创建OCR客户端
    const AipOcr = BaiduAip.ocr;
    this.client = new AipOcr(
      this.configService.get('BAIDU_OCR_APP_ID'),
      this.configService.get('BAIDU_OCR_API_KEY'),
      this.configService.get('BAIDU_OCR_SECRET_KEY')
    );
  }

  async idCardFront(image: Buffer): Promise<any> {
    return this.client.idcardFront(image, { detect_risk: 'true' });
  }

  async idCardBack(image: Buffer): Promise<any> {
    return this.client.idcardBack(image, { detect_risk: 'true' });
  }
}
