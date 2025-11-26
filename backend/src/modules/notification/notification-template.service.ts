import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationTemplate, NotificationType, NotificationPriority } from './models/notification-template.model';

/**
 * 通知模板服务 - 负责初始化和管理通知模板
 */
@Injectable()
export class NotificationTemplateService implements OnModuleInit {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplate>,
  ) {}

  /**
   * 模块初始化时创建默认模板
   */
  async onModuleInit() {
    await this.initializeDefaultTemplates();
  }

  /**
   * 初始化默认通知模板
   */
  private async initializeDefaultTemplates() {
    const templates = [
      // ========== 简历相关 ==========
      {
        type: NotificationType.RESUME_CREATED,
        name: '新简历创建通知',
        description: '有新简历创建时通知管理员',
        title: '新简历创建',
        content: '{{creatorName}} 创建了新简历：{{resumeName}}（{{phone}}），工种：{{jobType}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'FileAddOutlined',
        color: '#52c41a',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '查看详情',
      },
      {
        type: NotificationType.RESUME_ASSIGNED,
        name: '简历分配通知',
        description: '简历被分配时通知负责人',
        title: '简历分配通知',
        content: '管理员将简历 {{resumeName}} 分配给了您，请及时跟进',
        priority: NotificationPriority.HIGH,
        icon: 'UserAddOutlined',
        color: '#1890ff',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '查看简历',
      },

      // ========== 客户相关 ==========
      {
        type: NotificationType.CUSTOMER_CREATED,
        name: '新客户创建通知',
        description: '有新客户创建时通知管理员',
        title: '新客户创建',
        content: '{{creatorName}} 创建了新客户：{{customerName}}（{{phone}}），来源：{{leadSource}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'UserAddOutlined',
        color: '#52c41a',
        actionUrl: '/customers/{{customerId}}',
        actionText: '查看详情',
      },
      {
        type: NotificationType.CUSTOMER_ASSIGNED,
        name: '客户分配通知',
        description: '客户被分配时通知负责人',
        title: '客户分配通知',
        content: '您有新的客户【{{customerName}}】，电话：{{phone}}，来源：{{leadSource}}，请及时跟进！',
        priority: NotificationPriority.HIGH,
        icon: 'BellOutlined',
        color: '#ff4d4f',
        actionUrl: '/customers/{{customerId}}',
        actionText: '立即跟进',
      },
      {
        type: NotificationType.CUSTOMER_TRANSFERRED,
        name: '客户转移通知',
        description: '客户负责人变更时通知',
        title: '客户转移通知',
        content: '客户 {{customerName}} 已从 {{oldOwner}} 转移给您，请及时跟进',
        priority: NotificationPriority.HIGH,
        icon: 'SwapOutlined',
        color: '#faad14',
        actionUrl: '/customers/{{customerId}}',
        actionText: '查看客户',
      },
      {
        type: NotificationType.CUSTOMER_RECLAIMED,
        name: '客户回收通知',
        description: '客户被回收到公海时通知',
        title: '客户回收通知',
        content: '您的客户 {{customerName}} 已被回收到公海，原因：{{reason}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'WarningOutlined',
        color: '#ff7a45',
        actionUrl: '/customers/pool',
        actionText: '查看公海',
      },
      {
        type: NotificationType.CUSTOMER_ASSIGNED_FROM_POOL,
        name: '公海客户分配通知',
        description: '从公海分配客户时通知',
        title: '公海客户分配',
        content: '管理员从公海分配了客户 {{customerName}} 给您，请及时跟进',
        priority: NotificationPriority.HIGH,
        icon: 'ThunderboltOutlined',
        color: '#1890ff',
        actionUrl: '/customers/{{customerId}}',
        actionText: '立即跟进',
      },
      {
        type: NotificationType.CUSTOMER_FOLLOW_UP_DUE,
        name: '客户跟进提醒',
        description: '客户长期未跟进时提醒',
        title: '客户跟进提醒',
        content: '客户 {{customerName}} 已 {{days}} 天未跟进，请及时联系',
        priority: NotificationPriority.MEDIUM,
        icon: 'ClockCircleOutlined',
        color: '#faad14',
        actionUrl: '/customers/{{customerId}}',
        actionText: '去跟进',
      },

      // ========== 线索自动流转相关 ==========
      {
        type: NotificationType.LEAD_AUTO_TRANSFER_OUT,
        name: '线索流出通知',
        description: '系统自动流转线索时通知流出用户',
        title: '线索自动流出通知',
        content: '您有 {{count}} 条线索已于 {{time}} 自动流转给其他同事，规则：{{ruleName}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'ExportOutlined',
        color: '#faad14',
        actionUrl: '/customers/lead-transfer-records',
        actionText: '查看详情',
      },
      {
        type: NotificationType.LEAD_AUTO_TRANSFER_IN,
        name: '线索流入通知',
        description: '系统自动流转线索时通知接收用户',
        title: '线索自动流入通知',
        content: '您有 {{count}} 条新线索已于 {{time}} 自动流转给您，规则：{{ruleName}}',
        priority: NotificationPriority.HIGH,
        icon: 'ImportOutlined',
        color: '#52c41a',
        actionUrl: '/customers/lead-transfer-records',
        actionText: '查看详情',
      },

      // ========== 合同相关 ==========
      {
        type: NotificationType.CONTRACT_CREATED,
        name: '合同创建通知',
        description: '新合同创建时通知',
        title: '新合同创建',
        content: '客户 {{customerName}} 的合同已创建，合同编号：{{contractNumber}}',
        priority: NotificationPriority.HIGH,
        icon: 'FileTextOutlined',
        color: '#52c41a',
        actionUrl: '/contracts/{{contractId}}',
        actionText: '查看合同',
      },
      {
        type: NotificationType.CONTRACT_SIGNED,
        name: '合同签署完成通知',
        description: '合同签署完成时通知',
        title: '合同签署完成',
        content: '客户 {{customerName}} 的合同已签署完成，合同编号：{{contractNumber}}',
        priority: NotificationPriority.HIGH,
        icon: 'CheckCircleOutlined',
        color: '#52c41a',
        actionUrl: '/contracts/{{contractId}}',
        actionText: '查看合同',
      },
      {
        type: NotificationType.CONTRACT_WORKER_CHANGED,
        name: '合同换人通知',
        description: '合同换阿姨时通知',
        title: '合同换人通知',
        content: '客户 {{customerName}} 的合同已换人，原阿姨：{{oldWorker}}，新阿姨：{{newWorker}}',
        priority: NotificationPriority.HIGH,
        icon: 'SwapOutlined',
        color: '#faad14',
        actionUrl: '/contracts/{{contractId}}',
        actionText: '查看详情',
      },

      // ========== 日报相关 ==========
      {
        type: NotificationType.DAILY_REPORT_PERSONAL,
        name: '个人日报',
        description: '每日个人工作数据推送',
        title: '今日工作日报',
        content: '今日新增客户 {{newCustomers}} 个，跟进 {{followUps}} 次，签约 {{contracts}} 单',
        priority: NotificationPriority.MEDIUM,
        icon: 'BarChartOutlined',
        color: '#1890ff',
        actionUrl: '/dashboard',
        actionText: '查看详情',
      },
      {
        type: NotificationType.DAILY_REPORT_TEAM,
        name: '团队日报',
        description: '每日团队数据推送（管理员）',
        title: '团队日报',
        content: '今日团队新增客户 {{newCustomers}} 个，签约 {{contracts}} 单，业绩排名：{{topSales}}',
        priority: NotificationPriority.HIGH,
        icon: 'TeamOutlined',
        color: '#722ed1',
        actionUrl: '/dashboard',
        actionText: '查看详情',
      },

      // ========== 系统相关 ==========
      {
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        name: '系统公告',
        description: '系统公告通知',
        title: '系统公告',
        content: '{{content}}',
        priority: NotificationPriority.HIGH,
        icon: 'NotificationOutlined',
        color: '#ff4d4f',
        actionUrl: '{{actionUrl}}',
        actionText: '查看详情',
      },
    ];

    for (const template of templates) {
      await this.templateModel.updateOne(
        { type: template.type },
        { $setOnInsert: template },
        { upsert: true }
      );
    }

    this.logger.log('通知模板初始化完成');
  }
}

