import React from 'react';
import { Tag } from 'antd';

interface RoomStatusBadgeProps {
  status: 'active' | 'ended';
}

const RoomStatusBadge: React.FC<RoomStatusBadgeProps> = ({ status }) => {
  if (status === 'active') {
    return <Tag color="green">🟢 进行中</Tag>;
  }
  return <Tag color="default">🔴 已结束</Tag>;
};

export default RoomStatusBadge;

