import React, { useEffect } from 'react';
import { message } from 'antd';

const handleFileChange = (info: any) => {
  useEffect(() => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 上传成功`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`);
    }
  }, [info.file.status]);
};

export default handleFileChange; 