import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';

@ApiTags('文章内容管理（褓贝后台）')
@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  // ==================== 小程序公开接口（无需认证）- 必须放在前面 ====================

  @Get('miniprogram/list')
  @Public()
  @ApiOperation({ summary: '【小程序】获取已发布文章列表（公开接口）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPublishedList(@Query() query: QueryArticleDto) {
    // 强制只返回已发布的文章
    const result = await this.articleService.findAll({ ...query, status: 'published' });
    return { success: true, data: result, message: '获取成功' };
  }

  @Get('miniprogram/:id')
  @Public()
  @ApiOperation({ summary: '【小程序】获取已发布文章详情（公开接口）' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '文章不存在或未发布' })
  async getPublishedOne(@Param('id') id: string) {
    const article = await this.articleService.findOne(id);

    // 只返回已发布的文章
    if (article.status !== 'published') {
      return { success: false, message: '文章不存在或未发布', statusCode: 404 };
    }

    return { success: true, data: article, message: '获取成功' };
  }

  // ==================== 褓贝后台管理接口（需要认证） ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建文章' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: CreateArticleDto, @Request() req) {
    const article = await this.articleService.create(dto, req.user.userId);
    return { success: true, data: article, message: '创建成功' };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取文章列表（分页）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: QueryArticleDto) {
    const result = await this.articleService.findAll(query);
    return { success: true, data: result, message: '获取成功' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取文章详情' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    const article = await this.articleService.findOne(id);
    return { success: true, data: article, message: '获取成功' };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @Request() req) {
    const article = await this.articleService.update(id, dto, req.user.userId);
    return { success: true, data: article, message: '更新成功' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    await this.articleService.remove(id);
    return { success: true, message: '删除成功' };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新文章发布状态' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    const article = await this.articleService.updateStatus(id, status, req.user.userId);
    return { success: true, data: article, message: '更新成功' };
  }
}
