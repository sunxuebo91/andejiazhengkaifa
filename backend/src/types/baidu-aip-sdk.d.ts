declare module 'baidu-aip-sdk' {
  export const ocr: {
    new (appId: string, apiKey: string, secretKey: string): {
      idcardFront(image: Buffer, options?: any): Promise<any>;
      idcardBack(image: Buffer, options?: any): Promise<any>;
    }
  };
} 