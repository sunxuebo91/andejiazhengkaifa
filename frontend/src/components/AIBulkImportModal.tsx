import React, { useState } from 'react';
import {
  Modal, Tabs, Upload, Button, Table, Space, message, Tag, Alert,
  Spin, Typography, Row, Col, Popconfirm, Tooltip
} from 'antd';
import type { UploadProps } from 'antd';
import {
  InboxOutlined, RobotOutlined, CheckCircleOutlined, DeleteOutlined,
  ReloadOutlined, DownloadOutlined, FileExcelOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { trainingLeadService } from '../services/trainingLeadService';

const { Dragger } = Upload;
const { Text } = Typography;

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
  _duplicate?: boolean;
}

/** 列名 → 系统字段 模糊匹配 */
const COLUMN_ALIAS_MAP: Record<string, string[]> = {
  name:            ['姓名', '名字', '学员姓名', '客户姓名', 'name'],
  gender:          ['性别', 'gender', 'sex'],
  age:             ['年龄', 'age'],
  phone:           ['手机号', '手机', '电话', '电话号码', '联系电话', '联系方式', 'phone', 'tel', 'mobile'],
  wechatId:        ['微信号', '微信', 'wechat', 'wx'],
  leadSource:      ['渠道来源', '线索来源', '来源', '渠道', 'source'],
  trainingType:    ['培训类型', '培训意向', '性质', '类型', 'type'],
  consultPosition: ['咨询职位', '咨询需求', '职位', 'position'],
  intendedCourses: ['意向课程', '课程', 'courses'],
  intentionLevel:  ['意向程度', '意向', '类别', 'intention'],
  leadGrade:       ['线索等级', '等级', 'grade'],
  address:         ['所在地区', '地区', '地址', '城市', 'address', 'city'],
  budget:          ['预算金额', '预算', 'budget'],
  remarks:         ['备注', '备注信息', '追踪', '渠道追踪', '追踪记录', 'remark', 'remarks', 'note'],
  // 录入人 → 创建人（记录谁录入的）
  creatorName:     ['录入人', '创建人', '发起人'],
  // 跟进人 → 分配给谁跟进
  assignedToName:  ['跟进人', '负责人', '跟进负责人', '归属人'],
  followUpContent: ['跟进内容', '跟进记录', '沟通内容', '沟通记录'],
  followUpType:    ['跟进方式', '沟通方式'],
  followUpTime:    ['跟进时间', '沟通时间', '日期'],
};

function matchField(header: string): string | null {
  const h = header.trim().replace(/\*$/, '').trim().toLowerCase();
  for (const [field, aliases] of Object.entries(COLUMN_ALIAS_MAP)) {
    if (aliases.some(a => a.toLowerCase() === h)) return field;
  }
  for (const [field, aliases] of Object.entries(COLUMN_ALIAS_MAP)) {
    if (aliases.some(a => h.includes(a.toLowerCase()) || a.toLowerCase().includes(h))) return field;
  }
  return null;
}

interface AIBulkImportModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const intentionColorMap: Record<string, string> = { '高': 'red', '中': 'orange', '低': 'green' };

