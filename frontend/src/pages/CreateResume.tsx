import React from 'react';
import { App } from 'antd';

// 自定义 Hook
const useFileUpload = () => {
  const { message: messageApi } = App.useApp();

  const handleFileChange = (info: any) => {
    if (info.file.status === 'done') {
      messageApi.success(`${info.file.name} 上传成功`);
    } else if (info.file.status === 'error') {
      messageApi.error(`${info.file.name} 上传失败`);
    }
  };

  return { handleFileChange };
};

// 组件
const CreateResume: React.FC = () => {
  const { handleFileChange } = useFileUpload();

  return (
    <div>
      <h1>创建简历</h1>
      <p>简历创建页面 - 开发中</p>
      <input type="file" onChange={handleFileChange} />
    </div>
  );
};

export default CreateResume; 