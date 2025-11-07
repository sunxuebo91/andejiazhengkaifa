import React from 'react';
import { Card, Typography } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 视频面试测试页面
 */
const VideoInterviewTest: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <VideoCameraOutlined style={{ fontSize: '64px', color: '#5DBFB3', marginBottom: '24px' }} />
          <Title level={2}>视频面试功能</Title>
          <Paragraph type="secondary">
            页面加载成功！
          </Paragraph>
          <Paragraph type="secondary">
            ZEGO SDK 集成中...
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default VideoInterviewTest;

