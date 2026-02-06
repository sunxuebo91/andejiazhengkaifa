import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShortUrlController } from './short-url.controller';
import { ShortUrlService } from './short-url.service';
import { ShortUrl, ShortUrlSchema } from './models/short-url.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShortUrl.name, schema: ShortUrlSchema },
    ]),
  ],
  controllers: [ShortUrlController],
  providers: [ShortUrlService],
  exports: [ShortUrlService],
})
export class ShortUrlModule {}

