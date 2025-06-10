import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserWithoutPassword } from './models/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  /**
   * 根据用户名查找用户
   * 注意：此方法返回完整的 User 对象（包含密码），因为用于认证
   * 其他方法应该使用 UserWithoutPassword 类型
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<UserWithoutPassword | null> {
    const user = await this.userModel.findById(id).select('-password').lean().exec();
    return user as UserWithoutPassword;
  }

  async create(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      permissions: createUserDto.permissions || this.getDefaultPermissions(createUserDto.role)
    });
    const savedUser = await createdUser.save();
    
    // 使用 lean() 获取纯 JavaScript 对象
    const userObj = savedUser.toObject();
    const { password, ...userWithoutPassword } = userObj;
    return userWithoutPassword as UserWithoutPassword;
  }

  async findAll(page: number = 1, pageSize: number = 10, search?: string) {
    const query = search 
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const skip = (page - 1) * pageSize;
    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password')
        .lean()
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(query)
    ]);

    return {
      items: users as UserWithoutPassword[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserWithoutPassword> {
    const updateData: any = { ...updateUserDto };
    
    // 如果提供了新密码，需要加密
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('用户不存在');
    }

    return updatedUser as UserWithoutPassword;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('用户不存在');
    }
  }

  async ensureAdminExists() {
    const adminExists = await this.userModel.findOne({ role: 'admin' }).exec();
    if (!adminExists) {
      await this.create({
        username: 'admin',
        password: 'admin123',
        name: '系统管理员',
        role: 'admin',
        permissions: ['*'],
        active: true
      });
      console.log('初始管理员账户已创建');
    }
  }

  // 根据角色获取默认权限
  private getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'admin':
        return ['*']; // 管理员拥有所有权限
      case 'manager':
        return ['resume:all', 'customer:all', 'user:view'];
      case 'employee':
        return ['resume:view', 'resume:create', 'customer:view', 'customer:create'];
      default:
        return ['resume:view', 'customer:view'];
    }
  }
}