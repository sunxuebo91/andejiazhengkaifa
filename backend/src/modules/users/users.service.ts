import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './models/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async create(createUserDto: any): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
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
}