import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Button, Empty, Spin, Typography, Space, Tag, notification as antNotification } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notification.service';
import notificationSocketService from '../services/notification-socket.service';
import { Notification, NotificationStatus, NotificationPriority } from '../types/notification.types';
import './NotificationBell.css';

const { Text } = Typography;

/**
 * 通知铃铛组件
 */
const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // 加载通知列表
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications({
        page: 1,
        pageSize: 10,
        status: NotificationStatus.SENT,
      });
      console.log('通知列表响应:', response);
      if (response && response.items) {
        setNotifications(response.items);
      } else {
        console.warn('通知列表响应格式异常:', response);
        setNotifications([]);
      }
    } catch (error) {
      console.error('加载通知失败:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载未读数量
  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('加载未读数量失败:', error);
    }
  };

  // 标记为已读
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead([notificationId]);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, status: NotificationStatus.READ } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 标记全部已读
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: NotificationStatus.READ }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  // 点击通知
  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    if (notification.status !== NotificationStatus.READ) {
      handleMarkAsRead(notification._id);
    }

    // 跳转到对应页面
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setVisible(false);
    }
  };

  // 显示通知弹窗
  const showNotificationPopup = (notification: Notification) => {
    const priorityConfig = {
      [NotificationPriority.HIGH]: { duration: 6, style: { borderLeft: '4px solid #ff4d4f' } },
      [NotificationPriority.MEDIUM]: { duration: 4, style: { borderLeft: '4px solid #faad14' } },
      [NotificationPriority.LOW]: { duration: 3, style: { borderLeft: '4px solid #1890ff' } },
    };

    const config = priorityConfig[notification.priority] || priorityConfig[NotificationPriority.MEDIUM];

    antNotification.open({
      message: notification.title,
      description: notification.content,
      icon: <BellOutlined style={{ color: '#1890ff' }} />,
      duration: config.duration,
      style: config.style,
      onClick: () => {
        handleNotificationClick(notification);
        antNotification.destroy();
      },
    });
  };

  // 初始化
  useEffect(() => {
    loadUnreadCount();

    // 监听新通知
    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev.slice(0, 9)]);
      setUnreadCount((prev) => prev + 1);

      // 🔔 显示桌面通知弹窗
      showNotificationPopup(notification);
    };

    // 监听未读数量更新
    const handleUnreadCountUpdate = (count: number) => {
      setUnreadCount(count);
    };

    notificationSocketService.on('notification', handleNewNotification);
    notificationSocketService.on('unreadCount', handleUnreadCountUpdate);

    return () => {
      notificationSocketService.off('notification', handleNewNotification);
      notificationSocketService.off('unreadCount', handleUnreadCountUpdate);
    };
  }, []);

  // 打开弹窗时加载通知
  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  // 获取优先级颜色
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.HIGH:
        return 'red';
      case NotificationPriority.MEDIUM:
        return 'orange';
      case NotificationPriority.LOW:
        return 'blue';
      default:
        return 'default';
    }
  };

  // 通知列表内容
  const content = (
    <div style={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>通知中心</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead}>
            全部已读
          </Button>
        )}
      </div>
      <Spin spinning={loading}>
        {notifications.length === 0 ? (
          <Empty description="暂无通知" style={{ padding: '40px 0' }} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                key={item._id}
                style={{
                  cursor: 'pointer',
                  backgroundColor: item.status === NotificationStatus.READ ? '#fafafa' : '#fff',
                  padding: '12px 16px',
                }}
                onClick={() => handleNotificationClick(item)}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong={item.status !== NotificationStatus.READ}>
                        {item.title}
                      </Text>
                      {item.status !== NotificationStatus.READ && (
                        <Tag color={getPriorityColor(item.priority)} style={{ marginLeft: 8 }}>
                          未读
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary">{item.content}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={visible}
      onOpenChange={setVisible}
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;

