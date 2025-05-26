import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private bucket: GridFSBucket;

  constructor(@InjectConnection() private connection: Connection) {
    this.bucket = new GridFSBucket(this.connection.db, {
      bucketName: 'documents'
    });
  }

  async uploadFile(file: Express.Multer.File, metadata: any = {}): Promise<string> {
    try {
      const uploadStream = this.bucket.openUploadStream(file.originalname, {
        metadata: {
          ...metadata,
          mimeType: file.mimetype,
          size: file.size,
          uploadTime: new Date(),
          type: metadata.type || 'other' // 添加文件类型分类
        }
      });

      return new Promise((resolve, reject) => {
        const readable = new Readable();
        readable._read = () => {}; // _read is required but you can noop it
        readable.push(file.buffer);
        readable.push(null);

        readable.pipe(uploadStream)
          .on('error', (error) => {
            this.logger.error(`文件上传失败: ${error.message}`);
            reject(error);
          })
          .on('finish', () => {
            this.logger.log(`文件上传成功: ${uploadStream.id}`);
            resolve(uploadStream.id.toString());
          });
      });
    } catch (error) {
      this.logger.error(`文件上传过程出错: ${error.message}`);
      throw error;
    }
  }

  async getFile(fileId: string): Promise<{ stream: Readable; metadata: any }> {
    try {
      const objectId = new ObjectId(fileId);
      const files = await this.bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new Error('文件不存在');
      }

      const downloadStream = this.bucket.openDownloadStream(objectId);
      return {
        stream: downloadStream,
        metadata: files[0].metadata
      };
    } catch (error) {
      this.logger.error(`获取文件失败: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const objectId = new ObjectId(fileId);
      await this.bucket.delete(objectId);
      this.logger.log(`文件删除成功: ${fileId}`);
    } catch (error) {
      this.logger.error(`文件删除失败: ${error.message}`);
      throw error;
    }
  }
}