import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './models/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(@InjectModel('Role') private readonly roleModel: Model<Role>) {}

  async onModuleInit() {
    await this.ensureDefaultRoles();
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const createdRole = new this.roleModel(createRoleDto);
    return createdRole.save();
  }

  async findAll(page: number = 1, pageSize: number = 10, search?: string) {
    const query = search 
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const skip = (page - 1) * pageSize;
    const [roles, total] = await Promise.all([
      this.roleModel
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      this.roleModel.countDocuments(query)
    ]);

    // 计算每个角色关联的用户数量（这里暂时返回模拟数据）
    const rolesWithUserCount = roles.map(role => ({
      ...role.toObject(),
      usersCount: this.getMockUserCount(role.name)
    }));

    return {
      items: rolesWithUserCount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const updatedRole = await this.roleModel
      .findByIdAndUpdate(id, updateRoleDto, { new: true })
      .exec();

    if (!updatedRole) {
      throw new NotFoundException('角色不存在');
    }

    return updatedRole;
  }

  async remove(id: string): Promise<void> {
    const result = await this.roleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('角色不存在');
    }
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ name }).exec();
  }

  // 确保默认角色存在
  async ensureDefaultRoles() {
    const defaultRoles = [
      {
        name: '系统管理员',
        description: '拥有系统所有权限',
        permissions: ['admin:all', 'resume:all', 'customer:all', 'user:all'],
        active: true
      },
      {
        name: '经理',
        description: '可以管理团队、阿姨资源和客户管理',
        permissions: ['resume:all', 'customer:all', 'user:view'],
        active: true
      },
      {
        name: '普通员工',
        description: '可以管理阿姨资源和客户',
        permissions: ['resume:view', 'resume:create', 'customer:view', 'customer:create'],
        active: true
      }
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.findByName(roleData.name);
      if (!existingRole) {
        await this.create(roleData);
        console.log(`默认角色 "${roleData.name}" 已创建`);
      }
    }
  }

  // 模拟用户数量（实际项目中应该从用户表查询）
  private getMockUserCount(roleName: string): number {
    switch (roleName) {
      case '系统管理员':
        return 1;
      case '经理':
        return 3;
      case '普通员工':
        return 10;
      default:
        return 0;
    }
  }
} 