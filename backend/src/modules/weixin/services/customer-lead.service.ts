import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from '../../customers/models/customer.model';

export interface CreateCustomerFromWechatData {
  customerName: string;
  customerPhone: string;
  advisorId: string;
  actionType: string;
  actionData: any;
  openid: string;
}

export interface CustomerCreationResult {
  created: boolean;
  customerId?: string;
  isExisting: boolean;
  customer?: Customer;
  error?: string;
}

@Injectable()
export class CustomerLeadService {
  private readonly logger = new Logger(CustomerLeadService.name);

  constructor(
    @InjectModel('Customer') private readonly customerModel: Model<Customer>,
  ) {}

  /**
   * 从微信行为数据创建客户线索
   */
  async createCustomerFromWechatAction(data: CreateCustomerFromWechatData): Promise<CustomerCreationResult> {
    const { customerName, customerPhone, advisorId, actionType, openid } = data;

    try {
      // 1. 验证手机号格式
      if (!this.isValidPhoneNumber(customerPhone)) {
        return {
          created: false,
          isExisting: false,
          error: '手机号格式不正确'
        };
      }

      // 2. 检查客户是否已存在（按手机号查询）
      const existingCustomer = await this.customerModel.findOne({ 
        phone: customerPhone 
      }).exec();

      if (existingCustomer) {
        this.logger.log(`客户已存在: ${customerPhone} -> ${existingCustomer._id}`);
        return {
          created: false,
          customerId: existingCustomer._id.toString(),
          isExisting: true,
          customer: existingCustomer
        };
      }

      // 3. 创建新客户记录
      const customerData = {
        name: customerName,
        phone: customerPhone,
        wechatId: openid, // 保存微信openid
        leadSource: '其他', // 使用现有枚举值
        contractStatus: '待定', // 默认状态
        leadLevel: 'B类', // 默认等级
        createdBy: advisorId, // 负责顾问
        customerId: this.generateCustomerId(),
        remarks: `通过微信小程序${this.getActionTypeText(actionType)}自动创建`
      };

      const newCustomer = new this.customerModel(customerData);
      const savedCustomer = await newCustomer.save();

      this.logger.log(`成功创建新客户: ${customerPhone} -> ${savedCustomer._id}`);

      return {
        created: true,
        customerId: savedCustomer._id.toString(),
        isExisting: false,
        customer: savedCustomer
      };

    } catch (error) {
      this.logger.error(`创建客户失败: ${customerPhone}`, error);
      return {
        created: false,
        isExisting: false,
        error: error.message || '创建客户失败'
      };
    }
  }

  /**
   * 验证手机号格式
   */
  private isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;
    // 中国手机号正则：1开头，第二位是3-9，总共11位数字
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 生成客户ID（复用现有逻辑）
   */
  private generateCustomerId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CUS${timestamp.slice(-8)}${random}`;
  }

  /**
   * 获取行为类型的中文描述
   */
  private getActionTypeText(actionType: string): string {
    const actionTypeMap = {
      'view_resume': '查看简历',
      'contact_advisor': '联系顾问',
      'book_service': '预约服务',
    };
    return actionTypeMap[actionType] || '进行操作';
  }

  /**
   * 检查是否应该创建客户（有手机号且格式正确）
   */
  shouldCreateCustomer(customerPhone: string): boolean {
    return !!(customerPhone && this.isValidPhoneNumber(customerPhone));
  }
}
