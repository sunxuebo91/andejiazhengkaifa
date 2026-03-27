import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal, Upload, Button, Space, message, Spin, Tag, Select, Image, Row, Col, Alert, Progress,
} from 'antd';
import { InboxOutlined, RobotOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { apiService } from '../services/api';

const { Dragger } = Upload;
const { Option } = Select;

export type PhotoCategory = 'photo' | 'certificate' | 'medical' | 'confinementMeal' | 'cooking' | 'complementaryFood' | 'positiveReview';

export const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  photo: '个人照片',
  certificate: '技能证书',
  medical: '体检报告',
  confinementMeal: '月子餐照片',
  cooking: '烹饪照片',
  complementaryFood: '辅食照片',
  positiveReview: '好评截图',
};

const CATEGORY_COLORS: Record<PhotoCategory, string> = {
  photo: 'blue',
  certificate: 'purple',
  medical: 'cyan',
  confinementMeal: 'orange',
  cooking: 'green',
  complementaryFood: 'lime',
  positiveReview: 'gold',
};

export interface ClassifiedFile {
  file: File;
  previewUrl: string;
  category: PhotoCategory;
  reason: string;
}

interface AIPhotoClassifyModalProps {
  open: boolean;
  onCancel: () => void;
  jobType?: string;
  onConfirm: (results: ClassifiedFile[]) => void;
}

