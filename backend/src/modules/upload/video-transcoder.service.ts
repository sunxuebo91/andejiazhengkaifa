import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class VideoTranscoderService {
  private readonly logger = new Logger(VideoTranscoderService.name);

  /**
   * 将视频转码为H.264格式（浏览器兼容格式）
   */
  async transcodeToH264(inputBuffer: Buffer, originalFilename: string): Promise<{ buffer: Buffer; filename: string }> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}_${originalFilename}`);
    const outputFilename = this.getOutputFilename(originalFilename);
    const outputPath = path.join(tempDir, `output_${Date.now()}_${outputFilename}`);

    try {
      // 写入临时输入文件
      fs.writeFileSync(inputPath, inputBuffer);
      this.logger.log(`临时输入文件创建: ${inputPath}`);

      // 检查视频是否需要转码
      const needsTranscode = await this.checkNeedsTranscode(inputPath);
      
      if (!needsTranscode) {
        this.logger.log('视频已是H.264格式，无需转码');
        const buffer = fs.readFileSync(inputPath);
        this.cleanup(inputPath);
        return { buffer, filename: originalFilename };
      }

      // 执行转码
      this.logger.log('开始视频转码...');
      await this.runFFmpeg(inputPath, outputPath);
      this.logger.log('视频转码完成');

      // 读取输出文件
      const outputBuffer = fs.readFileSync(outputPath);

      // 清理临时文件
      this.cleanup(inputPath, outputPath);

      return { buffer: outputBuffer, filename: outputFilename };
    } catch (error) {
      this.logger.error(`视频转码失败: ${error.message}`);
      this.cleanup(inputPath, outputPath);
      throw error;
    }
  }

  /**
   * 检查视频是否需要转码
   */
  private checkNeedsTranscode(inputPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          this.logger.warn(`无法获取视频信息，将尝试转码: ${err.message}`);
          resolve(true);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          this.logger.warn('未找到视频流，将尝试转码');
          resolve(true);
          return;
        }

        const codec = videoStream.codec_name?.toLowerCase();
        this.logger.log(`视频编码: ${codec}`);

        // 如果是H.264或VP8/VP9（浏览器支持的格式），不需要转码
        const browserCompatibleCodecs = ['h264', 'vp8', 'vp9', 'av1'];
        if (browserCompatibleCodecs.includes(codec)) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * 运行FFmpeg转码
   */
  private runFFmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',        // 转码速度
          '-crf 23',             // 视频质量 (0-51, 越低质量越好)
          '-movflags +faststart', // 优化web播放
          '-pix_fmt yuv420p',    // 像素格式兼容性
        ])
        .on('start', (cmd) => {
          this.logger.log(`FFmpeg命令: ${cmd}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.logger.log(`转码进度: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('error', (err) => {
          this.logger.error(`FFmpeg错误: ${err.message}`);
          reject(err);
        })
        .on('end', () => {
          this.logger.log('FFmpeg转码完成');
          resolve();
        })
        .save(outputPath);
    });
  }

  /**
   * 获取输出文件名（确保是.mp4扩展名）
   */
  private getOutputFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const basename = path.basename(originalFilename, ext);
    return `${basename}.mp4`;
  }

  /**
   * 清理临时文件
   */
  private cleanup(...filePaths: string[]): void {
    for (const filePath of filePaths) {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.logger.log(`临时文件已删除: ${filePath}`);
        } catch (err) {
          this.logger.warn(`删除临时文件失败: ${filePath}, ${err.message}`);
        }
      }
    }
  }
}

