import React, { useState } from 'react';
import { Upload, Button, message, Modal, Progress, Alert } from 'antd';
import { UploadOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { FILE_UPLOAD_CONFIG } from '../constants/upload';

interface VideoUploadProps {
  value?: {
    url: string;
    filename?: string;
    size?: number;
  };
  onChange?: (value: { url: string; filename?: string; size?: number } | undefined) => void;
  onUpload?: (file: File) => Promise<string>;
  disabled?: boolean;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  value,
  onChange,
  onUpload,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);

  const validateVideo = (file: RcFile): boolean => {
    // 检查文件类型
    const isVideo = FILE_UPLOAD_CONFIG.allowedVideoTypes.includes(file.type as any);
    if (!isVideo) {
      message.error('只支持 MP4、MOV、AVI、WebM 格式的视频！');
      return false;
    }

    // 检查文件大小 - 放宽到50MB（服务器会转码）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      message.error('视频文件大小不能超过 50MB！');
      return false;
    }

    return true;
  };

  const handleUpload = async (file: RcFile) => {
    if (!validateVideo(file)) {
      return false;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('正在上传视频...');

    try {
      // 模拟上传和转码进度
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 2;
        if (progress <= 30) {
          setUploadStatus('正在上传视频...');
        } else if (progress <= 80) {
          setUploadStatus('正在转码视频（转换为浏览器兼容格式）...');
        } else {
          setUploadStatus('即将完成...');
        }
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return Math.min(prev + 5, 90);
        });
      }, 1000);

      let videoUrl: string;
      let finalFilename = file.name;
      let finalSize = file.size;

      if (onUpload) {
        videoUrl = await onUpload(file);
      } else {
        // 如果没有提供onUpload，创建本地预览URL
        videoUrl = URL.createObjectURL(file);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('上传完成！');

      const videoInfo = {
        url: videoUrl,
        filename: finalFilename,
        size: finalSize
      };

      onChange?.(videoInfo);
      message.success('视频上传成功！已自动转码为浏览器兼容格式。');
    } catch (error: any) {
      console.error('视频上传失败:', error);
      message.error(error.message || '视频上传失败，请重试');
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
      }, 1000);
    }

    return false; // 阻止默认上传行为
  };

  const handleRemove = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个视频吗？',
      onOk: () => {
        onChange?.(undefined);
        message.success('视频已删除');
      }
    });
  };

  const handlePreview = () => {
    setPreviewVisible(true);
  };

  return (
    <div style={{ width: '100%' }}>
      {!value ? (
        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          disabled={disabled || uploading}
          accept={FILE_UPLOAD_CONFIG.allowedVideoTypes.join(',')}
        >
          <Button
            icon={<UploadOutlined />}
            loading={uploading}
            disabled={disabled}
            block
          >
            {uploading ? '上传中...' : '上传视频'}
          </Button>
        </Upload>
      ) : (
        <div style={{
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {value.filename || '自我介绍视频'}
            </div>
            {value.size && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                {(value.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={handlePreview}
            >
              预览
            </Button>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              disabled={disabled}
            >
              删除
            </Button>
          </div>
        </div>
      )}

      {uploading && (
        <div style={{ marginTop: '8px' }}>
          {uploadStatus && (
            <Alert
              message={uploadStatus}
              type="info"
              showIcon
              style={{ marginBottom: '8px' }}
            />
          )}
          <Progress
            percent={uploadProgress}
            status={uploadProgress === 100 ? 'success' : 'active'}
          />
        </div>
      )}

      <Modal
        open={previewVisible}
        title="视频预览"
        footer={null}
        width={800}
        onCancel={() => setPreviewVisible(false)}
      >
        {value?.url && (
          <video
            controls
            autoPlay={false}
            style={{ width: '100%', maxHeight: '500px' }}
            src={value.url}
          >
            您的浏览器不支持视频播放
          </video>
        )}
      </Modal>
    </div>
  );
};

export default VideoUpload;

