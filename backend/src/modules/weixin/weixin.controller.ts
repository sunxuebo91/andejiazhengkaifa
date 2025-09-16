import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  Logger,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { WeixinService } from './weixin.service';
import { GetOpenidDto } from './dto/get-openid.dto';
import { AdvisorSubscribeDto } from './dto/advisor-subscribe.dto';
import { CustomerActionDto } from './dto/customer-action.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('微信API')
@Controller()
export class WeixinController {
  private readonly logger = new Logger(WeixinController.name);

  constructor(private readonly weixinService: WeixinService) {}

  /**
   * 获取用户OpenID
   */
  @Post('wechat/openid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '通过微信code获取用户openid' })
  @ApiBody({ type: GetOpenidDto })
  @ApiResponse({ 
    status: 200, 
    description: '获取成功',
    schema: {
      example: {
        success: true,
        data: { openid: 'wx_openid_123456' },
        message: '获取openid成功',
        timestamp: 1626342025123
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async getOpenid(@Body() dto: GetOpenidDto) {
    try {
      this.logger.log(`获取openid请求: ${dto.code}`);
      
      const result = await this.weixinService.getOpenid(dto.code);
      
      return {
        success: true,
        data: { openid: result.openid },
        message: '获取openid成功',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('获取openid失败:', error);
      return {
        success: false,
        message: error.message || '获取openid失败',
        error: {
          code: 'GET_OPENID_FAILED',
          details: error.message,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 保存顾问订阅状态
   */
  @Post('advisor/subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '保存顾问的订阅消息授权状态' })
  @ApiBody({ type: AdvisorSubscribeDto })
  @ApiResponse({ 
    status: 200, 
    description: '保存成功',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439011',
          advisorId: 'advisor_123',
          openid: 'wx_openid_123456',
          templateId: 'template_123',
          subscribed: true,
          subscribeTime: '2024-01-01T12:00:00.000Z'
        },
        message: '保存订阅状态成功',
        timestamp: 1626342025123
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async saveAdvisorSubscribe(@Body() dto: AdvisorSubscribeDto) {
    try {
      this.logger.log(`保存顾问订阅状态: ${dto.advisorId}`);
      
      const result = await this.weixinService.saveAdvisorSubscribe(dto);
      
      return {
        success: true,
        data: result,
        message: '保存订阅状态成功',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('保存顾问订阅状态失败:', error);
      return {
        success: false,
        message: error.message || '保存订阅状态失败',
        error: {
          code: 'SAVE_SUBSCRIBE_FAILED',
          details: error.message,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 记录客户行为
   */
  @Post('customer/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '记录客户查看简历等行为' })
  @ApiBody({ type: CustomerActionDto })
  @ApiResponse({
    status: 200,
    description: '记录成功',
    schema: {
      example: {
        success: true,
        data: {
          action: {
            _id: '507f1f77bcf86cd799439011',
            customerId: 'customer_123',
            advisorId: 'advisor_123',
            actionType: 'view_resume',
            actionData: { resumeId: 'resume_123' },
            customerName: '张三',
            customerPhone: '13800138000',
            customerRecordId: '507f1f77bcf86cd799439012',
            notified: false
          },
          customerCreated: true,
          customerId: '507f1f77bcf86cd799439012',
          customer: {
            _id: '507f1f77bcf86cd799439012',
            name: '张三',
            phone: '13800138000',
            leadSource: '其他'
          }
        },
        message: '记录客户行为成功',
        timestamp: 1626342025123
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async recordCustomerAction(
    @Body() dto: CustomerActionDto,
    @Req() req: Request,
  ) {
    try {
      this.logger.log(`记录客户行为: ${dto.customerId} - ${dto.actionType}`);
      
      // 自动填充IP和UserAgent
      const enrichedDto = {
        ...dto,
        ip: dto.ip || req.ip || req.connection?.remoteAddress,
        userAgent: dto.userAgent || req.headers['user-agent'],
      };
      
      const result = await this.weixinService.recordCustomerAction(enrichedDto);

      // 构建增强的响应数据
      const responseMessage = result.customerCreated
        ? '记录客户行为成功，已创建新客户线索'
        : '记录客户行为成功';

      return {
        success: true,
        data: {
          actionId: result.action._id,
          customerCreated: result.customerCreated,
          customerId: result.customerId,
          action: result.action,
          customer: result.customer,
        },
        message: responseMessage,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('记录客户行为失败:', error);
      return {
        success: false,
        message: error.message || '记录客户行为失败',
        error: {
          code: 'RECORD_ACTION_FAILED',
          details: error.message,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 发送订阅消息
   */
  @Post('message/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '调用微信API发送订阅消息给顾问' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ 
    status: 200, 
    description: '发送成功',
    schema: {
      example: {
        success: true,
        data: {
          errcode: 0,
          errmsg: 'ok',
          msgid: 123456789
        },
        message: '发送订阅消息成功',
        timestamp: 1626342025123
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async sendSubscribeMessage(@Body() dto: SendMessageDto) {
    try {
      this.logger.log(`发送订阅消息: ${dto.touser}`);
      
      const result = await this.weixinService.sendSubscribeMessage(dto);
      
      return {
        success: true,
        data: result,
        message: '发送订阅消息成功',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('发送订阅消息失败:', error);
      return {
        success: false,
        message: error.message || '发送订阅消息失败',
        error: {
          code: 'SEND_MESSAGE_FAILED',
          details: error.message,
        },
        timestamp: Date.now(),
      };
    }
  }
}
