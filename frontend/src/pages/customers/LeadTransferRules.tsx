import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Tag,
  Switch,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Divider,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import leadTransferService, {
  LeadTransferRule,
  CreateLeadTransferRuleDto,
} from '../../services/leadTransfer';
import apiService from '../../services/api';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const LeadTransferRules: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<LeadTransferRule[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<LeadTransferRule | null>(null);
  const [selectedRule, setSelectedRule] = useState<LeadTransferRule | null>(null);
  const [form] = Form.useForm();

  // 加载规则列表
  const loadRules = async () => {
    setLoading(true);
    try {
      console.log('开始获取规则列表...');
      const data = await leadTransferService.getRules();
      console.log('获取到的规则数据:', data);
      setRules(data);
    } catch (error: any) {
      console.error('获取规则列表失败:', error);
      console.error('错误响应:', error?.response);
      message.error(error?.response?.data?.message || '获取规则列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const response = await apiService.get('/api/users', { page: 1, pageSize: 1000 });
      setUsers(response.data?.items || []);
    } catch (error: any) {
      message.error('获取用户列表失败');
    }
  };

  useEffect(() => {
    loadRules();
    loadUsers();
  }, []);

  // 切换规则启用状态
  const handleToggle = async (rule: LeadTransferRule) => {
    try {
      await leadTransferService.toggleRule(rule._id);
      message.success(`规则已${rule.enabled ? '禁用' : '启用'}`);
      loadRules();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '操作失败');
    }
  };

  // 删除规则
  const handleDelete = async (id: string) => {
    try {
      await leadTransferService.deleteRule(id);
      message.success('删除成功');
      loadRules();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
    }
  };

  // 打开创建/编辑弹窗
  const handleOpenModal = (rule?: LeadTransferRule) => {
    setEditingRule(rule || null);
    if (rule) {
      form.setFieldsValue({
        ruleName: rule.ruleName,
        description: rule.description,
        enabled: rule.enabled,
        inactiveHours: rule.triggerConditions.inactiveHours,
        contractStatuses: rule.triggerConditions.contractStatuses,
        leadSources: rule.triggerConditions.leadSources,
        dateRange: rule.triggerConditions.createdDateRange?.startDate
          ? [
              dayjs(rule.triggerConditions.createdDateRange.startDate),
              dayjs(rule.triggerConditions.createdDateRange.endDate),
            ]
          : undefined,
        executionWindowEnabled: rule.executionWindow.enabled,
        executionTime: [
          dayjs(rule.executionWindow.startTime, 'HH:mm'),
          dayjs(rule.executionWindow.endTime, 'HH:mm'),
        ],
        sourceUserIds: rule.sourceUserIds,
        targetUserIds: rule.targetUserIds,
        strategy: rule.distributionConfig.strategy,
        enableCompensation: rule.distributionConfig.enableCompensation,
        compensationPriority: rule.distributionConfig.compensationPriority,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        enabled: true,
        inactiveHours: 48,
        contractStatuses: ['待定', '匹配中'],
        executionWindowEnabled: true,
        executionTime: [dayjs('09:30', 'HH:mm'), dayjs('18:30', 'HH:mm')],
        strategy: 'balanced-random',
        enableCompensation: true,
        compensationPriority: 5,
      });
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: CreateLeadTransferRuleDto = {
        ruleName: values.ruleName,
        description: values.description,
        enabled: values.enabled,
        triggerConditions: {
          inactiveHours: values.inactiveHours,
          contractStatuses: values.contractStatuses,
          leadSources: values.leadSources,
          createdDateRange: values.dateRange
            ? {
                startDate: values.dateRange[0].toDate(),
                endDate: values.dateRange[1].toDate(),
              }
            : undefined,
        },
        executionWindow: {
          enabled: values.executionWindowEnabled,
          startTime: values.executionTime[0].format('HH:mm'),
          endTime: values.executionTime[1].format('HH:mm'),
        },
        sourceUserIds: values.sourceUserIds,
        targetUserIds: values.targetUserIds,
        distributionConfig: {
          strategy: values.strategy,
          enableCompensation: values.enableCompensation,
          compensationPriority: values.compensationPriority,
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

  // 查看规则详情
  const handleViewDetail = async (rule: LeadTransferRule) => {
    try {
      console.log('查看规则详情，规则ID:', rule._id);
      const detail = await leadTransferService.getRule(rule._id);
      console.log('获取到的规则详情:', detail);
      setSelectedRule(detail);
      setDetailModalVisible(true);
    } catch (error: any) {
      console.error('获取规则详情失败:', error);
      message.error('获取规则详情失败');
    }
  };

  // 手动执行规则
  const handleManualExecute = async (ruleId: string) => {
    try {
      const result = await leadTransferService.executeNow(ruleId);
      if (result.transferredCount > 0) {
        // 构建详细统计信息
        let detailMessage = `执行成功！已流转 ${result.transferredCount} 条线索\n\n`;

        if (result.userStats && result.userStats.length > 0) {
          detailMessage += '本次流转统计：\n';
          result.userStats.forEach((stat: any) => {
            if (stat.transferredOut > 0 || stat.transferredIn > 0) {
              detailMessage += `${stat.userName}: 流出${stat.transferredOut}条, 流入${stat.transferredIn}条\n`;
            }
          });
        }

        Modal.success({
          title: '执行成功',
          content: (
            <div style={{ whiteSpace: 'pre-line' }}>
              {detailMessage}
            </div>
          ),
          width: 500,
        });
      } else {
        message.info('执行完成，没有符合条件的线索需要流转');
      }
      loadRules(); // 刷新列表
    } catch (error: any) {
      message.error(error?.response?.data?.message || '执行失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<LeadTransferRule> = [
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggle(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '触发条件',
      key: 'conditions',
      width: 200,
      render: (_, record) => (
        <div>
          <div>≥{record.triggerConditions.inactiveHours}小时</div>
          <div>
            {record.triggerConditions.contractStatuses.map((status) => (
              <Tag key={status} color="blue">
                {status}
              </Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: '执行时间',
      key: 'executionWindow',
      width: 150,
      render: (_, record) =>
        record.executionWindow.enabled
          ? `${record.executionWindow.startTime}-${record.executionWindow.endTime}`
          : '全天',
    },
    {
      title: '流出人数',
      key: 'sourceCount',
      width: 100,
      render: (_, record) => record.userQuotas?.filter((u: any) => u.role === 'source' || u.role === 'both').length || 0,
    },
    {
      title: '流入人数',
      key: 'targetCount',
      width: 100,
      render: (_, record) => record.userQuotas?.filter((u: any) => u.role === 'target' || u.role === 'both').length || 0,
    },
    {
      title: '已流转',
      dataIndex: ['statistics', 'totalTransferred'],
      key: 'totalTransferred',
      width: 100,
    },
    {
      title: '上次执行',
      dataIndex: ['statistics', 'lastExecutedAt'],
      key: 'lastExecutedAt',
      width: 180,
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定立即执行此规则吗？"
            description="将立即检查并流转符合条件的线索"
            onConfirm={() => handleManualExecute(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" disabled={!record.enabled}>
              执行
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定删除此规则吗？"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="线索流转规则"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadRules}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
              创建规则
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={false}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑规则' : '创建规则'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={18}>
              <Form.Item
                label="规则名称"
                name="ruleName"
                rules={[{ required: true, message: '请输入规则名称' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="例如：销售组48小时流转规则" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="启用状态" name="enabled" valuePropName="checked" style={{ marginBottom: 12 }}>
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description" style={{ marginBottom: 12 }}>
            <TextArea rows={2} placeholder="规则描述（可选）" />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }}>触发条件</Divider>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                label="无活动时长（小时）"
                name="inactiveHours"
                rules={[{ required: true, message: '请输入' }]}
                style={{ marginBottom: 12 }}
              >
                <InputNumber min={1} max={720} style={{ width: '100%' }} placeholder="48" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                label="客户状态"
                name="contractStatuses"
                rules={[{ required: true, message: '请选择' }]}
                style={{ marginBottom: 12 }}
              >
                <Select mode="multiple" placeholder="选择客户状态">
                  <Option value="待定">待定</Option>
                  <Option value="匹配中">匹配中</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="线索来源（可选）" name="leadSources" style={{ marginBottom: 12 }}>
                <Select mode="multiple" placeholder="选择线索来源">
                  <Option value="美团">美团</Option>
                  <Option value="抖音">抖音</Option>
                  <Option value="快手">快手</Option>
                  <Option value="小红书">小红书</Option>
                  <Option value="转介绍">转介绍</Option>
                  <Option value="杭州同馨">杭州同馨</Option>
                  <Option value="握个手平台">握个手平台</Option>
                  <Option value="线索购买">线索购买</Option>
                  <Option value="莲心">莲心</Option>
                  <Option value="美家">美家</Option>
                  <Option value="天机鹿">天机鹿</Option>
                  <Option value="孕妈联盟">孕妈联盟</Option>
                  <Option value="高阁">高阁</Option>
                  <Option value="星星">星星</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="创建日期范围（可选）" name="dateRange" style={{ marginBottom: 12 }}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }}>执行时间窗口</Divider>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item label="启用时间窗口" name="executionWindowEnabled" valuePropName="checked" style={{ marginBottom: 12 }}>
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
            <Col span={18}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.executionWindowEnabled !== currentValues.executionWindowEnabled
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('executionWindowEnabled') ? (
                    <Form.Item
                      label="执行时间段"
                      name="executionTime"
                      rules={[{ required: true, message: '请选择' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }}>流转配置</Divider>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="流出名单"
                name="sourceUserIds"
                rules={[{ required: true, message: '请选择' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  mode="multiple"
                  placeholder="选择流出用户"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={users.map((user) => ({
                    label: `${user.name} (${user.username})`,
                    value: user._id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="流入名单"
                name="targetUserIds"
                rules={[{ required: true, message: '请选择' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  mode="multiple"
                  placeholder="选择流入用户"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={users.map((user) => ({
                    label: `${user.name} (${user.username})`,
                    value: user._id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }}>分配策略</Divider>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="分配策略" name="strategy" style={{ marginBottom: 12 }}>
                <Select>
                  <Option value="balanced-random">平衡随机</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="启用补偿机制" name="enableCompensation" valuePropName="checked" style={{ marginBottom: 12 }}>
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="补偿优先级" name="compensationPriority" style={{ marginBottom: 12 }}>
                <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="5" />
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
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        {selectedRule && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic title="规则名称" value={selectedRule.ruleName} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="状态"
                  value={selectedRule.enabled ? '启用' : '禁用'}
                  valueStyle={{ color: selectedRule.enabled ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col span={8}>
                <Statistic title="已流转" value={selectedRule.statistics.totalTransferred} suffix="条" />
              </Col>
            </Row>

            <Divider>用户配额统计</Divider>

            <Table
              dataSource={selectedRule.userQuotas}
              rowKey="userId"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '用户',
                  dataIndex: 'userName',
                  key: 'userName',
                },
                {
                  title: '角色',
                  dataIndex: 'role',
                  key: 'role',
                  render: (role) => (
                    <Tag color={role === 'source' ? 'orange' : role === 'target' ? 'green' : 'blue'}>
                      {role === 'source' ? '流出' : role === 'target' ? '流入' : '流出+流入'}
                    </Tag>
                  ),
                },
                {
                  title: '流出标签',
                  key: 'outgoingTags',
                  render: () => (
                    <div>
                      {selectedRule.triggerConditions.contractStatuses.map((status) => (
                        <Tag key={status} color="blue" style={{ marginBottom: 4 }}>
                          {status}
                        </Tag>
                      ))}
                    </div>
                  ),
                },
                {
                  title: '流出数',
                  dataIndex: 'transferredOut',
                  key: 'transferredOut',
                },
                {
                  title: '流入数',
                  dataIndex: 'transferredIn',
                  key: 'transferredIn',
                },
                {
                  title: '平衡值',
                  dataIndex: 'balance',
                  key: 'balance',
                  render: (balance) => (
                    <span style={{ color: balance > 0 ? '#cf1322' : balance < 0 ? '#3f8600' : '#000' }}>
                      {balance > 0 ? `+${balance}` : balance}
                    </span>
                  ),
                },
                {
                  title: '待补偿',
                  dataIndex: 'pendingCompensation',
                  key: 'pendingCompensation',
                },
              ]}
            />

            <Divider>规则配置</Divider>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div>
                  <strong>触发条件：</strong>
                  <div>无活动时长：≥{selectedRule.triggerConditions.inactiveHours}小时</div>
                  <div>
                    客户状态：
                    {selectedRule.triggerConditions.contractStatuses.map((status) => (
                      <Tag key={status} color="blue">
                        {status}
                      </Tag>
                    ))}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>执行时间：</strong>
                  <div>
                    {selectedRule.executionWindow.enabled
                      ? `${selectedRule.executionWindow.startTime} - ${selectedRule.executionWindow.endTime}`
                      : '全天'}
                  </div>
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <div>
                  <strong>分配策略：</strong>
                  <div>
                    {selectedRule.distributionConfig.strategy === 'balanced-random'
                      ? '平衡随机'
                      : selectedRule.distributionConfig.strategy === 'round-robin'
                      ? '轮询'
                      : '最少负载'}
                  </div>
                  <div>
                    补偿机制：
                    {selectedRule.distributionConfig.enableCompensation ? '启用' : '禁用'}
                  </div>
                  <div>补偿优先级：{selectedRule.distributionConfig.compensationPriority}</div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>上次执行：</strong>
                  <div>
                    {selectedRule.statistics.lastExecutedAt
                      ? dayjs(selectedRule.statistics.lastExecutedAt).format('YYYY-MM-DD HH:mm:ss')
                      : '未执行'}
                  </div>
                  <div>
                    执行结果：
                    {selectedRule.statistics.lastExecutionResult || '-'}
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeadTransferRules;

