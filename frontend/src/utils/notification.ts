import { message, notification } from 'antd';
import { ArgsProps } from 'antd/es/message';

// 消息显示队列
let messageQueue = [];
let isProcessingQueue = false;

// 节流时间 (毫秒)
const THROTTLE_TIME = 1000;

// 定义严重级别，用于决定消息显示方式
export enum SeverityLevel {
  INFO,    // 普通信息
  SUCCESS, // 成功信息
  WARNING, // 警告信息
  ERROR    // 错误信息
}

// 消息配置
interface NotificationConfig {
  content: string;
  severity?: SeverityLevel;
  duration?: number;
  key?: string; // 用于防止重复消息
}

// 显示消息的函数
export const showNotification = (config: NotificationConfig) => {
  const { content, severity = SeverityLevel.INFO, duration = 3, key } = config;
  
  // 如果有key，检查队列中是否已有相同key的消息
  if (key && messageQueue.some(item => item.key === key)) {
    return;
  }
  
  // 将消息加入队列
  messageQueue.push({ content, severity, duration, key, timestamp: Date.now() });
  
  // 如果没有正在处理队列，开始处理
  if (!isProcessingQueue) {
    processMessageQueue();
  }
};

// 处理消息队列
const processMessageQueue = async () => {
  isProcessingQueue = true;
  
  while (messageQueue.length > 0) {
    // 处理消息前先清理超过5秒钟的旧消息
    const now = Date.now();
    messageQueue = messageQueue.filter(msg => now - msg.timestamp < 5000);
    
    if (messageQueue.length === 0) break;
    
    // 获取队列中的第一条消息
    const { content, severity, duration } = messageQueue.shift();
    
    // 根据严重程度选择显示方式
    const config: ArgsProps = { content, duration };
    
    switch (severity) {
      case SeverityLevel.SUCCESS:
        message.success(config);
        break;
      case SeverityLevel.WARNING:
        message.warning(config);
        break;
      case SeverityLevel.ERROR:
        // 错误使用notification而不是message
        notification.error({
          message: '操作失败',
          description: content,
          duration
        });
        break;
      default:
        message.info(config);
    }
    
    // 等待一段时间再显示下一条消息，避免弹窗堆积
    await new Promise(resolve => setTimeout(resolve, THROTTLE_TIME));
  }
  
  isProcessingQueue = false;
};

// 清除所有消息
export const clearAllNotifications = () => {
  messageQueue = [];
  message.destroy();
  notification.destroy();
};

// 预定义的通知函数
export const notifySuccess = (content: string, key?: string) => 
  showNotification({ content, severity: SeverityLevel.SUCCESS, key });

export const notifyError = (content: string, key?: string) => 
  showNotification({ content, severity: SeverityLevel.ERROR, key });

export const notifyWarning = (content: string, key?: string) => 
  showNotification({ content, severity: SeverityLevel.WARNING, key });

export const notifyInfo = (content: string, key?: string) => 
  showNotification({ content, severity: SeverityLevel.INFO, key }); 