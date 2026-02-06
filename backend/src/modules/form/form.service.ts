import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { FormConfig, FormConfigDocument } from './models/form-config.model';
import { FormField, FormFieldDocument } from './models/form-field.model';
import { FormSubmission, FormSubmissionDocument } from './models/form-submission.model';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { QueryFormDto } from './dto/query-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { QuerySubmissionDto } from './dto/query-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ShortUrlService } from '../short-url/short-url.service';
import { NotificationHelperService } from '../notification/notification-helper.service';

@Injectable()
export class FormService {
  private readonly logger = new Logger(FormService.name);

  constructor(
    @InjectModel(FormConfig.name) private formConfigModel: Model<FormConfigDocument>,
    @InjectModel(FormField.name) private formFieldModel: Model<FormFieldDocument>,
    @InjectModel(FormSubmission.name) private formSubmissionModel: Model<FormSubmissionDocument>,
    private jwtService: JwtService,
    private shortUrlService: ShortUrlService,
    private notificationHelper: NotificationHelperService,
  ) {}

  /**
   * 创建表单（包含字段）
   */
  async create(dto: CreateFormDto, userId: string) {
    this.logger.log(`创建表单: ${dto.title}`);

    // 创建表单配置
    const formConfig = new this.formConfigModel({
      title: dto.title,
      description: dto.description,
      bannerUrl: dto.bannerUrl,
      status: dto.status || 'active',
      startTime: dto.startTime,
      endTime: dto.endTime,
      successMessage: dto.successMessage || '提交成功！感谢您的参与。',
      allowMultipleSubmissions: dto.allowMultipleSubmissions || false,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    const savedForm = await formConfig.save();

    // 创建表单字段
    const fields = dto.fields.map((field, index) => ({
      formId: savedForm._id,
      label: field.label,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      required: field.required || false,
      placeholder: field.placeholder,
      options: field.options || [],
      order: field.order !== undefined ? field.order : index,
      validationRule: field.validationRule,
      validationMessage: field.validationMessage,
    }));

    await this.formFieldModel.insertMany(fields);

    return this.findOne(savedForm._id.toString());
  }

  /**
   * 获取表单列表（分页）
   */
  async findAll(query: QueryFormDto) {
    const { status, keyword, page = 1, pageSize = 10 } = query;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (keyword) {
      filter.title = { $regex: keyword, $options: 'i' };
    }

    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      this.formConfigModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('createdBy', 'name username')
        .populate('updatedBy', 'name username')
        .exec(),
      this.formConfigModel.countDocuments(filter),
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
   * 获取单个表单（包含字段）
   */
  async findOne(id: string) {
    const form = await this.formConfigModel
      .findById(id)
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .exec();

    if (!form) {
      throw new NotFoundException(`表单 ${id} 不存在`);
    }

    const fields = await this.formFieldModel
      .find({ formId: new Types.ObjectId(id) })
      .sort({ order: 1 })
      .exec();

    return {
      ...form.toObject(),
      fields,
    };
  }

  /**
   * 更新表单
   */
  async update(id: string, dto: UpdateFormDto, userId: string) {
    this.logger.log(`更新表单: ${id}`);

    const form = await this.formConfigModel.findById(id);
    if (!form) {
      throw new NotFoundException(`表单 ${id} 不存在`);
    }

    // 更新表单配置
    Object.assign(form, {
      title: dto.title,
      description: dto.description,
      bannerUrl: dto.bannerUrl,
      status: dto.status,
      startTime: dto.startTime,
      endTime: dto.endTime,
      successMessage: dto.successMessage,
      allowMultipleSubmissions: dto.allowMultipleSubmissions,
      updatedBy: new Types.ObjectId(userId),
    });

    await form.save();

    // 如果有字段更新，删除旧字段并创建新字段
    if (dto.fields && dto.fields.length > 0) {
      await this.formFieldModel.deleteMany({ formId: new Types.ObjectId(id) });

      const fields = dto.fields.map((field, index) => ({
        formId: new Types.ObjectId(id),
        label: field.label,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        required: field.required || false,
        placeholder: field.placeholder,
        options: field.options || [],
        order: field.order !== undefined ? field.order : index,
        validationRule: field.validationRule,
        validationMessage: field.validationMessage,
      }));

      await this.formFieldModel.insertMany(fields);
    }

    return this.findOne(id);
  }

  /**
   * 删除表单
   */
  async remove(id: string) {
    this.logger.log(`删除表单: ${id}`);

    const form = await this.formConfigModel.findById(id);
    if (!form) {
      throw new NotFoundException(`表单 ${id} 不存在`);
    }

    // 删除表单字段
    await this.formFieldModel.deleteMany({ formId: new Types.ObjectId(id) });

    // 删除表单配置
    await this.formConfigModel.findByIdAndDelete(id);

    return { message: '删除成功' };
  }

  /**
   * 获取公开表单（用于H5页面）
   */
  async getPublicForm(id: string) {
    const form = await this.formConfigModel.findById(id).exec();

    if (!form) {
      throw new NotFoundException(`表单不存在`);
    }

    if (form.status !== 'active') {
      throw new BadRequestException('表单未激活');
    }

    // 检查时间范围
    const now = new Date();
    if (form.startTime && now < form.startTime) {
      throw new BadRequestException('表单尚未开始');
    }
    if (form.endTime && now > form.endTime) {
      throw new BadRequestException('表单已结束');
    }

    const fields = await this.formFieldModel
      .find({ formId: new Types.ObjectId(id) })
      .sort({ order: 1 })
      .select('-createdAt -updatedAt')
      .exec();

    // 增加浏览次数
    await this.formConfigModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    return {
      id: form._id,
      title: form.title,
      description: form.description,
      bannerUrl: form.bannerUrl,
      successMessage: form.successMessage,
      fields,
    };
  }

  /**
   * 检查手机号是否已提交过该表单
   */
  async checkPhoneDuplicate(formId: string, phoneNumber: string): Promise<boolean> {
    this.logger.log(`检查手机号重复: formId=${formId}, phone=${phoneNumber}`);

    // 验证表单是否存在
    const form = await this.formConfigModel.findById(formId);
    if (!form) {
      throw new NotFoundException(`表单不存在`);
    }

    // 获取表单的手机号字段
    const phoneField = await this.formFieldModel.findOne({
      formId: new Types.ObjectId(formId),
      fieldType: 'phone',
    });

    if (!phoneField) {
      return false; // 表单没有手机号字段，不需要检查
    }

    // 查询是否存在相同手机号的提交记录
    const existingSubmission = await this.formSubmissionModel.findOne({
      formId: new Types.ObjectId(formId),
      [`data.${phoneField.fieldName}`]: phoneNumber,
    });

    return !!existingSubmission;
  }

  /**
   * 生成表单分享令牌
   */
  async generateShareToken(formId: string, userId: string) {
    this.logger.log(`生成表单分享令牌: formId=${formId}, userId=${userId}`);

    // 验证表单是否存在
    const form = await this.formConfigModel.findById(formId);
    if (!form) {
      throw new NotFoundException(`表单不存在`);
    }

    // 生成JWT令牌
    const token = this.jwtService.sign({
      uid: userId,
      formId: formId,
    });

    // 生成完整的分享链接
    const baseUrl = process.env.FRONTEND_URL || 'https://crm.andejiazheng.com';
    const fullUrl = `${baseUrl}/public/form/${formId}?token=${token}`;

    // 生成短链接
    const expireAt = new Date(Date.now() + 720 * 60 * 60 * 1000); // 30天后过期
    const shortId = await this.shortUrlService.createShortUrl(fullUrl, expireAt);
    const shortUrl = `${baseUrl}/s/${shortId}`;

    return {
      token,
      shareUrl: shortUrl, // 返回短链接
      fullUrl, // 也返回完整链接（可选）
      expireAt,
    };
  }

  /**
   * 提交表单
   */
  async submitForm(formId: string, dto: SubmitFormDto, ipAddress: string, userAgent: string) {
    this.logger.log(`提交表单: ${formId}`);

    const form = await this.formConfigModel.findById(formId);
    if (!form) {
      throw new NotFoundException(`表单不存在`);
    }

    if (form.status !== 'active') {
      throw new BadRequestException('表单未激活');
    }

    // 获取表单字段配置
    const fields = await this.formFieldModel.find({ formId: new Types.ObjectId(formId) });

    // 检查手机号是否重复（如果表单包含手机号字段）
    // 这是主要的重复检测机制，防止同一个手机号多次提交
    const phoneField = fields.find(field => field.fieldType === 'phone');
    if (phoneField && dto.data[phoneField.fieldName]) {
      const phoneNumber = dto.data[phoneField.fieldName];
      const existingSubmissionWithPhone = await this.formSubmissionModel.findOne({
        formId: new Types.ObjectId(formId),
        [`data.${phoneField.fieldName}`]: phoneNumber,
      });

      if (existingSubmissionWithPhone) {
        throw new BadRequestException('该手机号已提交过此表单');
      }
    }

    // 注意：不再检查设备指纹/IP重复
    // 原因：很多场景下，同一个人（如销售人员）会用同一台设备帮多个客户填表
    // 只要手机号不重复，就允许提交
    // 如果需要严格的设备限制，应该在表单配置中单独设置

    // 验证必填字段
    for (const field of fields) {
      if (field.required && !dto.data[field.fieldName]) {
        throw new BadRequestException(`${field.label} 为必填项`);
      }
    }

    // 解析token获取referredBy
    let referredBy: Types.ObjectId | undefined;
    if (dto.token) {
      try {
        const payload = this.jwtService.verify(dto.token);
        if (payload.uid && payload.formId === formId) {
          referredBy = new Types.ObjectId(payload.uid);
          this.logger.log(`表单提交归属于用户: ${payload.uid}`);
        }
      } catch (error) {
        this.logger.warn(`无效的分享令牌: ${error.message}`);
        // 令牌无效不影响表单提交，只是不记录归属
      }
    }

    // 创建提交记录
    const submission = new this.formSubmissionModel({
      formId: new Types.ObjectId(formId),
      data: dto.data,
      deviceFingerprint: dto.deviceFingerprint,
      ipAddress,
      userAgent,
      wechatOpenId: dto.wechatOpenId,
      wechatUnionId: dto.wechatUnionId,
      source: dto.source || 'h5',
      referredBy,
    });

    await submission.save();

    // 增加提交次数
    await this.formConfigModel.findByIdAndUpdate(formId, { $inc: { submissionCount: 1 } });

    // 发送通知给归属人
    if (referredBy) {
      try {
        // 提取提交者姓名和手机号（如果有）
        const nameField = fields.find(field => field.fieldType === 'text' && (field.fieldName.includes('name') || field.label.includes('姓名')));
        const submitterName = nameField ? dto.data[nameField.fieldName] : undefined;
        const submitterPhone = phoneField ? dto.data[phoneField.fieldName] : undefined;

        await this.notificationHelper.notifyFormSubmission(referredBy.toString(), {
          formId: formId,
          formTitle: form.title,
          submissionId: submission._id.toString(),
          submitterName,
          submitterPhone,
        });

        this.logger.log(`已发送表单提交通知给用户: ${referredBy}`);
      } catch (error) {
        this.logger.error(`发送表单提交通知失败: ${error.message}`, error.stack);
        // 通知失败不影响表单提交
      }
    }

    return {
      message: form.successMessage,
      submissionId: submission._id,
    };
  }

  /**
   * 获取所有表单的提交列表
   */
  async getAllSubmissions(query: QuerySubmissionDto) {
    const { followUpStatus, startDate, endDate, page = 1, pageSize = 10 } = query;

    const filter: any = {};

    if (followUpStatus) {
      filter.followUpStatus = followUpStatus;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      this.formSubmissionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('formId', 'title')
        .populate('followUpBy', 'name username')
        .populate('referredBy', 'name username')
        .exec(),
      this.formSubmissionModel.countDocuments(filter),
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
   * 获取表单提交列表
   */
  async getSubmissions(formId: string, query: QuerySubmissionDto) {
    const { followUpStatus, startDate, endDate, page = 1, pageSize = 10 } = query;

    const filter: any = { formId: new Types.ObjectId(formId) };

    if (followUpStatus) {
      filter.followUpStatus = followUpStatus;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      this.formSubmissionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('followUpBy', 'name username')
        .populate('referredBy', 'name username')
        .exec(),
      this.formSubmissionModel.countDocuments(filter),
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
   * 更新提交记录（跟进）
   */
  async updateSubmission(submissionId: string, dto: UpdateSubmissionDto, userId: string) {
    this.logger.log(`更新提交记录: ${submissionId}`);

    const submission = await this.formSubmissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(`提交记录不存在`);
    }

    if (dto.followUpStatus) {
      submission.followUpStatus = dto.followUpStatus;
    }

    if (dto.followUpNote) {
      submission.followUpNote = dto.followUpNote;
    }

    submission.followUpBy = new Types.ObjectId(userId);
    submission.followUpAt = new Date();

    await submission.save();

    return submission;
  }

  /**
   * 获取表单统计数据
   */
  async getFormStats(formId: string) {
    const form = await this.formConfigModel.findById(formId);
    if (!form) {
      throw new NotFoundException(`表单不存在`);
    }

    const totalSubmissions = await this.formSubmissionModel.countDocuments({
      formId: new Types.ObjectId(formId),
    });

    const pendingCount = await this.formSubmissionModel.countDocuments({
      formId: new Types.ObjectId(formId),
      followUpStatus: 'pending',
    });

    const contactedCount = await this.formSubmissionModel.countDocuments({
      formId: new Types.ObjectId(formId),
      followUpStatus: 'contacted',
    });

    const completedCount = await this.formSubmissionModel.countDocuments({
      formId: new Types.ObjectId(formId),
      followUpStatus: 'completed',
    });

    return {
      formId,
      title: form.title,
      viewCount: form.viewCount,
      submissionCount: form.submissionCount,
      totalSubmissions,
      pendingCount,
      contactedCount,
      completedCount,
    };
  }

  /**
   * 删除提交记录（仅管理员）
   */
  async deleteSubmission(submissionId: string) {
    this.logger.log(`删除提交记录: ${submissionId}`);

    const submission = await this.formSubmissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(`提交记录不存在`);
    }

    // 删除提交记录
    await this.formSubmissionModel.findByIdAndDelete(submissionId);

    // 减少表单的提交次数
    await this.formConfigModel.findByIdAndUpdate(
      submission.formId,
      { $inc: { submissionCount: -1 } }
    );

    return {
      success: true,
      message: '删除成功'
    };
  }
}
