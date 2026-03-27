import React, { useState, useRef } from 'react';
import {
  Modal, Tabs, Upload, Button, Table, Space, message, Tag, Alert,
  Spin, Typography, Row, Col, Popconfirm
} from 'antd';
import type { UploadProps } from 'antd';
import {
  InboxOutlined, RobotOutlined, CheckCircleOutlined, DeleteOutlined, ReloadOutlined
} from '@ant-design/icons';
import { trainingLeadService } from '../services/trainingLeadService';

const { Dragger } = Upload;
const { Text, Title } = Typography;

interface ParsedLead {
  name?: string;
  phone?: string;
  wechatId?: string;
  leadSource?: string;
  trainingType?: string;
  intentionLevel?: string;
  address?: string;
  remarks?: string;
  followUpPerson?: string;
  followUpContent?: string;
  followUpType?: string;
  followUpTime?: string;
}

interface AIBulkImportModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const intentionColorMap: Record<string, string> = { '高': 'red', '中': 'orange', '低': 'green' };

const AIBulkImportModal: React.FC<AIBulkImportModalProps> = ({ open, onCancel, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<string>('image');
  const [aiLoading, setAiLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<ParsedLead[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; fail: number; errors: string[] } | null>(null);

  const handleClose = () => {
    setPreviewLeads([]);
    setImportResult(null);
    setAiLoading(false);
    setConfirming(false);
    onCancel();
  };

  const handleRemoveLead = (index: number) => {
    setPreviewLeads(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (file: File) => {
    setAiLoading(true);
    setPreviewLeads([]);
    setImportResult(null);
    try {
      const leads = await trainingLeadService.aiParseImage(file);
      if (!leads || leads.length === 0) {
        message.warning('AI未识别到有效的线索数据，请检查图片内容');
      } else {
        setPreviewLeads(leads);
        message.success(`AI成功识别 ${leads.length} 条线索，请确认后导入`);
      }
    } catch (err: any) {
      message.error(`AI识别失败: ${err.message || '请重试'}`);
    } finally {
      setAiLoading(false);
    }
    return false;
  };

  const handleExcelUpload = async (file: File) => {
    setAiLoading(true);
    setPreviewLeads([]);
    setImportResult(null);
    try {
      const leads = await trainingLeadService.aiParseExcel(file);
      if (!leads || leads.length === 0) {
        message.warning('AI未识别到有效的线索数据，请检查文件内容');
      } else {
        setPreviewLeads(leads);
        message.success(`AI成功识别 ${leads.length} 条线索，请确认后导入`);
      }
    } catch (err: any) {
      message.error(`AI识别失败: ${err.message || '请重试'}`);
    } finally {
      setAiLoading(false);
    }
    return false;
  };

  const handleConfirmImport = async () => {
    if (previewLeads.length === 0) return;
    setConfirming(true);
    try {
      const result = await trainingLeadService.bulkCreateLeads(previewLeads);
      setImportResult(result);
      if (result.fail === 0) {
        // 全部成功才自动关闭
        message.success(`成功导入 ${result.success} 条线索`);
        onSuccess();
      } else {
        // 有失败时留在弹窗，显示详情
        if (result.success > 0) {
          message.warning(`成功 ${result.success} 条，失败 ${result.fail} 条，请查看失败详情`);
          onSuccess(); // 刷新列表，但不关闭弹窗
        } else {
          message.error(`全部 ${result.fail} 条导入失败，请查看失败详情`);
        }
      }
    } catch (err: any) {
      message.error(`批量导入失败: ${err.message || '请重试'}`);
    } finally {
      setConfirming(false);
    }
  };

  const previewColumns = [
    { title: '姓名', dataIndex: 'name', width: 80, render: (v: string) => v || <Text type="danger">未识别</Text> },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60, render: (v: number) => v ? `${v}岁` : '' },
    { title: '电话号码', dataIndex: 'phone', width: 120 },
    { title: '微信', dataIndex: 'wechatId', width: 100 },
    { title: '渠道来源', dataIndex: 'leadSource', width: 80 },
    { title: '性质', dataIndex: 'trainingType', width: 80 },
    { title: '咨询职位', dataIndex: 'consultPosition', width: 90 },
    {
      title: '类别', dataIndex: 'intentionLevel', width: 60,
      render: (v: string) => v ? <Tag color={intentionColorMap[v] || 'default'}>{v}</Tag> : null
    },
    { title: '跟进人', dataIndex: 'followUpPerson', width: 80 },
    { title: '跟进内容', dataIndex: 'followUpContent', width: 150, ellipsis: true },
    { title: '跟进方式', dataIndex: 'followUpType', width: 80 },
    { title: '跟进时间', dataIndex: 'followUpTime', width: 100 },
    { title: '备注', dataIndex: 'remarks', ellipsis: true },
    {
      title: '操作', width: 60, render: (_: any, __: any, index: number) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveLead(index)} />
      )
    },
  ];

  const uploadProps: UploadProps = { multiple: false, showUploadList: false };

  const tabItems = [
    {
      key: 'image',
      label: <span><RobotOutlined /> 图片识别</span>,
      children: (
        <div>
          <Alert
            message="上传职培线索表格截图，AI将自动识别表格中的所有人员信息"
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          <Dragger {...uploadProps} accept="image/*" beforeUpload={handleImageUpload} disabled={aiLoading}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">点击或拖拽图片到此区域</p>
            <p className="ant-upload-hint">支持 JPG、PNG、截图粘贴等格式，最大 20MB</p>
          </Dragger>
        </div>
      ),
    },
    {
      key: 'excel',
      label: <span><RobotOutlined /> Excel导入（AI识别字段）</span>,
      children: (
        <div>
          <Alert
            message="上传Excel文件，AI将自动识别各列含义并映射到标准字段，无需规范列名"
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          <Dragger {...uploadProps} accept=".xlsx,.xls" beforeUpload={handleExcelUpload} disabled={aiLoading}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域</p>
            <p className="ant-upload-hint">支持 .xlsx、.xls 格式，列名不限，最大 10MB</p>
          </Dragger>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={<Space><RobotOutlined style={{ color: '#1677ff' }} /><span>AI智能批量导入职培线索</span></Space>}
      open={open}
      onCancel={handleClose}
      width={900}
      footer={
        previewLeads.length > 0 && !importResult ? [
          <Button key="reset" icon={<ReloadOutlined />} onClick={() => setPreviewLeads([])}>重新上传</Button>,
          <Popconfirm
            key="confirm"
            title={`确认导入 ${previewLeads.length} 条线索？`}
            onConfirm={handleConfirmImport}
            okText="确认导入"
            cancelText="取消"
          >
            <Button type="primary" icon={<CheckCircleOutlined />} loading={confirming}>
              确认导入 ({previewLeads.length} 条)
            </Button>
          </Popconfirm>
        ] : [
          <Button key="close" onClick={handleClose}>关闭</Button>
        ]
      }
      destroyOnClose
    >
      <Spin spinning={aiLoading} tip="AI正在识别中，请稍候...">
        {importResult ? (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Alert message={`成功导入: ${importResult.success} 条`} type="success" showIcon />
              </Col>
              <Col span={12}>
                <Alert message={`导入失败: ${importResult.fail} 条`} type={importResult.fail > 0 ? 'warning' : 'success'} showIcon />
              </Col>
            </Row>
            {importResult.errors.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', background: '#fff2f0', padding: 12, borderRadius: 4 }}>
                <Text type="danger" strong>失败详情：</Text>
                {importResult.errors.map((err, i) => <div key={i}><Text type="danger">• {err}</Text></div>)}
              </div>
            )}
            <Button style={{ marginTop: 16 }} onClick={() => { setImportResult(null); setPreviewLeads([]); }}>
              继续导入
            </Button>
          </div>
        ) : previewLeads.length > 0 ? (
          <div>
            <Alert
              message={`AI已识别 ${previewLeads.length} 条线索，请核对后点击"确认导入"`}
              type="success" showIcon style={{ marginBottom: 12 }}
            />
            <Table
              dataSource={previewLeads}
              columns={previewColumns}
              rowKey={(_, index) => String(index)}
              size="small"
              scroll={{ x: 800 }}
              pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }}
            />
          </div>
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        )}
      </Spin>
    </Modal>
  );
};

export default AIBulkImportModal;