const AIBulkImportModal: React.FC<AIBulkImportModalProps> = ({ open, onCancel, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<string>('excel');
  const [aiLoading, setAiLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<ParsedLead[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; fail: number; errors: string[] } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<Array<{ column: string; field: string }>>([]);

  const handleClose = () => {
    setPreviewLeads([]);
    setImportResult(null);
    setDuplicateCount(0);
    setFieldMapping([]);
    setAiLoading(false);
    setConfirming(false);
    onCancel();
  };

  const handleRemoveLead = (index: number) => {
    const removed = previewLeads[index];
    setPreviewLeads(prev => prev.filter((_, i) => i !== index));
    if (removed?._duplicate) setDuplicateCount(prev => Math.max(0, prev - 1));
  };

  // ====== 图片AI识别（保留） ======
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

  // ====== 前端解析Excel + 后端查重 ======
  const handleSmartExcelUpload = async (file: File) => {
    setAiLoading(true);
    setPreviewLeads([]);
    setImportResult(null);
    setDuplicateCount(0);
    setFieldMapping([]);
    try {
      // 1. 前端解析Excel
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { message.warning('Excel文件中没有工作表'); return false; }

      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
      if (rows.length < 2) { message.warning('文件没有数据行'); return false; }

      // 2. 自动检测表头行（扫描前10行，找到匹配最多的那一行作为表头）
      let headerRowIndex = 0;
      let bestMapping: Array<{ colIndex: number; column: string; field: string }> = [];

      const scanRows = Math.min(rows.length, 10);
      for (let r = 0; r < scanRows; r++) {
        const row = rows[r] || [];
        const tempMapping: Array<{ colIndex: number; column: string; field: string }> = [];
        for (let c = 0; c < row.length; c++) {
          const cellText = String(row[c] ?? '').trim();
          if (!cellText) continue;
          const field = matchField(cellText);
          if (field && !tempMapping.some(m => m.field === field)) {
            tempMapping.push({ colIndex: c, column: cellText, field });
          }
        }
        if (tempMapping.length > bestMapping.length) {
          bestMapping = tempMapping;
          headerRowIndex = r;
        }
      }

      const mapping = bestMapping;

      if (mapping.length === 0) {
        // 打印前3行帮助调试
        const preview = rows.slice(0, 3).map((r, i) => `第${i + 1}行: [${(r || []).map(c => String(c ?? '')).join(', ')}]`).join('\n');
        console.warn('无法识别列名，前3行内容：\n' + preview);
        message.error('无法识别任何列，请使用标准模板或确保列名含：姓名、手机号 等');
        return false;
      }

      console.log(`表头在第${headerRowIndex + 1}行，映射: `, mapping.map(m => `${m.column}→${m.field}`).join(', '));
      setFieldMapping(mapping.map(m => ({ column: m.column, field: m.field })));

      // 3. 解析数据行（从表头行的下一行开始）
      const leads: ParsedLead[] = [];
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(c => c === null || c === undefined || c === '')) continue;
        const lead: any = {};
        let hasData = false;
        mapping.forEach(({ colIndex, field }) => {
          const val = row[colIndex];
          if (val !== null && val !== undefined && val !== '') {
            hasData = true;
            lead[field] = (field === 'age' || field === 'budget') ? Number(val) || undefined : String(val).trim();
          }
        });
        // 手机号确保是字符串（Excel可能解析为数字）
        if (lead.phone) lead.phone = String(lead.phone).replace(/[.\s]/g, '');
        if (hasData && lead.name) leads.push(lead);
      }

      if (leads.length === 0) { message.warning('未解析到有效数据，请检查文件内容'); return false; }

      // 4. 后端查重
      const phones = leads.map(l => l.phone).filter(Boolean) as string[];
      let dupSet = new Set<string>();
      if (phones.length > 0) {
        try {
          const res = await trainingLeadService.checkDuplicates(phones);
          dupSet = new Set(res.duplicatePhones || []);
        } catch { /* 查重失败不阻塞 */ }
      }

      const previewLeads = leads.map(l => ({ ...l, _duplicate: l.phone ? dupSet.has(l.phone) : false }));
      const dupCount = previewLeads.filter(l => l._duplicate).length;

      setPreviewLeads(previewLeads);
      setDuplicateCount(dupCount);

      if (dupCount > 0) {
        message.warning(`解析到 ${previewLeads.length} 条，其中 ${dupCount} 条手机号已存在（将自动跳过）`);
      } else {
        message.success(`解析到 ${previewLeads.length} 条数据，请确认后导入`);
      }
    } catch (err: any) {
      message.error(`解析失败: ${err.message || '请检查文件格式'}`);
    } finally {
      setAiLoading(false);
    }
    return false;
  };

  // ====== 前端生成模板 ======
  const handleDownloadTemplate = () => {
    const headers = ['姓名*', '性别', '年龄', '手机号*', '微信号', '渠道来源', '培训类型',
      '咨询职位', '意向课程', '意向程度', '线索等级', '所在地区', '预算金额', '跟进人', '备注'];
    const example = ['张三', '女', 35, '13800001111', 'zhangsan_wx', '美团', '月嫂',
      '母婴护理师', '高级母婴护理师', '高', 'A', '杭州', 5000, '', '有3年经验（此行为示例请删除）'];

    const wsData = [headers, example];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({ wch: 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '学员线索导入');
    XLSX.writeFile(wb, '学员线索导入模板.xlsx');
    message.success('模板下载成功');
  };

  // ====== 确认导入（过滤掉重复的） ======
  const handleConfirmImport = async () => {
    // 过滤掉重复的
    const leadsToImport = previewLeads.filter(l => !l._duplicate);
    if (leadsToImport.length === 0) {
      message.warning('没有可导入的数据（全部重复）');
      return;
    }
    setConfirming(true);
    try {
      const result = await trainingLeadService.bulkCreateLeads(leadsToImport);
      setImportResult(result);
      if (result.fail === 0) {
        message.success(`成功导入 ${result.success} 条线索${duplicateCount > 0 ? `，跳过 ${duplicateCount} 条重复` : ''}`);
        onSuccess();
      } else {
        if (result.success > 0) {
          message.warning(`成功 ${result.success} 条，失败 ${result.fail} 条，请查看失败详情`);
          onSuccess();
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

  const FIELD_LABEL_MAP: Record<string, string> = {
    name: '姓名', gender: '性别', age: '年龄', phone: '手机号', wechatId: '微信号',
    leadSource: '渠道来源', trainingType: '培训类型', consultPosition: '咨询职位',
    intendedCourses: '意向课程', intentionLevel: '意向程度', leadGrade: '线索等级',
    address: '所在地区', budget: '预算金额', remarks: '备注',
    followUpPerson: '跟进人', followUpContent: '跟进内容', followUpType: '跟进方式', followUpTime: '跟进时间',
  };

  const previewColumns = [
    {
      title: '', dataIndex: '_duplicate', width: 30, fixed: 'left' as const,
      render: (v: boolean) => v ? <Tooltip title="手机号已存在，将跳过"><Tag color="orange">重复</Tag></Tooltip> : null,
    },
    { title: '姓名', dataIndex: 'name', width: 80, render: (v: string) => v || <Text type="danger">未识别</Text> },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60, render: (v: number) => v ? `${v}岁` : '' },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '微信', dataIndex: 'wechatId', width: 100 },
    { title: '渠道来源', dataIndex: 'leadSource', width: 80 },
    { title: '培训类型', dataIndex: 'trainingType', width: 80 },
    { title: '咨询职位', dataIndex: 'consultPosition', width: 90 },
    {
      title: '意向', dataIndex: 'intentionLevel', width: 60,
      render: (v: string) => v ? <Tag color={intentionColorMap[v] || 'default'}>{v}</Tag> : null
    },
    { title: '跟进人', dataIndex: 'followUpPerson', width: 80 },
    { title: '跟进内容', dataIndex: 'followUpContent', width: 150, ellipsis: true },
    { title: '备注', dataIndex: 'remarks', ellipsis: true },
    {
      title: '操作', width: 60, fixed: 'right' as const,
      render: (_: any, __: any, index: number) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveLead(index)} />
      )
    },
  ];

  const uploadProps: UploadProps = { multiple: false, showUploadList: false };

  const newLeadsCount = previewLeads.filter(l => !l._duplicate).length;

  const tabItems = [
    {
      key: 'excel',
      label: <span><FileExcelOutlined /> Excel表格导入</span>,
      children: (
        <div>
          <Alert
            message={
              <span>
                上传Excel文件直接导入，系统自动识别列名。
                <Button type="link" size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ padding: '0 4px' }}>
                  下载标准模板
                </Button>
                （推荐使用标准模板，也支持自定义列名）
              </span>
            }
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          <Dragger {...uploadProps} accept=".xlsx,.xls" beforeUpload={handleSmartExcelUpload} disabled={aiLoading}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域</p>
            <p className="ant-upload-hint">支持 .xlsx、.xls 格式，自动识别列名，重复手机号自动跳过</p>
          </Dragger>
        </div>
      ),
    },
    {
      key: 'image',
      label: <span><RobotOutlined /> AI图片识别</span>,
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
  ];

  return (
    <Modal
      title={<Space><FileExcelOutlined style={{ color: '#52c41a' }} /><span>批量导入学员线索</span></Space>}
      open={open}
      onCancel={handleClose}
      width={960}
      footer={
        previewLeads.length > 0 && !importResult ? [
          <Button key="reset" icon={<ReloadOutlined />} onClick={() => { setPreviewLeads([]); setDuplicateCount(0); setFieldMapping([]); }}>重新上传</Button>,
          <Popconfirm
            key="confirm"
            title={`确认导入 ${newLeadsCount} 条线索？${duplicateCount > 0 ? `（跳过 ${duplicateCount} 条重复）` : ''}`}
            onConfirm={handleConfirmImport}
            okText="确认导入"
            cancelText="取消"
          >
            <Button type="primary" icon={<CheckCircleOutlined />} loading={confirming} disabled={newLeadsCount === 0}>
              确认导入 ({newLeadsCount} 条)
            </Button>
          </Popconfirm>
        ] : [
          <Button key="close" onClick={handleClose}>关闭</Button>
        ]
      }
      destroyOnClose
    >
      <Spin spinning={aiLoading} tip="正在解析文件...">
        {importResult ? (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Alert message={`成功导入: ${importResult.success} 条`} type="success" showIcon />
              </Col>
              <Col span={8}>
                <Alert message={`导入失败: ${importResult.fail} 条`} type={importResult.fail > 0 ? 'warning' : 'success'} showIcon />
              </Col>
              {duplicateCount > 0 && (
                <Col span={8}>
                  <Alert message={`跳过重复: ${duplicateCount} 条`} type="info" showIcon />
                </Col>
              )}
            </Row>
            {importResult.errors.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', background: '#fff2f0', padding: 12, borderRadius: 4 }}>
                <Text type="danger" strong>失败详情：</Text>
                {importResult.errors.map((err, i) => <div key={i}><Text type="danger">• {err}</Text></div>)}
              </div>
            )}
            <Button style={{ marginTop: 16 }} onClick={() => { setImportResult(null); setPreviewLeads([]); setDuplicateCount(0); setFieldMapping([]); }}>
              继续导入
            </Button>
          </div>
        ) : previewLeads.length > 0 ? (
          <div>
            {/* 字段映射提示 */}
            {fieldMapping.length > 0 && (
              <Alert
                message={
                  <span>
                    列映射：{fieldMapping.map(m => (
                      <Tag key={m.field} style={{ margin: '0 2px' }}>{m.column} → {FIELD_LABEL_MAP[m.field] || m.field}</Tag>
                    ))}
                  </span>
                }
                type="info" showIcon style={{ marginBottom: 8 }}
              />
            )}
            {/* 数据汇总 */}
            <Alert
              message={
                <span>
                  共 <strong>{previewLeads.length}</strong> 条数据
                  {duplicateCount > 0 && <span>，其中 <Text type="warning" strong>{duplicateCount} 条手机号重复</Text>（将自动跳过）</span>}
                  ，可导入 <Text type="success" strong>{newLeadsCount}</Text> 条
                </span>
              }
              type={duplicateCount > 0 ? 'warning' : 'success'} showIcon style={{ marginBottom: 12 }}
            />
            <Table
              dataSource={previewLeads}
              columns={previewColumns}
              rowKey={(_, index) => String(index)}
              size="small"
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
              rowClassName={(record: any) => record._duplicate ? 'duplicate-row' : ''}
            />
            <style>{`.duplicate-row { opacity: 0.5; background: #fafafa !important; }`}</style>
          </div>
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        )}
      </Spin>
    </Modal>
  );
};

export default AIBulkImportModal;

