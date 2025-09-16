import React, { useState } from 'react';
import { Card, Button, message } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import SortableImageUpload from '../components/SortableImageUpload';
import type { UploadFile } from 'antd';
import type { UploadFileStatus } from 'antd/es/upload/interface';

// 定义文件类型
interface BaseFileProps extends UploadFile {
  isExisting?: boolean;
  size?: number;
  type?: string;
}

type NewFile = BaseFileProps & {
  status: UploadFileStatus;
  isExisting: false;
};

type ExistingFile = BaseFileProps & {
  status: 'done';
  isExisting: true;
};

type CustomUploadFile = NewFile | ExistingFile;

const TestSortableUpload: React.FC = () => {
  const [fileList, setFileList] = useState<CustomUploadFile[]>([
    {
      uid: '1',
      name: '示例图片1.jpg',
      status: 'done',
      url: 'https://via.placeholder.com/300x200/ff6b6b/ffffff?text=Image+1',
      isExisting: true,
    },
    {
      uid: '2',
      name: '示例图片2.jpg',
      status: 'done',
      url: 'https://via.placeholder.com/300x200/4ecdc4/ffffff?text=Image+2',
      isExisting: true,
    },
    {
      uid: '3',
      name: '示例图片3.jpg',
      status: 'done',
      url: 'https://via.placeholder.com/300x200/45b7d1/ffffff?text=Image+3',
      isExisting: true,
    },
  ]);

  const handleFileListChange = (newFileList: CustomUploadFile[]) => {
    setFileList(newFileList);
    console.log('文件列表已更新:', newFileList.map(f => ({ uid: f.uid, name: f.name })));
  };

  const handlePreview = (file: UploadFile) => {
    console.log('预览文件:', file);
    message.info(`预览: ${file.name}`);
  };

  const handleRemove = (file: UploadFile) => {
    console.log('删除文件:', file);
    message.success(`已删除: ${file.name}`);
    return Promise.resolve(true);
  };

  const beforeUpload = (file: File) => {
    console.log('准备上传文件:', file);
    
    // 模拟文件验证
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

    // 模拟上传成功
    setTimeout(() => {
      const newFile: CustomUploadFile = {
        uid: Date.now().toString(),
        name: file.name,
        status: 'done',
        url: URL.createObjectURL(file),
        isExisting: false,
        size: file.size,
      };
      
      setFileList(prev => [...prev, newFile]);
      message.success(`${file.name} 上传成功！`);
    }, 1000);

    return false; // 阻止默认上传
  };

  const resetFileList = () => {
    setFileList([
      {
        uid: '1',
        name: '示例图片1.jpg',
        status: 'done',
        url: 'https://via.placeholder.com/300x200/ff6b6b/ffffff?text=Image+1',
        isExisting: true,
      },
      {
        uid: '2',
        name: '示例图片2.jpg',
        status: 'done',
        url: 'https://via.placeholder.com/300x200/4ecdc4/ffffff?text=Image+2',
        isExisting: true,
      },
      {
        uid: '3',
        name: '示例图片3.jpg',
        status: 'done',
        url: 'https://via.placeholder.com/300x200/45b7d1/ffffff?text=Image+3',
        isExisting: true,
      },
    ]);
    message.info('已重置为默认图片');
  };

  return (
    <PageContainer
      header={{
        title: '拖拽排序图片上传测试',
        subTitle: '测试图片拖拽排序功能',
      }}
    >
      <Card>
        <div style={{ marginBottom: 16 }}>
          <h3>功能说明：</h3>
          <ul>
            <li>✅ 支持拖拽图片左上角的拖拽图标来调整顺序</li>
            <li>✅ 点击右上角的删除按钮删除图片</li>
            <li>✅ 点击图片可以预览</li>
            <li>✅ 支持上传新图片</li>
            <li>✅ 最多支持5张图片</li>
          </ul>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button onClick={resetFileList} type="default">
            重置为默认图片
          </Button>
        </div>

        <div style={{ border: '1px solid #f0f0f0', padding: 16, borderRadius: 8 }}>
          <h4>拖拽排序图片上传组件：</h4>
          <SortableImageUpload
            fileList={fileList}
            onChange={handleFileListChange}
            onPreview={handlePreview}
            onRemove={handleRemove}
            maxCount={5}
            beforeUpload={beforeUpload}
            disabled={false}
            layout="horizontal"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <h4>当前文件列表顺序：</h4>
          <ol>
            {fileList.map((file, index) => (
              <li key={file.uid}>
                {index + 1}. {file.name} (UID: {file.uid})
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </PageContainer>
  );
};

export default TestSortableUpload;
