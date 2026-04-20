import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserWithoutPassword } from './models/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { AppLogger } from '../../common/logging/app-logger';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class UsersService {
  private readonly logger = new AppLogger(UsersService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly rolesService: RolesService,
  ) {}

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
    if (!user) {
      return null;
    }

    return this.toUserWithoutPassword(user as UserWithoutPassword);
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async create(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    const normalizedRole = this.normalizeRole(createUserDto.role) ?? createUserDto.role;
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const resolvedPermissions = createUserDto.permissions || await this.rolesService.getEffectivePermissions(normalizedRole);
    const createdUser = new this.userModel({
      ...createUserDto,
      role: normalizedRole,
      password: hashedPassword,
      permissions: resolvedPermissions,
    });
    const savedUser = await createdUser.save();
    
    // 使用 lean() 获取纯 JavaScript 对象
    const userObj = savedUser.toObject();
    const { password, ...userWithoutPassword } = userObj;
    return this.toUserWithoutPassword(userWithoutPassword as UserWithoutPassword);
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
      items: await Promise.all((users as UserWithoutPassword[]).map((user) => this.toUserWithoutPassword(user))),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserWithoutPassword> {
    const updateData: any = { ...updateUserDto };
    const existingUser = await this.userModel.findById(id).select('_id').lean().exec();
    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }
    
    // 如果提供了新密码，需要加密
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role) {
      updateData.role = this.normalizeRole(updateUserDto.role) ?? updateUserDto.role;
    }

    if (updateUserDto.role && typeof updateUserDto.permissions === 'undefined') {
      updateData.permissions = await this.rolesService.getEffectivePermissions(updateData.role);
    }

    if (Array.isArray(updateUserDto.permissions)) {
      updateData.permissions = [...new Set(updateUserDto.permissions)];
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserWithoutPassword(updatedUser as UserWithoutPassword);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('用户不存在');
    }
  }

  async ensureAdminExists() {
    const adminExists = await this.userModel.findOne({ role: { $in: ['admin', '系统管理员', '管理员'] } }).exec();
    if (!adminExists) {
      await this.create({
        username: 'admin',
        password: 'admin123',
        name: '系统管理员',
        email: 'admin@andejiazheng.com',
        phone: '13800138000',
        role: 'admin',
        permissions: ['*'],
        active: true
      });
      this.logger.debug('初始管理员账户已创建');
    } else {
      // 如果管理员存在但缺少email或phone字段，则更新
      if (!adminExists.email || !adminExists.phone || adminExists.role !== 'admin') {
        await this.userModel.findByIdAndUpdate(adminExists._id, {
          role: 'admin',
          email: adminExists.email || 'admin@andejiazheng.com',
          phone: adminExists.phone || '13800138000',
          permissions: ['*'],
        });
        this.logger.debug('管理员账户信息已更新');
      }
    }
  }

  /**
   * 更新用户头像
   */
  async updateAvatar(id: string, avatarUrl: string): Promise<UserWithoutPassword> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { avatar: avatarUrl }, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserWithoutPassword(updatedUser as UserWithoutPassword);
  }

  /**
   * 暂停用户账号
   */
  async suspendUser(id: string): Promise<UserWithoutPassword> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { suspended: true }, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserWithoutPassword(updatedUser as UserWithoutPassword);
  }

  /**
   * 恢复用户账号
   */
  async resumeUser(id: string): Promise<UserWithoutPassword> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { suspended: false }, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserWithoutPassword(updatedUser as UserWithoutPassword);
  }

  // 更新用户微信信息
  async updateWeChatInfo(userId: string, wechatInfo: {
    openId: string;
    nickname?: string;
    avatar?: string;
  }): Promise<UserWithoutPassword> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          wechatOpenId: wechatInfo.openId,
          wechatNickname: wechatInfo.nickname,
          wechatAvatar: wechatInfo.avatar,
        },
        { new: true }
      )
      .select('-password')
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserWithoutPassword(updatedUser as UserWithoutPassword);
  }

  // 根据微信OpenID查找用户
  async findByWeChatOpenId(openId: string): Promise<UserWithoutPassword | null> {
    const user = await this.userModel
      .findOne({ wechatOpenId: openId })
      .select('-password')
      .lean()
      .exec();

    return user ? this.toUserWithoutPassword(user as UserWithoutPassword) : null;
  }

  // 获取已绑定微信的用户列表
  async findUsersWithWeChat(): Promise<UserWithoutPassword[]> {
    const users = await this.userModel
      .find({ wechatOpenId: { $exists: true, $ne: null } })
      .select('-password')
      .lean()
      .exec();

    return Promise.all((users as UserWithoutPassword[]).map((user) => this.toUserWithoutPassword(user)));
  }

  async toUserWithoutPassword(user: UserWithoutPassword): Promise<UserWithoutPassword> {
    const normalizedRole = this.normalizeRole(user.role) ?? user.role;
    const rolePermissions = await this.rolesService.getEffectivePermissions(normalizedRole);
    const explicitPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const permissions = rolePermissions.length > 0 ? rolePermissions : explicitPermissions;

    if (rolePermissions.length > 0 && explicitPermissions.length > 0) {
      const explicitKey = [...explicitPermissions].sort().join(',');
      const roleKey = [...rolePermissions].sort().join(',');
      if (explicitKey !== roleKey) {
        this.logger.warn(`User ${user.username}(${user._id}) has stale permission snapshot; using role-backed permissions for runtime access`);
      }
    }

    return {
      ...user,
      role: normalizedRole,
      permissions,
    };
  }

  private normalizeRole(role?: string | null): string | null {
    return this.rolesService.normalizeRoleCode(role);
  }

  /**
   * 根据手机号判断是否为员工，以及是否为管理员
   * 用于推荐返费系统的角色判断
   */
  async checkStaffAndAdmin(phone?: string): Promise<{ isStaff: boolean; isAdmin: boolean; staffUser?: any }> {
    if (!phone) return { isStaff: false, isAdmin: false };
    try {
      const staffUser = await this.userModel.findOne({ phone }).select('-password').lean().exec();
      if (!staffUser) return { isStaff: false, isAdmin: false };
      return {
        isStaff: true,
        isAdmin: !!(staffUser as any).isAdmin,
        staffUser,
      };
    } catch {
      return { isStaff: false, isAdmin: false };
    }
  }

  /**
   * 获取所有在职员工列表（isActive=true），供管理员重新分配时选择
   */
  async findActiveStaff(): Promise<UserWithoutPassword[]> {
    const users = await this.userModel
      .find({ isActive: { $ne: false }, active: true })
      .select('-password')
      .lean()
      .exec();
    return Promise.all((users as UserWithoutPassword[]).map((user) => this.toUserWithoutPassword(user)));
  }

  /**
   * 获取管理员用户：
   *  优先找 isAdmin=true 的在职用户；
   *  若找不到，兜底找 role='admin' 的活跃用户。
   */
  async findAdminUser(): Promise<UserWithoutPassword | null> {
    // 优先：推荐返费系统专属 isAdmin 标志
    let user = await this.userModel
      .findOne({ isAdmin: true, isActive: { $ne: false } })
      .select('-password')
      .lean()
      .exec();

    // 兜底：系统管理员 role
    if (!user) {
      user = await this.userModel
        .findOne({ role: { $in: ['admin', '系统管理员', '管理员'] }, active: { $ne: false } })
        .select('-password')
        .lean()
        .exec();
    }

    return user ? this.toUserWithoutPassword(user as UserWithoutPassword) : null;
  }

  /**
   * 标记员工离职
   */
  async markStaffDeparted(staffId: string, leftAt: Date): Promise<UserWithoutPassword> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(staffId, { isActive: false, leftAt }, { new: true })
      .select('-password')
      .lean()
      .exec();
    if (!updatedUser) {
      throw new NotFoundException('员工不存在');
    }
    return this.toUserWithoutPassword(updatedUser as UserWithoutPassword);
  }

  /**
   * 根据ID获取用户（含离职信息，用于返费归属判断）
   */
  async findByIdWithDeparture(id: string): Promise<any> {
    return this.userModel.findById(id).select('-password').lean().exec();
  }

  /**
   * 批量根据ID列表查询用户姓名（仅返回 id→name 映射，不做权限处理，高性能）
   * 用于列表页需要展示员工名字但不需要其他信息的场景
   */
  async findNamesByIds(ids: string[]): Promise<Record<string, string>> {
    const validIds = ids.filter(id => id && Types.ObjectId.isValid(id));
    if (!validIds.length) return {};
    const users = await this.userModel
      .find({ _id: { $in: validIds } })
      .select('_id name')
      .lean()
      .exec();
    const map: Record<string, string> = {};
    for (const u of users as any[]) map[u._id.toString()] = u.name;
    return map;
  }
}
