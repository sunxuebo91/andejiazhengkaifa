import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from './models/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: '创建新用户' })
  @ApiResponse({ status: 201, description: '用户创建成功', type: User })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`创建新用户: ${createUserDto.username}`);
    return this.userService.createUser(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有用户' })
  @ApiResponse({ status: 200, description: '返回所有用户列表', type: [User] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    this.logger.log(`获取用户列表，页码: ${page}, 每页数量: ${pageSize}`);
    
    const parsedPage = parseInt(page as any);
    const parsedPageSize = parseInt(pageSize as any);
    
    if (isNaN(parsedPage) || parsedPage < 1) {
      throw new BadRequestException('页码必须是大于0的整数');
    }
    
    if (isNaN(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
      throw new BadRequestException('每页数量必须是1-100之间的整数');
    }
    
    return this.userService.findWithPagination(parsedPage, parsedPageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: '通过id获取用户' })
  @ApiResponse({ status: 200, description: '返回用户信息', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<User> {
    this.logger.log(`获取用户信息，ID: ${id}`);
    try {
      return await this.userService.findOne(id);
    } catch (error) {
      this.logger.error(`获取用户失败: ${error.message}`);
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({ status: 200, description: '用户更新成功', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<User>,
  ): Promise<User> {
    this.logger.log(`更新用户，ID: ${id}`);
    
    // 防止恶意更新角色
    if (updateUserDto.role && !Object.values(UserRole).includes(updateUserDto.role)) {
      throw new BadRequestException('无效的用户角色');
    }
    
    try {
      return await this.userService.updateUser(id, updateUserDto);
    } catch (error) {
      this.logger.error(`更新用户失败: ${error.message}`);
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @ApiResponse({ status: 204, description: '用户删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`删除用户，ID: ${id}`);
    try {
      await this.userService.remove(id);
    } catch (error) {
      this.logger.error(`删除用户失败: ${error.message}`);
      throw error;
    }
  }
} 