const AIPhotoClassifyModal: React.FC<AIPhotoClassifyModalProps> = ({
  open,
  onCancel,
  jobType,
  onConfirm,
}) => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [classifiedFiles, setClassifiedFiles] = useState<ClassifiedFile[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClose = () => {
    // 释放预览 URL
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    classifiedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setPendingFiles([]);
    setPreviewUrls([]);
    setClassifiedFiles([]);
    setAiLoading(false);
    setProgress(0);
    onCancel();
  };

  const handleFilesSelected = useCallback((files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      message.warning('请选择图片文件（JPG、PNG 等）');
      return;
    }
    const urls = validFiles.map(f => URL.createObjectURL(f));
    // 释放旧的预览URL
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPendingFiles(validFiles);
    setPreviewUrls(urls);
    setClassifiedFiles([]);
  }, [previewUrls]);

  // 处理粘贴事件（供粘贴区 onPaste 和 window 监听共用）
  const handlePasteEvent = useCallback((e: ClipboardEvent | React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFilesSelected(imageFiles);
      message.success(`已粘贴 ${imageFiles.length} 张图片`);
    }
  }, [handleFilesSelected]);

  // 兜底：弹窗打开时也监听 window paste（应对焦点不在粘贴区的情况）
  useEffect(() => {
    if (!open || classifiedFiles.length > 0) return;
    const listener = (e: ClipboardEvent) => handlePasteEvent(e);
    window.addEventListener('paste', listener);
    return () => window.removeEventListener('paste', listener);
  }, [open, classifiedFiles.length, handlePasteEvent]);

  const handleClassify = async () => {
    if (pendingFiles.length === 0) return;
    setAiLoading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      pendingFiles.forEach(f => formData.append('files', f));
      if (jobType) formData.append('jobType', jobType);

      const res = await apiService.upload('/api/ai/classify-resume-photos', formData, 'POST');
      if (!res.success || !res.data) {
        message.error('AI分类失败，请重试');
        return;
      }

      const results: Array<{ index: number; category: string; reason: string }> = res.data;
      const classified: ClassifiedFile[] = pendingFiles.map((file, i) => {
        const result = results.find(r => r.index === i);
        return {
          file,
          previewUrl: previewUrls[i],
          category: (result?.category || 'photo') as PhotoCategory,
          reason: result?.reason || '',
        };
      });
      setClassifiedFiles(classified);
      setProgress(100);
      message.success(`AI已对 ${classified.length} 张图片完成分类`);
    } catch (err: any) {
      message.error(`AI分类失败: ${err.message || '请重试'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCategoryChange = (index: number, newCategory: PhotoCategory) => {
    setClassifiedFiles(prev =>
      prev.map((f, i) => i === index ? { ...f, category: newCategory } : f)
    );
  };

  const handleRemove = (index: number) => {
    setClassifiedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (classifiedFiles.length === 0) return;
    onConfirm(classifiedFiles);
    handleClose();
  };

  const isClassified = classifiedFiles.length > 0;

  const footerButtons = isClassified
    ? [
        <Button key="reclassify" onClick={() => setClassifiedFiles([])} disabled={aiLoading}>重新选图</Button>,
        <Button key="rerun" onClick={handleClassify} loading={aiLoading} icon={<RobotOutlined />}>重新识别</Button>,
        <Button
          key="confirm"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleConfirm}
          disabled={classifiedFiles.length === 0}
        >
          确认添加（{classifiedFiles.length} 张）
        </Button>,
      ]
    : [
        <Button key="cancel" onClick={handleClose}>取消</Button>,
        <Button
          key="classify"
          type="primary"
          icon={<RobotOutlined />}
          onClick={handleClassify}
          loading={aiLoading}
          disabled={pendingFiles.length === 0}
        >
          AI识别分类
        </Button>,
      ];

  return (
    <Modal
      title={<Space><RobotOutlined style={{ color: '#1677ff' }} /><span>AI智能图片分类</span></Space>}
      open={open}
      onCancel={handleClose}
      width={900}
      footer={footerButtons}
      destroyOnClose
    >
      <Spin spinning={aiLoading} tip="AI正在识别图片内容，请稍候...">
        {!isClassified ? (
          <div>
            <Alert
              message="上传阿姨的照片，AI将自动识别每张图片是个人照片、证书、烹饪照片、月子餐还是好评截图等，放入对应分类"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Dragger
              multiple
              accept="image/*"
              showUploadList={false}
              beforeUpload={() => false}
              onChange={info => {
                const files = info.fileList
                  .map((f: UploadFile) => f.originFileObj as File | undefined)
                  .filter((f): f is File => f instanceof File);
                if (files.length > 0) handleFilesSelected(files);
              }}
              disabled={aiLoading}
              style={{ marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽图片到此区域（可多选）</p>
              <p className="ant-upload-hint">支持 JPG、PNG 等格式，最多 20 张</p>
            </Dragger>

            {/* 粘贴区：点击后获得焦点，可直接 Ctrl+V 或右键粘贴 */}
            <div
              tabIndex={0}
              onPaste={e => handlePasteEvent(e)}
              onClick={e => (e.currentTarget as HTMLDivElement).focus()}
              style={{
                marginTop: 8,
                padding: '10px 16px',
                border: '1px dashed #1677ff',
                borderRadius: 6,
                textAlign: 'center',
                cursor: 'pointer',
                color: '#1677ff',
                fontSize: 13,
                outline: 'none',
                userSelect: 'none',
                background: '#f0f7ff',
              }}
            >
              📋 点击此处，然后按 <strong>Ctrl+V</strong> 粘贴图片（或右键→粘贴图片）
            </div>

            {pendingFiles.length > 0 && (
              <div>
                <div style={{ marginBottom: 8, color: '#666' }}>已选择 {pendingFiles.length} 张图片，点击"AI识别分类"开始处理</div>
                <Row gutter={[8, 8]}>
                  {previewUrls.map((url, i) => (
                    <Col key={i} span={4}>
                      <Image
                        src={url}
                        style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }}
                        preview={false}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            {aiLoading && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={progress} status="active" />
              </div>
            )}
          </div>
        ) : (
          <div>
            <Alert
              message={`AI已完成分类，请检查每张图片的分类是否正确，可通过下拉菜单修改`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={[12, 12]}>
              {classifiedFiles.map((item, index) => (
                <Col key={index} span={6}>
                  <div
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <Image
                        src={item.previewUrl}
                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                        preview={{ mask: '预览' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          cursor: 'pointer',
                          backgroundColor: 'rgba(255,0,0,0.7)',
                          borderRadius: 4,
                          padding: '2px 4px',
                          color: 'white',
                          fontSize: 12,
                          lineHeight: '16px',
                        }}
                        onClick={() => handleRemove(index)}
                        title="移除此图片"
                      >
                        <DeleteOutlined />
                      </div>
                    </div>
                    <div style={{ padding: '8px 8px 4px' }}>
                      <Tag color={CATEGORY_COLORS[item.category]} style={{ marginBottom: 6, fontSize: 11 }}>
                        {CATEGORY_LABELS[item.category]}
                      </Tag>
                      {item.reason && (
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 6, lineHeight: 1.3 }}>
                          {item.reason}
                        </div>
                      )}
                      <Select
                        size="small"
                        value={item.category}
                        onChange={(val) => handleCategoryChange(index, val as PhotoCategory)}
                        style={{ width: '100%' }}
                      >
                        {(Object.keys(CATEGORY_LABELS) as PhotoCategory[]).map(cat => (
                          <Option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</Option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default AIPhotoClassifyModal;
