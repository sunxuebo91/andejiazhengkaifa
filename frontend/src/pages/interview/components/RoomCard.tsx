import React from 'react';
import { Card, Button, Space, Descriptions, Modal, message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { InterviewRoom } from '../../../types/interview.types';
import RoomStatusBadge from './RoomStatusBadge';

interface RoomCardProps {
  room: InterviewRoom;
  onRejoin: (room: InterviewRoom) => void;
  onEnd: (room: InterviewRoom) => void;
  onViewDetail: (room: InterviewRoom) => void;
}

/**
 * 格式化时长（秒 → 小时分钟）
 */
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
};

/**
 * 计算进行中的时长
 */
const getActiveDuration = (createdAt: string): string => {
  const now = dayjs();
  const created = dayjs(createdAt);
  const seconds = now.diff(created, 'second');
  return formatDuration(seconds);
};

/**
 * 格式化参与者列表
 */
const formatParticipants = (participants: InterviewRoom['participants']): string => {
  if (!participants || participants.length === 0) {
    return '无';
  }

  return participants.map(p => {
    // 解析用户名，格式可能是：
    // 1. "customer-大青蛙" -> "客户：大青蛙"
    // 2. "helper-王玉芬" -> "阿姨：王玉芬"
    // 3. "customer" -> "客户：无"
    // 4. "孙学博" (主持人) -> "主持人：孙学博"

    if (p.role === 'host') {
      return `主持人：${p.userName}`;
    }

    // 访客：从userName中提取角色和姓名
    const parts = p.userName.split('-');
    if (parts.length >= 2) {
      const roleText = parts[0] === 'customer' ? '客户' : parts[0] === 'helper' ? '阿姨' : parts[0];
      const name = parts.slice(1).join('-') || '无';
      return `${roleText}：${name}`;
    }

    // 如果没有"-"分隔符，使用identity字段判断角色
    if (p.identity === 'customer') {
      return `客户：${p.userName || '无'}`;
    } else if (p.identity === 'helper') {
      return `阿姨：${p.userName || '无'}`;
    }

    // 兜底：直接显示用户名
    return p.userName;
  }).join('、');
};

const RoomCard: React.FC<RoomCardProps> = ({ room, onRejoin, onEnd, onViewDetail }) => {
  const handleEnd = () => {
    Modal.confirm({
      title: '确认结束面试',
      content: '结束后将无法再次进入该面试间，确定要结束吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => onEnd(room),
    });
  };

  /**
   * 复制访客邀请链接
   */
  const handleCopyInviteLink = () => {
    // 🎯 使用 video-interview-guest.html（选择身份页面），而不是 video-interview-guest-room.html
    // 这样访客可以先选择身份（客户/阿姨），然后再进入房间
    const inviteLink = `https://crm.andejiazheng.com/miniprogram/video-interview-guest.html?roomId=${room.roomId}`;

    // 使用 Clipboard API 复制
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteLink)
        .then(() => {
          message.success('邀请链接已复制到剪贴板');
        })
        .catch(() => {
          // 降级方案
          fallbackCopyTextToClipboard(inviteLink);
        });
    } else {
      // 降级方案
      fallbackCopyTextToClipboard(inviteLink);
    }
  };

  /**
   * 降级复制方案（兼容旧浏览器）
   */
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('邀请链接已复制到剪贴板');
      } else {
        message.error('复制失败，请手动复制');
      }
    } catch (err) {
      message.error('复制失败，请手动复制');
    }

    document.body.removeChild(textArea);
  };

  return (
    <Card
      title={
        <Space>
          <RoomStatusBadge status={room.status} />
          <span>{room.roomName}</span>
        </Space>
      }
      extra={
        <span style={{ fontSize: '12px', color: '#999' }}>
          房间号: {room.roomId.substring(0, 8)}...
        </span>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions column={2} size="small">
        <Descriptions.Item label="创建时间">
          {dayjs(room.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="持续时长">
          {room.status === 'active'
            ? getActiveDuration(room.createdAt)
            : formatDuration(room.duration)}
        </Descriptions.Item>
        {room.endedAt && (
          <Descriptions.Item label="结束时间">
            {dayjs(room.endedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="参与者" span={2}>
          {formatParticipants(room.participants)}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          {room.status === 'active' && (
            <>
              <Button type="primary" onClick={() => onRejoin(room)}>
                重新进入
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={handleCopyInviteLink}
              >
                复制邀请链接
              </Button>
              <Button danger onClick={handleEnd}>
                结束面试
              </Button>
            </>
          )}
          <Button onClick={() => onViewDetail(room)}>查看详情</Button>
        </Space>
      </div>
    </Card>
  );
};

export default RoomCard;

