import { Module } from '@nestjs/common';
import { ImageCacheService } from '../../utils/image-cache.service';

@Module({
  providers: [ImageCacheService],
  exports: [ImageCacheService],
})
export class ImageCacheModule {}