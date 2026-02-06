import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ShortUrlService } from './short-url.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('短链接')
@Controller('s')
export class ShortUrlController {
  constructor(private readonly shortUrlService: ShortUrlService) {}

  @Public()
  @Get(':shortId')
  @ApiOperation({ summary: '短链接重定向' })
  @ApiResponse({ status: 302, description: '重定向到目标URL' })
  @ApiResponse({ status: 404, description: '短链接不存在或已过期' })
  async redirect(
    @Param('shortId') shortId: string,
    @Res() res: Response,
  ) {
    const targetUrl = await this.shortUrlService.getTargetUrl(shortId);
    return res.redirect(targetUrl);
  }
}

