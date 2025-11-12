import React, { useState } from 'react';
import { Card, Typography, Tabs, Space, Button, message, Divider, Tag, Alert } from 'antd';
import { CopyOutlined, CheckCircleOutlined, LinkOutlined, QrcodeOutlined, CodeOutlined } from '@ant-design/icons';
import './MiniProgramConfig.css';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

/**
 * 小程序视频面试配置页面
 * 显示小程序集成说明、H5文件访问地址、代码示例等
 */
const MiniProgramConfig: React.FC = () => {
  const [copiedText, setCopiedText] = useState<string>('');

  const baseUrl = window.location.origin;
  const hostUrl = `${baseUrl}/miniprogram/video-interview-host.html`;
  const guestUrl = `${baseUrl}/miniprogram/video-interview.html?room={roomId}`;

  // 复制文本到剪贴板
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        message.success(`${label}已复制到剪贴板`);
        setCopiedText(label);
        setTimeout(() => setCopiedText(''), 2000);
      })
      .catch(() => {
        message.error('复制失败，请手动复制');
      });
  };

  // 小程序代码示例
  const wxml = `<!-- pages/interview/interview.wxml -->
<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>`;

  const js = `// pages/interview/interview.js
Page({
  data: {
    webviewUrl: ''
  },

  onLoad(options) {
    const roomId = options.roomId || '';
    const role = options.role || 'guest'; // 'host' 或 'guest'
    
    let url = '';
    if (role === 'host') {
      // HR端
      url = '${hostUrl}';
    } else {
      // 访客端
      url = '${baseUrl}/miniprogram/video-interview.html?room=' + roomId;
    }
    
    this.setData({ webviewUrl: url });
  },

  handleMessage(e) {
    console.log('收到H5消息:', e.detail.data);
    const msg = e.detail.data[e.detail.data.length - 1];
    if (msg.type === 'leave') {
      wx.navigateBack();
    }
  }
});`;

  const json = `{
  "navigationBarTitleText": "视频面试",
  "usingComponents": {}
}`;

  const wxss = `/* pages/interview/interview.wxss */
page {
  width: 100%;
  height: 100%;
}`;

  const appJson = `{
  "pages": [
    "pages/index/index",
    "pages/interview/interview"
  ]
}`;

  return (
    <div className="miniprogram-config">
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 标题 */}
          <div>
            <Title level={2}>
              <QrcodeOutlined /> 小程序视频面试配置
            </Title>
            <Paragraph type="secondary">
              将视频面试功能集成到微信小程序中，支持HR端和访客端视频面试
            </Paragraph>
          </div>

          {/* 状态提示 */}
          <Alert
            message="H5文件已部署"
            description={`小程序H5文件已成功部署到 ${baseUrl}/miniprogram/ 目录，可以直接在小程序中使用`}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />

          {/* 访问地址 */}
          <Card title={<><LinkOutlined /> H5文件访问地址</>} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>HR端（主持人）：</Text>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color="blue" style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>
                    {hostUrl}
                  </Tag>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(hostUrl, 'HR端地址')}
                    type={copiedText === 'HR端地址' ? 'primary' : 'default'}
                  >
                    {copiedText === 'HR端地址' ? '已复制' : '复制'}
                  </Button>
                </div>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div>
                <Text strong>访客端（面试者）：</Text>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color="green" style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>
                    {guestUrl}
                  </Tag>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(guestUrl, '访客端地址')}
                    type={copiedText === '访客端地址' ? 'primary' : 'default'}
                  >
                    {copiedText === '访客端地址' ? '已复制' : '复制'}
                  </Button>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  注意：将 {'{roomId}'} 替换为实际的房间ID
                </Text>
              </div>
            </Space>
          </Card>

          {/* 集成步骤 */}
          <Card title={<><CodeOutlined /> 小程序集成步骤</>} size="small">
            <Tabs defaultActiveKey="1">
              <TabPane tab="1. 页面文件" key="1">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong>interview.wxml</Text>
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                      <code>{wxml}</code>
                    </pre>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(wxml, 'WXML代码')}
                    >
                      复制代码
                    </Button>
                  </div>

                  <Divider />

                  <div>
                    <Text strong>interview.js</Text>
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '300px' }}>
                      <code>{js}</code>
                    </pre>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(js, 'JS代码')}
                    >
                      复制代码
                    </Button>
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="2. 配置文件" key="2">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong>interview.json</Text>
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                      <code>{json}</code>
                    </pre>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(json, 'JSON配置')}
                    >
                      复制代码
                    </Button>
                  </div>

                  <Divider />

                  <div>
                    <Text strong>interview.wxss</Text>
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                      <code>{wxss}</code>
                    </pre>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(wxss, 'WXSS样式')}
                    >
                      复制代码
                    </Button>
                  </div>

                  <Divider />

                  <div>
                    <Text strong>app.json（注册页面）</Text>
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                      <code>{appJson}</code>
                    </pre>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(appJson, 'App.json配置')}
                    >
                      复制代码
                    </Button>
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="3. 使用方式" key="3">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Alert
                    message="跳转到视频面试页面"
                    description={
                      <pre style={{ background: 'transparent', padding: 0, margin: '8px 0 0 0' }}>
                        <code>{`// HR端（主持人）
wx.navigateTo({
  url: '/pages/interview/interview?role=host'
});

// 访客端（面试者）
wx.navigateTo({
  url: '/pages/interview/interview?role=guest&roomId=123456'
});`}</code>
                      </pre>
                    }
                    type="info"
                  />
                </Space>
              </TabPane>

              <TabPane tab="4. 配置要求" key="4">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Alert
                    message="小程序后台配置"
                    description={
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        <li>登录微信公众平台</li>
                        <li>进入"开发" → "开发管理" → "开发设置"</li>
                        <li>在"业务域名"中添加：<Text code>crm.andejiazheng.com</Text></li>
                        <li>下载校验文件并上传到服务器根目录</li>
                      </ul>
                    }
                    type="warning"
                  />

                  <Alert
                    message="注意事项"
                    description={
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        <li>小程序WebView只支持HTTPS协议</li>
                        <li>小程序WebView不支持WebRTC，建议使用外部浏览器打开</li>
                        <li>确保后端API配置了正确的CORS策略</li>
                        <li>ZEGO域名需要在小程序后台配置白名单</li>
                      </ul>
                    }
                    type="info"
                  />
                </Space>
              </TabPane>
            </Tabs>
          </Card>

          {/* 测试链接 */}
          <Card title="快速测试" size="small">
            <Space>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => window.open(hostUrl, '_blank')}
              >
                测试HR端页面
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={() => {
                  const testRoomId = 'test-' + Date.now();
                  window.open(`${baseUrl}/miniprogram/video-interview.html?room=${testRoomId}`, '_blank');
                }}
              >
                测试访客端页面
              </Button>
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default MiniProgramConfig;

