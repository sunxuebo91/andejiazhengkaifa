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
      {
        type: NotificationType.RESUME_RELEASE_REQUESTED,
        name: '简历释放申请通知',
        description: '他人首次用您创建的简历发起合同时，通知您前往打开释放开关',
        title: '简历释放申请',
        content: '{{initiatorName}} 想用您创建的简历【{{resumeName}}】发起合同，请前往详情页打开释放开关',
        priority: NotificationPriority.HIGH,
        icon: 'UnlockOutlined',
        color: '#fa8c16',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '前往释放',
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

      // ========== 表单相关 ==========
      {
        type: NotificationType.FORM_SUBMISSION_RECEIVED,
        name: '表单提交通知',
        description: '有新的表单提交时通知归属人',
        title: '新表单提交',
        content: '您分享的表单【{{formTitle}}】收到新提交{{submitterName}}{{submitterPhone}}',
        priority: NotificationPriority.HIGH,
        icon: 'FormOutlined',
        color: '#1890ff',
        actionUrl: '/forms/{{formId}}/submissions',
        actionText: '查看详情',
      },
      {
        type: NotificationType.FORM_SUBMISSION_RECEIVED_ADMIN,
        name: '表单提交通知（管理）',
        description: '有新的表单提交时通知表单创建者和管理员',
        title: '表单收到新提交',
        content: '表单【{{formTitle}}】收到新提交：{{submitterName}}{{submitterPhone}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'FormOutlined',
        color: '#1890ff',
        actionUrl: '/forms/{{formId}}/submissions',
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

      // ========== 职培线索相关 ==========
      {
        type: NotificationType.TRAINING_LEAD_ASSIGNED,
        name: '职培线索分配通知',
        description: '职培线索分配/流转给你时通知',
        title: '您有新的职培线索',
        content: '【{{leadName}}】已分配给您，电话：{{phone}}，请及时跟进！',
        priority: NotificationPriority.HIGH,
        icon: 'UserAddOutlined',
        color: '#ff4d4f',
        actionUrl: '/training-leads/{{leadId}}',
        actionText: '立即跟进',
      },
      {
        type: NotificationType.TRAINING_LEAD_FOLLOW_UP_ADDED,
        name: '职培线索跟进通知',
        description: '有人给你负责的线索添加了跟进记录时通知',
        title: '您的线索有新跟进记录',
        content: '{{operatorName}} 对线索【{{leadName}}】添加了跟进记录：{{summary}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'CommentOutlined',
        color: '#faad14',
        actionUrl: '/training-leads/{{leadId}}',
        actionText: '查看详情',
      },
      {
        type: NotificationType.TRAINING_LEAD_CREATED,
        name: '新职培线索创建通知',
        description: '有新职培线索录入时通知管理员',
        title: '新职培线索录入',
        content: '{{creatorName}} 录入了新职培线索：{{leadName}}（{{phone}}），请关注！',
        priority: NotificationPriority.LOW,
        icon: 'FileAddOutlined',
        color: '#52c41a',
        actionUrl: '/training-leads/{{leadId}}',
        actionText: '查看线索',
      },

      // ========== 推荐奖励系统（CRM 铃铛） ==========
      {
        type: NotificationType.REFERRAL_NEW_REFERRER_APPROVAL,
        name: '新推荐人待审批通知',
        description: '有新的推荐人申请注册，通知管理员/来源员工审批',
        title: '新推荐人待审批',
        content: '{{referrerName}}（{{referrerPhone}}）申请注册推荐人，请尽快审批',
        priority: NotificationPriority.HIGH,
        icon: 'UserAddOutlined',
        color: '#faad14',
        actionUrl: '/referral/referrers',
        actionText: '去审批',
      },

      // ========== 跟进记录相关（家政） ==========
      {
        type: NotificationType.RESUME_FOLLOW_UP_ADDED,
        name: '简历跟进通知',
        description: '有人给你负责的简历添加跟进记录时通知',
        title: '您的简历有新跟进记录',
        content: '{{operatorName}} 对简历【{{resumeName}}】添加了跟进记录：{{summary}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'CommentOutlined',
        color: '#faad14',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '查看详情',
      },
      {
        type: NotificationType.CUSTOMER_FOLLOW_UP_ADDED,
        name: '客户跟进通知',
        description: '有人给你负责的客户添加跟进记录时通知',
        title: '您的客户有新跟进记录',
        content: '{{operatorName}} 对客户【{{customerName}}】添加了跟进记录：{{summary}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'CommentOutlined',
        color: '#faad14',
        actionUrl: '/customers/{{customerId}}',
        actionText: '查看详情',
      },

      // ========== 合同审批相关 ==========
      {
        type: NotificationType.CONTRACT_APPROVAL_REQUESTED,
        name: '合同删除审批申请',
        description: '有员工申请删除合同时通知管理员',
        title: '合同删除审批申请',
        content: '{{requesterName}} 申请删除合同 {{contractNumber}}，原因：{{reason}}',
        priority: NotificationPriority.HIGH,
        icon: 'AuditOutlined',
        color: '#faad14',
        actionUrl: '/contract-approvals',
        actionText: '去审批',
      },
      {
        type: NotificationType.CONTRACT_APPROVAL_APPROVED,
        name: '合同删除审批通过',
        description: '合同删除审批通过时通知申请人',
        title: '合同删除已通过',
        content: '{{approverName}} 已通过您的合同 {{contractNumber}} 删除申请{{comment}}',
        priority: NotificationPriority.HIGH,
        icon: 'CheckCircleOutlined',
        color: '#52c41a',
        actionUrl: '/contract-approvals/my',
        actionText: '查看详情',
      },
      {
        type: NotificationType.CONTRACT_APPROVAL_REJECTED,
        name: '合同删除审批驳回',
        description: '合同删除审批被驳回时通知申请人',
        title: '合同删除已驳回',
        content: '{{approverName}} 驳回了您的合同 {{contractNumber}} 删除申请{{comment}}',
        priority: NotificationPriority.HIGH,
        icon: 'CloseCircleOutlined',
        color: '#ff4d4f',
        actionUrl: '/contract-approvals/my',
        actionText: '查看详情',
      },

      // ========== 阿姨黑名单 ==========
      {
        type: NotificationType.AUNT_BLACKLISTED,
        name: '阿姨拉黑通知',
        description: '阿姨被拉入黑名单时通知管理员',
        title: '新的黑名单阿姨',
        content: '{{operatorName}} 将阿姨【{{auntName}}】加入黑名单，原因：{{reason}}',
        priority: NotificationPriority.HIGH,
        icon: 'StopOutlined',
        color: '#ff4d4f',
        actionUrl: '/aunt-blacklist',
        actionText: '查看黑名单',
      },

      // ========== 面试 ==========
      {
        type: NotificationType.INTERVIEW_INVITED,
        name: '面试邀请通知',
        description: '阿姨收到面试邀请时通知简历负责人',
        title: '阿姨收到面试邀请',
        content: '阿姨【{{resumeName}}】收到了面试邀请，邀请人：{{operatorName}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'VideoCameraOutlined',
        color: '#1890ff',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '查看简历',
      },

      // ========== 员工评价 ==========
      {
        type: NotificationType.EMPLOYEE_EVALUATION_RECEIVED,
        name: '员工评价通知',
        description: '员工被评价时通知本人和管理员',
        title: '收到新的员工评价',
        content: '{{operatorName}} 对员工【{{employeeName}}】提交了评价（评分：{{score}}）',
        priority: NotificationPriority.MEDIUM,
        icon: 'StarOutlined',
        color: '#faad14',
        actionUrl: '/employee-evaluation',
        actionText: '查看评价',
      },

      // ========== 简历状态/接单状态/跟进逾期 ==========
      {
        type: NotificationType.RESUME_STATUS_CHANGED,
        name: '简历状态变更通知',
        description: '简历状态变更时通知负责人',
        title: '简历状态变更',
        content: '简历【{{resumeName}}】状态由 {{oldStatus}} 变更为 {{newStatus}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'SwapOutlined',
        color: '#1890ff',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '查看简历',
      },
      {
        type: NotificationType.RESUME_ORDER_STATUS_CHANGED,
        name: '阿姨接单状态变更通知',
        description: '阿姨接单状态变更时通知负责人',
        title: '阿姨接单状态变更',
        content: '阿姨【{{resumeName}}】接单状态由 {{oldStatus}} 变更为 {{newStatus}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'SwapOutlined',
        color: '#1890ff',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '查看简历',
      },
      {
        type: NotificationType.RESUME_FOLLOW_UP_DUE,
        name: '简历跟进逾期提醒',
        description: '简历长期未跟进时提醒',
        title: '简历跟进提醒',
        content: '简历【{{resumeName}}】已 {{days}} 天未跟进，请及时联系',
        priority: NotificationPriority.MEDIUM,
        icon: 'ClockCircleOutlined',
        color: '#faad14',
        actionUrl: '/resumes/{{resumeId}}',
        actionText: '去跟进',
      },

      // ========== 客户/合同状态变更/到期 ==========
      {
        type: NotificationType.CUSTOMER_STATUS_CHANGED,
        name: '客户状态变更通知',
        description: '客户状态变更时通知负责人',
        title: '客户状态变更',
        content: '客户【{{customerName}}】状态由 {{oldStatus}} 变更为 {{newStatus}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'SwapOutlined',
        color: '#1890ff',
        actionUrl: '/customers/{{customerId}}',
        actionText: '查看客户',
      },
      {
        type: NotificationType.CONTRACT_STATUS_CHANGED,
        name: '合同状态变更通知',
        description: '合同状态变更时通知相关人',
        title: '合同状态变更',
        content: '合同 {{contractNumber}}（客户：{{customerName}}）状态由 {{oldStatus}} 变更为 {{newStatus}}',
        priority: NotificationPriority.MEDIUM,
        icon: 'SwapOutlined',
        color: '#1890ff',
        actionUrl: '/contracts/{{contractId}}',
        actionText: '查看合同',
      },
      {
        type: NotificationType.CONTRACT_EXPIRING_SOON,
        name: '合同即将到期提醒',
        description: '合同即将到期时通知负责人',
        title: '合同即将到期',
        content: '合同 {{contractNumber}}（客户：{{customerName}}）将于 {{daysLeft}} 天后到期，请及时续约',
        priority: NotificationPriority.HIGH,
        icon: 'ClockCircleOutlined',
        color: '#fa541c',
        actionUrl: '/contracts/{{contractId}}',
        actionText: '查看合同',
      },

      // ========== 周报/月报 ==========
      {
        type: NotificationType.WEEKLY_REPORT,
        name: '周报',
        description: '每周工作数据汇总推送',
        title: '本周工作周报',
        content: '本周新增客户 {{newCustomers}} 个，跟进 {{followUps}} 次，签约 {{contracts}} 单',
        priority: NotificationPriority.MEDIUM,
        icon: 'BarChartOutlined',
        color: '#722ed1',
        actionUrl: '/dashboard',
        actionText: '查看详情',
      },
      {
        type: NotificationType.MONTHLY_REPORT,
        name: '月报',
        description: '每月工作数据汇总推送',
        title: '本月工作月报',
        content: '本月新增客户 {{newCustomers}} 个，跟进 {{followUps}} 次，签约 {{contracts}} 单',
        priority: NotificationPriority.MEDIUM,
        icon: 'BarChartOutlined',
        color: '#722ed1',
        actionUrl: '/dashboard',
        actionText: '查看详情',
      },

      // ========== 权限/账号安全 ==========
      {
        type: NotificationType.PERMISSION_CHANGED,
        name: '权限变更通知',
        description: '账号角色或权限变更时通知本人',
        title: '账号权限变更',
        content: '您的账号权限已被{{operatorName}}调整：{{summary}}',
        priority: NotificationPriority.HIGH,
        icon: 'SafetyOutlined',
        color: '#fa8c16',
        actionUrl: '/profile',
        actionText: '查看详情',
      },
      {
        type: NotificationType.ACCOUNT_SECURITY,
        name: '账号安全通知',
        description: '账号安全事件（异常登录、密码修改等）时通知本人',
        title: '账号安全提醒',
        content: '{{summary}}',
        priority: NotificationPriority.HIGH,
        icon: 'LockOutlined',
        color: '#ff4d4f',
        actionUrl: '/profile',
        actionText: '查看详情',
      },

      // ========== 职培线索自动流转相关 ==========
      {
        type: NotificationType.TRAINING_LEAD_AUTO_TRANSFER_OUT,
        name: '职培线索自动流出通知',
        description: '系统自动流转学员线索时通知流出方',
        title: '学员线索已自动流转',
        content: '【{{time}}】系统根据规则「{{ruleName}}」将您名下 {{count}} 条学员线索自动流转给其他顾问，请知悉',
        priority: NotificationPriority.HIGH,
        icon: 'SwapRightOutlined',
        color: '#faad14',
        actionUrl: '/training-leads',
        actionText: '查看线索',
      },
      {
        type: NotificationType.TRAINING_LEAD_AUTO_TRANSFER_IN,
        name: '职培线索自动流入通知',
        description: '系统自动流转学员线索时通知流入方',
        title: '您有新的学员线索',
        content: '【{{time}}】系统根据规则「{{ruleName}}」将 {{count}} 条学员线索分配给您，请尽快跟进！',
        priority: NotificationPriority.HIGH,
        icon: 'SwapLeftOutlined',
        color: '#52c41a',
        actionUrl: '/training-leads',
        actionText: '立即跟进',
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

