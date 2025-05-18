import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './models/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { BaseService } from '../../common/base.service';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  // 根据用户名查找用户
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  // 创建新用户
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.findByUsername(createUserDto.username);
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 对密码进行哈希处理
    const hashedPassword = await this.hashPassword(createUserDto.password);

    // 创建新用户
    const id = new ObjectId().toString();
    const user = this.userRepository.create({
      ...createUserDto,
      id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  // 更新用户信息
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);

    // 如果尝试更新密码，需要对密码进行哈希处理
    if (updateData.password) {
      updateData.password = await this.hashPassword(updateData.password);
    }

    // 如果尝试更新用户名，需要检查是否已存在
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.findByUsername(updateData.username);
      if (existingUser) {
        throw new ConflictException('用户名已存在');
      }
    }

    // 更新用户
    Object.assign(user, {...updateData, updatedAt: new Date()});
    return this.userRepository.save(user);
  }

  // 验证用户密码
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username);
    
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // 更新用户最后登录时间
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(
      { id: userId }, 
      { lastLoginAt: new Date() }
    );
  }

  // 密码哈希函数
  private async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new BadRequestException('密码长度至少为8个字符');
    }
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }
} 