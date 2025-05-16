import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Upload, Image, message, Spin, 
  Divider, Typography, Row, Col, Descriptions
} from 'antd';
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { testOcrConnection, recognizeIdCard, IdCardSide } from '../../utils/ocrUtils';

const { Title, Text, Paragraph } = Typography;

/**
 * OCR服务测试页面
 */
const OcrTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [connectionChecking, setConnectionChecking] = useState(false);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [idCardImageUrl, setIdCardImageUrl] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedSide, setSelectedSide] = useState<IdCardSide>('front');

  // 初始化时检查OCR服务连接
  useEffect(() => {
    checkOcrConnection();
  }, []);

  // 检查OCR服务连接
  const checkOcrConnection = async () => {
    setConnectionChecking(true);
    try {
      const result = await testOcrConnection();
      setConnectionStatus(result);
      console.log('OCR服务连接状态:', result ? '可用' : '不可用');
    } catch (error) {
      console.error('检查OCR连接时出错:', error);
      setConnectionStatus(false);
    } finally {
      setConnectionChecking(false);
    }
  };

  // 获取服务器信息
  const getServerInfo = async () => {
    try {
      const response = await fetch('http://localhost:3002', {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const info = await response.json();
        setServerInfo(info);
        message.success('服务器信息获取成功');
      } else {
        message.error(`服务器响应错误: ${response.status}`);
      }
    } catch (error) {
      console.error('获取服务器信息失败:', error);
      message.error('获取服务器信息失败: ' + (error.message || '未知错误'));
    }
  };

  // 上传前验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return Upload.LIST_IGNORE;
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片必须小于10MB!');
      return Upload.LIST_IGNORE;
    }
    
    // 设置预览URL
    setIdCardImageUrl(URL.createObjectURL(file));
    setFileList([{
      uid: '-1',
      name: file.name,
      status: 'done',
      url: URL.createObjectURL(file),
      originFileObj: file,
    }]);
    
    // 阻止自动上传
    return false;
  };

  // 识别身份证图片
  const recognizeIdCardImage = async () => {
    if (fileList.length === 0 || !fileList[0].originFileObj) {
      message.error('请先选择身份证图片');
      return;
    }
    
    setRecognizing(true);
    setOcrResult(null);
    
    try {
      const file = fileList[0].originFileObj;
      const result = await recognizeIdCard(file, selectedSide);
      
      if (result.success && result.data) {
        setOcrResult(result.data);
        message.success('身份证识别成功');
      } else {
        message.error(`识别失败: ${result.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('识别过程出错:', error);
      message.error('识别过程出错: ' + (error.message || '未知错误'));
    } finally {
      setRecognizing(false);
    }
  };

  // 转换OCR结果为可显示格式
  const formatOcrResult = (result: any) => {
    if (!result || !result.words_result) {
      return '无有效识别结果';
    }
    
    const items = [];
    const wordsResult = result.words_result;
    
    for (const key in wordsResult) {
      items.push({
        label: key,
        value: wordsResult[key].words || '无数据'
      });
    }
    
    return (
      <Descriptions title="识别结果" bordered column={1}>
        {items.map((item, index) => (
          <Descriptions.Item key={index} label={item.label}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>百度OCR测试工具</Title>
      
      <Row gutter={16}>
        <Col span={12}>
          <Card title="OCR服务连接测试" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              当前状态: {
                connectionChecking ? <Spin size="small" /> : 
                connectionStatus === null ? '未检测' : 
                connectionStatus ? <Text type="success"><CheckCircleOutlined /> 连接正常</Text> : 
                <Text type="danger"><CloseCircleOutlined /> 连接失败</Text>
              }
            </div>
            
            <Button type="primary" onClick={checkOcrConnection} loading={connectionChecking}>
              检查OCR服务连接
            </Button>
            
            <Button 
              style={{ marginLeft: 8 }} 
              onClick={getServerInfo}
              disabled={!connectionStatus}
            >
              获取服务器信息
            </Button>
            
            {serverInfo && (
              <div style={{ marginTop: 16 }}>
                <Paragraph>
                  <pre>{JSON.stringify(serverInfo, null, 2)}</pre>
                </Paragraph>
              </div>
            )}
          </Card>
          
          <Card title="身份证OCR识别" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Button
                type={selectedSide === 'front' ? 'primary' : 'default'}
                onClick={() => setSelectedSide('front')}
                style={{ marginRight: 8 }}
              >
                身份证正面
              </Button>
              <Button
                type={selectedSide === 'back' ? 'primary' : 'default'}
                onClick={() => setSelectedSide('back')}
              >
                身份证背面
              </Button>
            </div>
            
            <Upload
              fileList={fileList}
              beforeUpload={beforeUpload}
              onRemove={() => {
                setFileList([]);
                setIdCardImageUrl(null);
                setOcrResult(null);
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} disabled={connectionStatus === false}>
                选择身份证图片
              </Button>
            </Upload>
            
            <div style={{ marginTop: 16 }}>
              <Button 
                type="primary" 
                onClick={recognizeIdCardImage} 
                loading={recognizing}
                disabled={!idCardImageUrl || connectionStatus === false}
              >
                开始识别
              </Button>
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="图片预览" style={{ marginBottom: 16 }}>
            {idCardImageUrl ? (
              <Image
                src={idCardImageUrl}
                style={{ maxWidth: '100%', maxHeight: 300 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 16 }}>
                暂无图片
              </div>
            )}
          </Card>
          
          <Card title="识别结果" style={{ minHeight: 200 }}>
            {recognizing ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 8 }}>正在识别中...</div>
              </div>
            ) : ocrResult ? (
              formatOcrResult(ocrResult)
            ) : (
              <div style={{ textAlign: 'center', padding: 16 }}>
                暂无识别结果
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Paragraph type="secondary">
        本工具用于测试百度OCR服务的连接和识别功能。确保后端OCR服务已正确启动。
      </Paragraph>
    </div>
  );
};

export default OcrTest; 