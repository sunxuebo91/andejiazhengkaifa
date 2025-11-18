import React from 'react';
import { Card, Button, Space, Descriptions, Modal } from 'antd';
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
        <Descriptions.Item label="参与者">
          {room.participants.length} 人
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          {room.status === 'active' && (
            <>
              <Button type="primary" onClick={() => onRejoin(room)}>
                重新进入
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

