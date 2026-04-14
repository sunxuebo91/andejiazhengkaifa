import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, message, Popconfirm, Tag, Switch,
  Modal, Form, Input, InputNumber, Select, TimePicker, Divider, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import leadTransferService, { LeadTransferRule, CreateLeadTransferRuleDto } from '../../services/leadTransfer';
import apiService from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

// 学员线索可用状态（对应 LeadStatus 枚举）
const TRAINING_STATUSES = [
  { value: '跟进中', label: '跟进中' },
  { value: '7天未跟进', label: '7天未跟进' },
  { value: '15天未跟进', label: '15天未跟进' },
  { value: '未跟进', label: '未跟进' },
  { value: '新客未跟进', label: '新客未跟进' },
  { value: '流转未跟进', label: '流转未跟进' },
];

const getSourceUserIds = (rule: LeadTransferRule) =>
  rule.sourceUserIds?.length
    ? rule.sourceUserIds
    : rule.userQuotas?.filter((u: any) => u.role === 'source' || u.role === 'both').map((u: any) => u.userId) || [];

const getTargetUserIds = (rule: LeadTransferRule) =>
  rule.targetUserIds?.length
    ? rule.targetUserIds
    : rule.userQuotas?.filter((u: any) => u.role === 'target' || u.role === 'both').map((u: any) => u.userId) || [];

