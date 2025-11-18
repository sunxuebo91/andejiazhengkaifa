import React, { useState, useEffect } from 'react';
import { Card, Tabs, Input, Pagination, Empty, Spin, message, Button, Space, Modal } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { InterviewRoom } from '../../types/interview.types';
import { interviewService } from '../../services/interview.service';
import RoomCard from './components/RoomCard';
import './InterviewRoomList.css';

const { Search } = Input;

const InterviewRoomList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<InterviewRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [status, setStatus] = useState<'active' | 'ended' | undefined>(undefined);
  const [searchText, setSearchText] = useState('');

  /**
   * 加载房间列表
   */
  const loadRooms = async () => {
    setLoading(true);
    try {
      const response = await interviewService.getRooms({
        status,
        page,
        pageSize,
        search: searchText || undefined,
      });
      // API 返回格式: { success: true, data: { list: [], total: 0 } }
      const data = response.data;
      setRooms(data?.list || []);
      setTotal(data?.total || 0);
    } catch (error: any) {
      message.error(error.message || '加载面试间列表失败');
      setRooms([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [status, page, searchText]);

  /**
   * 切换状态标签
   */
  const handleTabChange = (key: string) => {
    setStatus(key === 'all' ? undefined : (key as 'active' | 'ended'));
    setPage(1);
  };

  /**
   * 搜索
   */
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  /**
   * 重新进入面试间
   */
  const handleRejoin = async (room: InterviewRoom) => {
    try {
      // 先检查房间状态
      const response = await interviewService.checkRoomStatus(room.roomId);
      const statusData = response.data;

      if (statusData?.dbStatus === 'ended') {
        message.warning('该面试间已结束，无法重新进入');
        loadRooms(); // 刷新列表
        return;
      }

      if (statusData?.isDismissed) {
        message.warning('该面试间已被解散，无法重新进入');
        loadRooms(); // 刷新列表
        return;
      }

      // 跳转到面试间页面
      navigate(`/interview/room/${room.roomId}`);
    } catch (error: any) {
      message.error(error.message || '检查房间状态失败');
    }
  };

  /**
   * 结束面试间
   */
  const handleEnd = async (room: InterviewRoom) => {
    try {
      await interviewService.endRoom(room.roomId);
      message.success('面试间已结束');
      loadRooms(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || '结束面试间失败');
    }
  };

  /**
   * 查看详情
   */
  const handleViewDetail = (room: InterviewRoom) => {
    Modal.info({
      title: '面试间详情',
      width: 600,
      content: (
        <div>
          <p><strong>房间ID:</strong> {room.roomId}</p>
          <p><strong>房间名称:</strong> {room.roomName}</p>
          <p><strong>主持人:</strong> {room.hostName}</p>
          <p><strong>状态:</strong> {room.status === 'active' ? '进行中' : '已结束'}</p>
          <p><strong>参与者:</strong></p>
          <ul>
            {room.participants.map((p, index) => (
              <li key={index}>
                {p.userName} ({p.role === 'host' ? '主持人' : '访客'})
                {p.identity && ` - ${p.identity}`}
              </li>
            ))}
          </ul>
        </div>
      ),
    });
  };

  /**
   * 创建新面试间 - 跳转到小程序H5主持人页面
   */
  const handleCreateRoom = () => {
    navigate('/interview/miniprogram');
  };

  return (
    <div className="interview-room-list">
      <Card
        title="面试间列表"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRoom}>
              创建面试间
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadRooms}>
              刷新
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索房间名称或房间号"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
        </div>

        <Tabs
          activeKey={status || 'all'}
          onChange={handleTabChange}
          items={[
            { label: '全部', key: 'all' },
            { label: '进行中', key: 'active' },
            { label: '已结束', key: 'ended' },
          ]}
        />

        <Spin spinning={loading}>
          {rooms.length === 0 ? (
            <Empty description="暂无面试间" style={{ padding: '40px 0' }} />
          ) : (
            <>
              {rooms.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  onRejoin={handleRejoin}
                  onEnd={handleEnd}
                  onViewDetail={handleViewDetail}
                />
              ))}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(newPage) => setPage(newPage)}
                  showSizeChanger={false}
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            </>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default InterviewRoomList;

