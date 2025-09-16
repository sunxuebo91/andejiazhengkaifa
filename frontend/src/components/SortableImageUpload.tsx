import React, { useState } from 'react';
import { Upload, Image, message } from 'antd';
import { PlusOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import type { UploadFileStatus } from 'antd/es/upload/interface';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 定义文件类型，与CreateResume.tsx保持一致
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

interface SortableImageUploadProps {
  fileList: CustomUploadFile[];
  onChange: (fileList: CustomUploadFile[]) => void;
  onPreview?: (file: UploadFile) => void;
  onRemove?: (file: UploadFile) => void;
  maxCount?: number;
  beforeUpload?: UploadProps['beforeUpload'];
  customRequest?: UploadProps['customRequest'];
  disabled?: boolean;
  layout?: 'horizontal' | 'vertical';
}

// 可拖拽的图片项组件
interface SortableImageItemProps {
  file: CustomUploadFile;
  onPreview?: (file: UploadFile) => void;
  onRemove?: (file: UploadFile) => void;
  disabled?: boolean;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({
  file,
  onPreview,
  onRemove,
  disabled = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(file);
    }
  };

  // 计算展示用的缩略图地址（顺序：远程URL -> antd生成thumbUrl -> 本地临时URL）
  const localObjectUrl = React.useMemo(() => {
    if (!file.url && !file.thumbUrl && file.originFileObj) {
      try {
        return URL.createObjectURL(file.originFileObj as File);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [file.url, file.thumbUrl, file.originFileObj]);

  React.useEffect(() => {
    return () => {
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    };
  }, [localObjectUrl]);

  const displayUrl = file.url || file.thumbUrl || localObjectUrl;

  // 调试日志
  console.log('🖼️ SortableImageItem file:', file);
  console.log('🖼️ Image URL:', displayUrl);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(file);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-image-item"
      {...attributes}
    >
      <div
        style={{
          position: 'relative',
          width: 104,
          height: 104,
          border: '1px solid #d9d9d9',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 4,
        }}
      >
        {/* 拖拽手柄 */}
        {!disabled && (
          <div
            {...listeners}
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              zIndex: 2,
              cursor: 'grab',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 4,
              padding: 2,
              color: 'white',
              fontSize: 12,
            }}
            title="拖拽排序"
          >
            <DragOutlined />
          </div>
        )}

        {/* 删除按钮 */}
        {!disabled && (
          <div
            onClick={handleRemove}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              zIndex: 2,
              cursor: 'pointer',
              backgroundColor: 'rgba(255, 0, 0, 0.7)',
              borderRadius: 4,
              padding: 2,
              color: 'white',
              fontSize: 12,
            }}
            title="删除图片"
          >
            <DeleteOutlined />
          </div>
        )}

        {/* 图片预览 */}
        <Image
          src={displayUrl}
          alt={file.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            cursor: 'pointer',
          }}
          preview={false}
          onClick={handlePreview}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
        />

        {/* 上传状态指示器 */}
        {file.status === 'uploading' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
            }}
          >
            上传中...
          </div>
        )}

        {file.status === 'error' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'red',
            }}
          >
            上传失败
          </div>
        )}
      </div>
    </div>
  );
};

const SortableImageUpload: React.FC<SortableImageUploadProps> = ({
  fileList,
  onChange,
  onPreview,
  onRemove,
  maxCount = 5,
  beforeUpload,
  customRequest,
  disabled = false,
  layout = 'horizontal',
}) => {
  // 调试日志
  console.log('🖼️ SortableImageUpload fileList:', fileList);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = fileList.findIndex((item) => item.uid === active.id);
      const newIndex = fileList.findIndex((item) => item.uid === over?.id);

      const newFileList = arrayMove(fileList, oldIndex, newIndex);
      onChange(newFileList);
      message.success('图片顺序已调整');
    }
  };

  // 处理预览
  const handlePreview = (file: UploadFile) => {
    if (onPreview) {
      onPreview(file);
    } else {
      setPreviewImage(file.url || file.thumbUrl || '');
      setPreviewTitle(file.name || '图片预览');
      setPreviewVisible(true);
    }
  };

  // 处理删除
  const handleRemove = (file: UploadFile) => {
    if (onRemove) {
      onRemove(file);
    } else {
      const newFileList = fileList.filter(item => item.uid !== file.uid);
      onChange(newFileList);
    }
  };

  const uploadButton = (
    <div
      style={{
        width: 104,
        height: 104,
        border: '1px dashed #d9d9d9',
        borderRadius: 8,
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        margin: 4,
      }}
    >
      <PlusOutlined style={{ fontSize: 16, color: disabled ? '#ccc' : '#999' }} />
      <div style={{ marginTop: 8, fontSize: 12, color: disabled ? '#ccc' : '#999' }}>
        上传
      </div>
    </div>
  );

  const canUpload = fileList.length < maxCount;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fileList.map(file => file.uid)}
            strategy={layout === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy}
          >
            {fileList.map((file) => (
              <SortableImageItem
                key={file.uid}
                file={file}
                onPreview={handlePreview}
                onRemove={handleRemove}
                disabled={disabled}
              />
            ))}
          </SortableContext>
        </DndContext>

        {canUpload && !disabled && (
          <Upload
            listType="picture-card"
            showUploadList={false}
            beforeUpload={beforeUpload}
            customRequest={customRequest}
            disabled={disabled}
          >
            {uploadButton}
          </Upload>
        )}
      </div>

      {fileList.length > 1 && !disabled && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          💡 提示：可以拖拽图片左上角的 <DragOutlined /> 图标来调整图片顺序
        </div>
      )}

      {/* 预览模态框 */}
      <Image
        style={{ display: 'none' }}
        src={previewImage}
        preview={{
          visible: previewVisible,
          onVisibleChange: (visible) => setPreviewVisible(visible),
          title: previewTitle,
        }}
      />
    </div>
  );
};

export default SortableImageUpload;
