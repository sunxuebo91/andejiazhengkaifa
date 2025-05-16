import React, { useState, useEffect } from 'react';
import { Card, Button, Upload, message, Spin, Divider, Typography, Space, Alert } from 'antd';
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { recognizeIdCard, testOcrConnection } from '../utils/ocrUtils';

const { Title, Text, Paragraph } = Typography;

const OcrTest: React.FC = () => {
  // 状态
  const [loading, setLoading] = useState<boolean>(false);
  const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 检查OCR服务连接
  const checkOcrConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const isAvailable = await testOcrConnection();
      setOcrAvailable(isAvailable);
      
      if (!isAvailable) {
        setError('OCR服务连接失败，请确保OCR服务正在运行');
      }
    } catch (err) {
      console.error('检查OCR连接出错:', err);
      setError('检查OCR连接出错: ' + (err.message || '未知错误'));
      setOcrAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  // 获取OCR服务器信息
  const getServerInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('http://localhost:3002', { 
        timeout: 5000,
        withCredentials: false
      });
      setServerInfo(response.data);
    } catch (err) {
      console.error('获取服务器信息失败:', err);
      setError('获取服务器信息失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传前
  const beforeUpload = (file: File) => {
    setUploadedFile(file);
    setOcrResult(null);
    setError(null);
    return false; // 阻止自动上传
  };

  // 识别身份证
  const recognizeIdCardImage = async () => {
    if (!uploadedFile) {
      message.error('请先上传身份证图片');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await recognizeIdCard(uploadedFile, 'front');
      setOcrResult(result);
      
      if (!result.success) {
        setError('OCR识别失败: ' + (result.message || '未知原因'));
      }
    } catch (err) {
      console.error('OCR识别出错:', err);
      setError('OCR识别出错: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时检查OCR服务
  useEffect(() => {
    checkOcrConnection();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card title={<Title level={3}>OCR服务诊断工具</Title>}>
        {loading && <Spin tip="处理中..." style={{ marginBottom: '20px' }} />}
        
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '20px' }}
          />
        )}
        
        <Divider>OCR服务连接</Divider>
        <Space direction="vertical" style={{ width: '100%', marginBottom: '20px' }}>
          <div>
            <Text strong>OCR服务状态: </Text>
            {ocrAvailable === null ? (
              <Text type="warning">检查中...</Text>
            ) : ocrAvailable ? (
              <Text type="success"><CheckCircleOutlined /> 可用</Text>
            ) : (
              <Text type="danger"><CloseCircleOutlined /> 不可用</Text>
            )}
          </div>
          
          <Space>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={checkOcrConnection}
              loading={loading}
            >
              重新检查OCR连接
            </Button>
            
            <Button 
              onClick={getServerInfo}
              loading={loading}
            >
              获取服务器信息
            </Button>
          </Space>
          
          {serverInfo && (
            <Paragraph>
              <pre>{JSON.stringify(serverInfo, null, 2)}</pre>
            </Paragraph>
          )}
        </Space>
        
        <Divider>OCR识别测试</Divider>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload
            beforeUpload={beforeUpload}
            maxCount={1}
            showUploadList={true}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>选择身份证正面照片</Button>
          </Upload>
          
          <Button 
            type="primary" 
            onClick={recognizeIdCardImage} 
            disabled={!uploadedFile || loading}
            style={{ marginTop: '10px' }}
          >
            测试OCR识别
          </Button>
          
          {ocrResult && (
            <div style={{ marginTop: '20px' }}>
              <Title level={4}>识别结果</Title>
              <Paragraph>
                <pre>{JSON.stringify(ocrResult, null, 2)}</pre>
              </Paragraph>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default OcrTest; 