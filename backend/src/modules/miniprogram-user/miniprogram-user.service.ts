import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { MiniProgramUser } from './models/miniprogram-user.entity';
import { RegisterMiniProgramUserDto } from './dto/register-miniprogram-user.dto';
import { UpdateMiniProgramUserDto } from './dto/update-miniprogram-user.dto';

@Injectable()
export class MiniProgramUserService {
  private readonly logger = new Logger(MiniProgramUserService.name);

  constructor(
    @InjectModel(MiniProgramUser.name)
    private readonly miniProgramUserModel: Model<MiniProgramUser>,
  ) {}

  /**
   * 加密密码
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * 移除敏感字段（密码）
   */
  private removeSensitiveFields(user: any): any {
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    return userObj;
  }

  /**
   * 验证密码
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * 注册或更新小程序用户
   * 优先使用 openid 查询用户，如果不存在则创建
   */
  async registerOrUpdate(dto: RegisterMiniProgramUserDto, ip?: string): Promise<MiniProgramUser> {
    try {
      // 1. 优先使用 openid 查找用户
      let user = await this.miniProgramUserModel.findOne({ openid: dto.openid });

      // 2. 如果 openid 没找到，尝试使用 phone 查找（兼容旧数据）
      if (!user && dto.phone) {
        user = await this.miniProgramUserModel.findOne({ phone: dto.phone });
      }

      // 3. 如果提供了密码，加密密码
      let hashedPassword: string | undefined;
      if (dto.password) {
        hashedPassword = await this.hashPassword(dto.password);
      }

      if (user) {
        // 用户已存在，更新信息和登录时间
        this.logger.log(`用户已存在，更新信息: openid=${dto.openid}, phone=${dto.phone}, username=${dto.username}`);
        user.phone = dto.phone || user.phone;
        user.username = dto.username || user.username;
        if (hashedPassword) {
          user.password = hashedPassword;
        }
        user.nickname = dto.nickname || user.nickname;
        user.avatar = dto.avatar || user.avatar;
        user.avatarFile = dto.avatarFile || user.avatarFile;
        user.openid = dto.openid || user.openid;
        user.unionid = dto.unionid || user.unionid;
        user.gender = dto.gender !== undefined ? dto.gender : user.gender;
        user.city = dto.city || user.city;
        user.province = dto.province || user.province;
        user.country = dto.country || user.country;
        user.language = dto.language || user.language;
        user.lastLoginAt = new Date();
        user.lastLoginIp = ip;
        user.loginCount = (user.loginCount || 0) + 1;

        await user.save();
        // 移除密码字段后返回
        return this.removeSensitiveFields(user) as any;
      } else {
        // 新用户，创建记录
        this.logger.log(`创建新用户: openid=${dto.openid}, phone=${dto.phone}, username=${dto.username}`);
        const newUser = new this.miniProgramUserModel({
          ...dto,
          password: hashedPassword, // 使用加密后的密码
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          loginCount: 1,
          status: 'active',
        });

        const savedUser = await newUser.save();
        // 移除密码字段后返回
        return this.removeSensitiveFields(savedUser) as any;
      }
    } catch (error) {
      this.logger.error(`注册或更新用户失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 记录用户登录
   * 优先使用 openid 查询，如果用户不存在则自动创建用户
   * @param openid 微信openid（优先）
   * @param phone 手机号（可选）
   * @param ip 登录IP
   * @param userInfo 用户信息（昵称、头像等，用于首次登录时创建用户）
   * @returns 用户信息和是否为新用户
   */
  async recordLogin(
    openid?: string,
    phone?: string,
    ip?: string,
    userInfo?: {
      nickname?: string;
      avatar?: string;
      avatarFile?: string;
      gender?: number;
      city?: string;
      province?: string;
      country?: string;
      language?: string;
    },
  ): Promise<any> {
    const now = new Date();
    let user: MiniProgramUser | null = null;

    // 1. 优先使用 openid 查询
    if (openid) {
      user = await this.miniProgramUserModel.findOne({ openid });
    }

    // 2. 如果 openid 没找到，尝试使用 phone 查询
    if (!user && phone) {
      user = await this.miniProgramUserModel.findOne({ phone });
    }

    if (user) {
      // 3. 用户存在，更新登录信息
      user.lastLoginAt = now;
      user.lastLoginIp = ip;
      user.loginCount = (user.loginCount || 0) + 1;

      // 如果提供了新的 openid 或 phone，更新它们
      if (openid && !user.openid) {
        user.openid = openid;
      }
      if (phone && !user.phone) {
        user.phone = phone;
      }

      // 如果提供了用户信息，更新用户资料（仅在字段为空时更新）
      if (userInfo) {
        if (userInfo.nickname && !user.nickname) {
          user.nickname = userInfo.nickname;
        }
        if (userInfo.avatar && !user.avatar) {
          user.avatar = userInfo.avatar;
        }
        if (userInfo.avatarFile && !user.avatarFile) {
          user.avatarFile = userInfo.avatarFile;
        }
        if (userInfo.gender !== undefined && user.gender === undefined) {
          user.gender = userInfo.gender;
        }
        if (userInfo.city && !user.city) {
          user.city = userInfo.city;
        }
        if (userInfo.province && !user.province) {
          user.province = userInfo.province;
        }
        if (userInfo.country && !user.country) {
          user.country = userInfo.country;
        }
        if (userInfo.language && !user.language) {
          user.language = userInfo.language;
        }
      }

      await user.save();

      const userObj = this.removeSensitiveFields(user);
      return {
        ...userObj,
        hasPhone: !!user.phone,
        isNewUser: false,
      };
    } else {
      // 4. 用户不存在，创建新用户（包含用户信息）
      if (!openid) {
        throw new NotFoundException('用户不存在，请先注册');
      }

      this.logger.log(`创建新用户: openid=${openid}, nickname=${userInfo?.nickname}`);
      const newUser = new this.miniProgramUserModel({
        openid,
        phone: phone || undefined,
        nickname: userInfo?.nickname,
        avatar: userInfo?.avatar,
        avatarFile: userInfo?.avatarFile,
        gender: userInfo?.gender,
        city: userInfo?.city,
        province: userInfo?.province,
        country: userInfo?.country,
        language: userInfo?.language,
        lastLoginAt: now,
        lastLoginIp: ip,
        loginCount: 1,
        status: 'active',
      });

      const savedUser = await newUser.save();

      const savedUserObj = this.removeSensitiveFields(savedUser);
      return {
        ...savedUserObj,
        hasPhone: !!savedUser.phone,
        isNewUser: true,
      };
    }
  }

  /**
   * 获取用户列表（分页）
   */
  async findAll(page = 1, pageSize = 20, search?: string) {
    const skip = (page - 1) * pageSize;
    const query: any = {};

    // 搜索条件
    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } },
      ];
    }

    const [list, total] = await Promise.all([
      this.miniProgramUserModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.miniProgramUserModel.countDocuments(query),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据ID获取用户
   */
  async findById(id: string): Promise<MiniProgramUser> {
    const user = await this.miniProgramUserModel.findById(id).lean().exec();
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user as MiniProgramUser;
  }

  /**
   * 根据手机号获取用户
   */
  async findByPhone(phone: string): Promise<MiniProgramUser | null> {
    return await this.miniProgramUserModel.findOne({ phone }).lean().exec();
  }

  /**
   * 根据openid获取用户
   */
  async findByOpenid(openid: string): Promise<MiniProgramUser | null> {
    return await this.miniProgramUserModel.findOne({ openid }).lean().exec();
  }

  /**
   * 使用账号密码登录
   */
  async loginWithPassword(username: string, password: string, ip?: string): Promise<any> {
    // 1. 查找用户（需要包含密码字段）
    const user = await this.miniProgramUserModel.findOne({ username }).exec();

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (!user.password) {
      throw new BadRequestException('该用户未设置密码，请使用其他方式登录');
    }

    // 2. 验证密码
    const isPasswordValid = await this.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 3. 更新登录信息
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // 4. 返回用户信息（不包含密码）
    const result = this.removeSensitiveFields(user);
    return {
      ...result,
      hasPhone: !!user.phone,
      isNewUser: false,
    };
  }

  /**
   * 更新用户信息
   */
  async update(id: string, dto: UpdateMiniProgramUserDto): Promise<MiniProgramUser> {
    const user = await this.miniProgramUserModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user as MiniProgramUser;
  }

  /**
   * 删除用户
   */
  async remove(id: string): Promise<void> {
    const result = await this.miniProgramUserModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('用户不存在');
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics() {
    const total = await this.miniProgramUserModel.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRegistered = await this.miniProgramUserModel.countDocuments({
      createdAt: { $gte: today },
    });

    const todayActive = await this.miniProgramUserModel.countDocuments({
      lastLoginAt: { $gte: today },
    });

    return {
      total,
      todayRegistered,
      todayActive,
    };
  }
}

