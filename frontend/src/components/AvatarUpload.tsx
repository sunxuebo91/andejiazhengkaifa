import React, { useState } from 'react';
import { Upload, Avatar, message, Spin } from 'antd';
import { UserOutlined, CameraOutlined } from '@ant-design/icons';
import { uploadAvatar } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { ImageService } from '../services/imageService';

interface AvatarUploadProps {
  size?: number;
  showUploadIcon?: boolean;
  className?: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  size = 80, 
  showUploadIcon = true,
  className = '' 
}) => {
  const { user, updateUser, refreshUserInfo } = useAuth();
  const [loading, setLoading] = useState(false);

  // 处理文件上传前的验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB！');
      return false;
    }

    return true;
  };

  // 处理文件上传
  const handleUpload = async (file: File) => {
    try {
      setLoading(true);
      
      // 压缩图片
      const compressedFile = await ImageService.compressImage(file, 'photo');
      
      // 上传头像
      const avatarUrl = await uploadAvatar(compressedFile);
      
      // 更新用户信息
      updateUser({ avatar: avatarUrl });
      
      // 刷新用户信息以确保数据同步
      await refreshUserInfo();
      
      message.success('头像上传成功！');
    } catch (error: any) {
      console.error('头像上传失败:', error);
      message.error(error.message || '头像上传失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    name: 'avatar',
    showUploadList: false,
    beforeUpload: (file: File) => {
      if (beforeUpload(file)) {
        handleUpload(file);
      }
      return false; // 阻止默认上传行为
    },
  };

  return (
    <div className={`avatar-upload ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <Upload {...uploadProps}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Spin spinning={loading}>
            <Avatar
              size={size}
              src={user?.avatar}
              icon={<UserOutlined />}
              style={{ 
                backgroundColor: user?.avatar ? 'transparent' : '#1890ff',
                border: '2px solid #f0f0f0'
              }}
            />
          </Spin>
          
          {showUploadIcon && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: size * 0.3,
                height: size * 0.3,
                backgroundColor: '#1890ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                cursor: 'pointer',
              }}
            >
              <CameraOutlined 
                style={{ 
                  color: 'white', 
                  fontSize: size * 0.15 
                }} 
              />
            </div>
          )}
        </div>
      </Upload>
    </div>
  );
};

export default AvatarUpload;
