import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Role } from './models/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AppLogger } from '../../common/logging/app-logger';
import {
  DEFAULT_ROLE_DEFINITIONS,
  getDefaultPermissionsForRole,
  normalizeRoleCode,
} from './role.constants';

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new AppLogger(RolesService.name);

  constructor(@InjectModel('Role') private readonly roleModel: Model<Role>) {}

  async onModuleInit() {
    await this.ensureDefaultRoles();
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const createdRole = new this.roleModel(this.normalizeRolePayload(createRoleDto));
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
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`无效的角色ID：${id}`);
    }
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`无效的角色ID：${id}`);
    }
    const updatedRole = await this.roleModel
      .findByIdAndUpdate(id, this.normalizeRolePayload(updateRoleDto), { new: true })
      .exec();

    if (!updatedRole) {
      throw new NotFoundException('角色不存在');
    }

    return updatedRole;
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`无效的角色ID：${id}`);
    }
    const result = await this.roleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('角色不存在');
    }
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ name }).exec();
  }

  async findByCode(code: string): Promise<Role | null> {
    const normalizedCode = normalizeRoleCode(code) ?? code;
    return this.roleModel.findOne({ code: normalizedCode }).exec();
  }

  normalizeRoleCode(role?: string | null): string | null {
    return normalizeRoleCode(role);
  }

  async getEffectivePermissions(role?: string | null): Promise<string[]> {
    const normalizedRole = normalizeRoleCode(role);
    if (!normalizedRole) {
      return getDefaultPermissionsForRole(role);
    }

    const roleRecord = await this.findByCode(normalizedRole);
    if (roleRecord?.permissions?.length) {
      if (roleRecord.permissions.includes('*')) {
        return ['*'];
      }
      return [...new Set(roleRecord.permissions)];
    }

    return getDefaultPermissionsForRole(normalizedRole);
  }

  getRoleDisplayName(role?: string | null): string {
    const normalizedRole = normalizeRoleCode(role);
    const definition = DEFAULT_ROLE_DEFINITIONS.find((item) => item.code === normalizedRole);
    return definition?.name ?? role ?? '';
  }

  // 确保默认角色存在
  async ensureDefaultRoles() {
    for (const roleData of DEFAULT_ROLE_DEFINITIONS) {
      const existingRole =
        (await this.findByCode(roleData.code)) ||
        (await this.findByName(roleData.name));

      if (!existingRole) {
        await this.create(roleData);
        this.logger.debug(`默认角色 "${roleData.name}" 已创建`);
        continue;
      }

      // 只补全缺失的元数据（code/name/description/active），不覆盖权限
      // 权限由管理员通过 UI 维护，重启不会丢失
      const updateData: Partial<Role> = {};
      if (!existingRole.code) {
        updateData.code = roleData.code;
      }
      if (existingRole.name !== roleData.name) {
        updateData.name = roleData.name;
      }
      if (existingRole.description !== roleData.description) {
        updateData.description = roleData.description;
      }
      // 仅当角色没有任何权限时才用常量初始化（防止空权限角色无法登录）
      const existingPermissions = Array.isArray(existingRole.permissions) ? existingRole.permissions : [];
      if (existingPermissions.length === 0) {
        updateData.permissions = roleData.permissions;
      }
      if (existingRole.active !== roleData.active) {
        updateData.active = roleData.active;
      }

      if (Object.keys(updateData).length > 0) {
        await this.roleModel.findByIdAndUpdate(existingRole._id, updateData).exec();
        this.logger.debug(`默认角色 "${roleData.name}" 已标准化`);
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

  private normalizeRolePayload<T extends Partial<CreateRoleDto | UpdateRoleDto>>(payload: T): T {
    const normalizedCode = normalizeRoleCode(payload.code || payload.name);
    const defaultDefinition = normalizedCode
      ? DEFAULT_ROLE_DEFINITIONS.find((role) => role.code === normalizedCode) ?? null
      : null;

    return {
      ...payload,
      code: normalizedCode ?? payload.code,
      name: payload.name || defaultDefinition?.name,
      permissions: payload.permissions ? [...new Set(payload.permissions)] : payload.permissions,
      active: payload.active ?? defaultDefinition?.active,
      description: payload.description || defaultDefinition?.description,
    };
  }
}