const TrainingLeadTransferRules: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<LeadTransferRule[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<LeadTransferRule | null>(null);
  const [selectedRule, setSelectedRule] = useState<LeadTransferRule | null>(null);
  const [form] = Form.useForm();

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await leadTransferService.getTrainingRules();
      setRules(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取规则列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.get('/api/users', { page: 1, pageSize: 1000 });
      setUsers(response.data?.items || []);
    } catch {
      message.error('获取用户列表失败');
    }
  };

  useEffect(() => { loadRules(); loadUsers(); }, []);

  const handleToggle = async (rule: LeadTransferRule) => {
    try {
      await leadTransferService.toggleRule(rule._id, !rule.enabled);
      message.success(`规则已${rule.enabled ? '禁用' : '启用'}`);
      loadRules();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await leadTransferService.deleteRule(id);
      message.success('删除成功');
      loadRules();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
    }
  };

  const handleOpenModal = (rule?: LeadTransferRule) => {
    setEditingRule(rule || null);
    if (rule) {
      form.setFieldsValue({
        ruleName: rule.ruleName,
        description: rule.description,
        enabled: rule.enabled,
        inactiveHours: rule.triggerConditions.inactiveHours,
        transferCooldownHours: rule.triggerConditions.transferCooldownHours ?? 24,
        maxTransferCount: rule.triggerConditions.maxTransferCount ?? 0,
        contractStatuses: rule.triggerConditions.contractStatuses,
        leadSources: rule.triggerConditions.leadSources,
        executionWindowEnabled: rule.executionWindow?.enabled ?? true,
        executionTime: rule.executionWindow
          ? [dayjs(rule.executionWindow.startTime, 'HH:mm'), dayjs(rule.executionWindow.endTime, 'HH:mm')]
          : [dayjs('09:30', 'HH:mm'), dayjs('18:30', 'HH:mm')],
        sourceUserIds: getSourceUserIds(rule),
        targetUserIds: getTargetUserIds(rule),
        strategy: rule.distributionConfig?.strategy || 'balanced-random',
        enableCompensation: rule.distributionConfig?.enableCompensation ?? true,
        compensationPriority: rule.distributionConfig?.compensationPriority ?? 5,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        enabled: true,
        inactiveHours: 168,
        transferCooldownHours: 24,
        maxTransferCount: 3,
        contractStatuses: ['7天未跟进', '15天未跟进'],
        executionWindowEnabled: true,
        executionTime: [dayjs('09:30', 'HH:mm'), dayjs('18:30', 'HH:mm')],
        strategy: 'balanced-random',
        enableCompensation: true,
        compensationPriority: 5,
      });
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: CreateLeadTransferRuleDto = {
        ruleName: values.ruleName,
        description: values.description,
        enabled: values.enabled,
        targetModule: 'training',
        triggerConditions: {
          inactiveHours: values.inactiveHours,
          transferCooldownHours: values.transferCooldownHours,
          maxTransferCount: values.maxTransferCount,
          contractStatuses: values.contractStatuses,
          leadSources: values.leadSources,
        },
        executionWindow: {
          enabled: values.executionWindowEnabled,
          startTime: values.executionTime[0].format('HH:mm'),
          endTime: values.executionTime[1].format('HH:mm'),
        },
        sourceUserIds: values.sourceUserIds,
        targetUserIds: values.targetUserIds,
        distributionConfig: {
          strategy: 'balanced-random',
          enableCompensation: true,
          compensationPriority: 5,
        },
      };
      if (editingRule) {
        await leadTransferService.updateRule(editingRule._id, data);
        message.success('更新成功');
      } else {
        await leadTransferService.createRule(data);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadRules();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请填写完整信息');
      } else {
        message.error(error?.response?.data?.message || '操作失败');
      }
    }
  };

  const handleManualExecute = async (ruleId: string) => {
    try {
      const result = await leadTransferService.executeTrainingNow(ruleId);
      if (result.transferredCount > 0) {
        let detail = `执行成功！已流转 ${result.transferredCount} 条学员线索\n\n`;
        if (result.userStats?.length) {
          detail += '本次流转统计：\n';
          result.userStats.forEach((s: any) => {
            if (s.transferredOut > 0 || s.transferredIn > 0) {
              detail += `${s.userName}: 流出${s.transferredOut}条, 流入${s.transferredIn}条\n`;
            }
          });
        }
        Modal.success({ title: '执行成功', content: <div style={{ whiteSpace: 'pre-line' }}>{detail}</div>, width: 500 });
      } else {
        message.info('执行完成，没有符合条件的学员线索需要流转');
      }
      loadRules();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '执行失败');
    }
  };

  const columns: ColumnsType<LeadTransferRule> = [
    { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName', width: 180 },
    {
      title: '状态', dataIndex: 'enabled', key: 'enabled', width: 90,
      render: (enabled: boolean, record) => (
        <Switch checked={enabled} onChange={() => handleToggle(record)} checkedChildren="启用" unCheckedChildren="禁用" />
      ),
    },
    {
      title: '触发条件', key: 'conditions', width: 220,
      render: (_, record) => (
        <div>
          <div>持有≥{record.triggerConditions.inactiveHours}小时未转化</div>
          <div style={{ marginTop: 4 }}>
            {record.triggerConditions.contractStatuses.map(s => <Tag key={s} color="blue">{s}</Tag>)}
          </div>
        </div>
      ),
    },
    {
      title: '执行窗口', key: 'window', width: 150,
      render: (_, record) => record.executionWindow?.enabled
        ? <Tag color="green">{record.executionWindow.startTime}~{record.executionWindow.endTime}</Tag>
        : <Tag>全天</Tag>,
    },
    {
      title: '参与人员', key: 'users', width: 200,
      render: (_, record) => {
        const sourceIds = getSourceUserIds(record);
        const targetIds = getTargetUserIds(record);
        const sourceNames = sourceIds.map(id => users.find(u => u._id === id || u.id === id)?.name || id);
        const targetNames = targetIds.map(id => users.find(u => u._id === id || u.id === id)?.name || id);
        return (
          <div style={{ fontSize: 12 }}>
            <div>流出：{sourceNames.join('、') || '-'}</div>
            <div>流入：{targetNames.join('、') || '-'}</div>
          </div>
        );
      },
    },
    {
      title: '已流转', key: 'stats', width: 90,
      render: (_, record) => <span>{record.statistics?.totalTransferred ?? 0} 条</span>,
    },
    {
      title: '操作', key: 'action', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedRule(record); setDetailModalVisible(true); }}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
          <Button size="small" type="primary" ghost onClick={() => handleManualExecute(record._id)}>立即执行</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="学员线索流转规则"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadRules}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>创建规则</Button>
          </Space>
        }
      >
        <Table columns={columns} dataSource={rules} rowKey="_id" loading={loading} scroll={{ x: 1200 }} pagination={false} />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑规则' : '创建学员线索流转规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={800}
        okText={editingRule ? '更新' : '创建'}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
                <Input placeholder="例：职培顾问7天流转规则" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="enabled" label="是否启用" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="规则描述">
            <TextArea rows={2} placeholder="可选描述" />
          </Form.Item>

          <Divider>触发条件</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="inactiveHours" label="持有超过（小时）未转化则流转" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="48=2天, 168=7天" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="transferCooldownHours" label="流转冷却期（小时）">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxTransferCount" label="最大流转次数（0不限）">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="contractStatuses" label="触发的线索状态" rules={[{ required: true, message: '请选择至少一个状态' }]}>
            <Select mode="multiple" placeholder="选择要触发流转的学员线索状态">
              {TRAINING_STATUSES.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
            </Select>
          </Form.Item>

          <Divider>执行时间窗口</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="executionWindowEnabled" label="限制执行时间" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="executionTime" label="执行时间段">
                <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>人员配置</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sourceUserIds" label="流出人员（线索从这些人名下流出）" rules={[{ required: true }]}>
                <Select mode="multiple" placeholder="选择流出人员" optionFilterProp="label"
                  options={users.map(u => ({ value: u._id || u.id, label: u.name }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetUserIds" label="流入人员（线索轮流分配给这些人）" rules={[{ required: true }]}>
                <Select mode="multiple" placeholder="选择流入人员" optionFilterProp="label"
                  options={users.map(u => ({ value: u._id || u.id, label: u.name }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="规则详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={<Button onClick={() => setDetailModalVisible(false)}>关闭</Button>}
        width={800}
      >
        {selectedRule && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="规则名称" value={selectedRule.ruleName} /></Col>
              <Col span={8}>
                <Statistic title="状态" value={selectedRule.enabled ? '启用' : '禁用'}
                  valueStyle={{ color: selectedRule.enabled ? '#3f8600' : '#cf1322' }} />
              </Col>
              <Col span={8}><Statistic title="已流转" value={selectedRule.statistics?.totalTransferred ?? 0} suffix="条" /></Col>
            </Row>
            <Divider>触发条件</Divider>
            <Row gutter={[16, 8]}>
              <Col span={8}><b>无活动阈值：</b>{selectedRule.triggerConditions.inactiveHours} 小时</Col>
              <Col span={8}><b>冷却期：</b>{selectedRule.triggerConditions.transferCooldownHours ?? 24} 小时</Col>
              <Col span={8}><b>最大流转：</b>{selectedRule.triggerConditions.maxTransferCount ?? '不限'} 次</Col>
              <Col span={24}>
                <b>触发状态：</b>
                {selectedRule.triggerConditions.contractStatuses.map(s => <Tag key={s} color="blue">{s}</Tag>)}
              </Col>
            </Row>
            <Divider>用户配额统计</Divider>
            <Table
              size="small"
              dataSource={selectedRule.userQuotas || []}
              rowKey="userId"
              pagination={false}
              columns={[
                { title: '用户', dataIndex: 'userName', key: 'userName' },
                { title: '角色', dataIndex: 'role', key: 'role', render: (r: string) => ({ source: '流出', target: '流入', both: '双向' } as Record<string, string>)[r] || r },
                { title: '流出', dataIndex: 'transferredOut', key: 'out' },
                { title: '流入', dataIndex: 'transferredIn', key: 'in' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrainingLeadTransferRules;
