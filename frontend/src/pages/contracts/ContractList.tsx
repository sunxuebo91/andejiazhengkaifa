import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Modal,
  Badge,
  Form,
} from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined, DeleteOutlined, AuditOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { contractService } from '../../services/contractService';
import { Contract, ContractType, CONTRACT_TYPES } from '../../types/contract.types';
import ContractStatusMini from '../../components/ContractStatusMini';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ContractList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    contractType: '',
    status: '',
    dateRange: null as any,
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });

  // 合同分配相关状态
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningContract, setAssigningContract] = useState<Contract | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ _id: string; name: string; username: string; role: string }>>([]);
  const [assignForm] = Form.useForm();
  const [assignLoading, setAssignLoading] = useState(false);

  // 权限检查 - 支持多种管理员角色标识
  const isAdmin = user?.role === '系统管理员' || user?.role === 'admin' || user?.role === '管理员';
  const isManagerOrAdmin = isAdmin || user?.role === '经理' || user?.role === 'manager' || user?.role === 'operator' || user?.role === '运营';

  useEffect(() => {
    fetchContracts();
    fetchStatistics();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: filters.search || undefined,
        contractType: filters.contractType || undefined,
        status: filters.status || undefined,
        startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      // 只获取真实的爱签合同数据
      const response = await contractService.getContracts(params);
      setContracts(response.contracts);
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }));
    } catch (error) {
      console.error('获取合同列表失败:', error);
      message.error('获取合同列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await contractService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchContracts();
  };

  const handleReset = () => {
    setFilters({
      search: '',
      contractType: '',
      status: '',
      dateRange: null,
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (paginationConfig: any) => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: pagination.total,
    });
  };

  // 删除合同处理
  const handleDeleteContract = (record: Contract) => {
    Modal.confirm({
      title: isAdmin ? '确认删除合同' : '申请删除合同',
      content: (
        <div>
          <p>合同编号：{record.contractNumber}</p>
          <p>客户姓名：{record.customerName}</p>
          <p>服务人员：{record.workerName}</p>
          {isAdmin ? (
            <p style={{ color: 'red', marginTop: 16 }}>
              <strong>警告：</strong>删除后无法恢复，请谨慎操作！
            </p>
          ) : (
            <p style={{ marginTop: 16 }}>
              提交后需要等待管理员审批
            </p>
          )}
        </div>
      ),
      okText: isAdmin ? '确认删除' : '提交申请',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await contractService.deleteContract(
            record._id!,
            '从合同列表申请删除',
            isAdmin // 传递管理员标识
          );

          if (response.success) {
            message.success(
              isAdmin ? '合同删除成功' : '删除申请已提交，等待审批'
            );
            fetchContracts(); // 刷新列表
          } else {
            message.error(response.message || '操作失败');
          }
        } catch (error: any) {
          message.error(error.message || '操作失败');
        }
      },
    });
  };

  // 打开分配弹窗
  const handleOpenAssignModal = async (record: Contract) => {
    setAssigningContract(record);
    setAssignModalVisible(true);
    assignForm.resetFields();

    // 加载可分配的员工列表
    try {
      const response = await contractService.getAssignableUsers();
      if (response.success && response.data) {
        setAssignableUsers(response.data);
      }
    } catch (error) {
      message.error('获取员工列表失败');
    }
  };

  // 提交分配
  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      setAssignLoading(true);

      const response = await contractService.assignContract(
        assigningContract!._id!,
        values.assignedTo,
        values.reason
      );

      if (response.success) {
        message.success('合同分配成功');
        setAssignModalVisible(false);
        fetchContracts(); // 刷新列表
      } else {
        message.error(response.message || '分配失败');
      }
    } catch (error: any) {
      message.error(error.message || '分配失败');
    } finally {
      setAssignLoading(false);
    }
  };

  // 合同本地状态颜色映射
  const getContractStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      'draft': 'default',
      'signing': 'blue',
      'active': 'green',
      'replaced': 'orange',
      'cancelled': 'red',
    };
    return colors[status || ''] || 'default';
  };

  // 合同本地状态文本映射
  const getContractStatusText = (status?: string) => {
    const texts: Record<string, string> = {
      'draft': '草稿',
      'signing': '签约中',
      'active': '生效中',
      'replaced': '已替换',
      'cancelled': '已作废',
    };
    return texts[status || ''] || '未知状态';
  };

  // 爱签状态颜色映射（数字码 → 颜色）
  const getEsignStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      '0': 'orange',
      '1': 'blue',
      '2': 'green',
      '3': 'red',
      '4': 'red',
      '6': 'default',
      '7': 'default',
      '等待签约': 'orange',
      '签约中': 'blue',
      '已签约': 'green',
      '过期': 'red',
      '拒签': 'red',
      '作废': 'default',
      '撤销': 'default',
    };
    return colors[status || ''] || 'default';
  };

  // 爱签状态文本映射（数字码 → 中文）
  const getEsignStatusText = (status?: string) => {
    const texts: Record<string, string> = {
      '0': '等待签约',
      '1': '签约中',
      '2': '已签约',
      '3': '过期',
      '4': '拒签',
      '6': '作废',
      '7': '撤销',
    };
    return texts[status || ''] || status || '未知状态';
  };

  const getContractTypeColor = (type: ContractType) => {
    const colors: Record<ContractType, string> = {
      [ContractType.YUESAO]: 'purple',
      [ContractType.ZHUJIA_YUER]: 'green',
      [ContractType.BAOJIE]: 'blue',
      [ContractType.ZHUJIA_BAOMU]: 'cyan',
      [ContractType.YANGCHONG]: 'orange',
      [ContractType.XIAOSHI]: 'geekblue',
      [ContractType.BAIBAN_YUER]: 'lime',
      [ContractType.BAIBAN_BAOMU]: 'magenta',
      [ContractType.ZHUJIA_HULAO]: 'gold',
      [ContractType.ERTONG_PEIBAN]: 'volcano',
    };
    return colors[type] || 'default';
  };

  // 从合同记录中解析结束日期（复用 templateParams 解析逻辑）
  const getContractEndDate = (record: Contract): ReturnType<typeof dayjs> | null => {
    const tp = record.templateParams;
    const endDateStr = tp?.['合同结束时间'] || tp?.['服务结束时间'] ||
      (tp?.['结束年'] && tp?.['结束月'] && tp?.['结束日']
        ? `${tp['结束年']}年${String(tp['结束月']).padStart(2, '0')}月${String(tp['结束日']).padStart(2, '0')}日`
        : undefined);

    if (endDateStr) {
      const m = endDateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
      if (m) return dayjs(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
      const parsed = dayjs(endDateStr);
      if (parsed.isValid()) return parsed;
    }
    if (record.endDate) {
      const parsed = dayjs(record.endDate);
      if (parsed.isValid()) return parsed;
    }
    return null;
  };

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 130,
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 12 }}>{text}</span>
      ),
    },
    {
      title: '客户信息',
      key: 'customer',
      width: 120,
      render: (_: any, record: Contract) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.customerName}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{record.customerPhone}</div>
        </div>
      ),
    },
    {
      title: '服务人员',
      key: 'worker',
      width: 120,
      render: (_: any, record: Contract) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.workerName}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{record.workerPhone}</div>
        </div>
      ),
    },
    {
      title: '合同类型',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 90,
      render: (type: ContractType) => (
        <Tag color={getContractTypeColor(type)} style={{ fontSize: 11 }}>{type}</Tag>
      ),
    },
    {
      title: '服务期间',
      key: 'period',
      width: 148,
      render: (_: any, record: Contract) => {
        const tp = record.templateParams;
        const startDateStr = tp?.['合同开始时间'] || tp?.['服务开始时间'] ||
          (tp?.['开始年'] && tp?.['开始月'] && tp?.['开始日']
            ? `${tp['开始年']}年${String(tp['开始月']).padStart(2, '0')}月${String(tp['开始日']).padStart(2, '0')}日`
            : undefined);

        const fmtDate = (s: string | undefined, fallback: string) => {
          if (s) {
            const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
            if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
            const p = dayjs(s);
            if (p.isValid()) return p.format('YYYY-MM-DD');
            return s;
          }
          return dayjs(fallback).format('YYYY-MM-DD');
        };

        const displayStart = fmtDate(startDateStr, record.startDate);
        const endDayjs = getContractEndDate(record);
        const displayEnd = endDayjs ? endDayjs.format('YYYY-MM-DD') : dayjs(record.endDate).format('YYYY-MM-DD');

        return (
          <div style={{ fontSize: 12 }}>
            <div>{displayStart}</div>
            <div style={{ color: '#999' }}>至 {displayEnd}</div>
          </div>
        );
      },
    },
    {
      title: '服务费',
      dataIndex: 'customerServiceFee',
      key: 'customerServiceFee',
      width: 88,
      render: (fee: number) => (
        <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 13 }}>
          {fee ? `¥${fee.toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: any, record: Contract) => {
        // 如果有爱签合同编号，显示爱签状态组件（迷你版）
        if (record.esignContractNo) {
          return (
            <ContractStatusMini
              contractNo={record.esignContractNo}
              orderCategory={(record as any).orderCategory}
              onStatusChange={(status) => {
                console.log(`合同 ${record.contractNumber} 状态更新:`, status);
              }}
            />
          );
        }

        // 没有爱签合同编号时：优先使用 contractStatus（本地状态），其次使用 esignStatus
        if (record.esignStatus) {
          const esignText = getEsignStatusText(record.esignStatus);
          return (
            <Tag color={getEsignStatusColor(record.esignStatus)}>{esignText}</Tag>
          );
        }

        // 最终回退到 contractStatus（本地合同状态）
        const localStatus = record.contractStatus || 'draft';
        return (
          <Tag color={getContractStatusColor(localStatus)}>{getContractStatusText(localStatus)}</Tag>
        );
      },
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 72,
      render: (_: any, record: Contract) => {
        const creator = record.createdBy as any;
        if (!creator) return '-';
        if (typeof creator === 'string') {
          if (creator === 'temp' || /^[a-fA-F0-9]{24}$/.test(creator)) return '-';
          return <span style={{ fontSize: 12 }}>{creator}</span>;
        }
        return <span style={{ fontSize: 12 }}>{creator.name || creator.username || '-'}</span>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 128,
      render: (date: string) => <span style={{ fontSize: 12 }}>{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>,
    },
    {
      title: '背调',
      key: 'hasBackgroundCheck',
      width: 56,
      render: (_: any, record: Contract) => (
        (record as any).hasBackgroundCheck
          ? <Tag color="green" style={{ fontSize: 11, padding: '0 4px' }}>是</Tag>
          : <Tag color="default" style={{ fontSize: 11, padding: '0 4px' }}>否</Tag>
      ),
    },
    {
      title: '保险',
      key: 'hasInsurance',
      width: 56,
      render: (_: any, record: Contract) => (
        (record as any).hasInsurance
          ? <Tag color="green" style={{ fontSize: 11, padding: '0 4px' }}>是</Tag>
          : <Tag color="default" style={{ fontSize: 11, padding: '0 4px' }}>否</Tag>
      ),
    },
    {
      title: '临近到期',
      key: 'expiringSoon',
      width: 68,
      render: (_: any, record: Contract) => {
        const endDate = getContractEndDate(record);
        if (!endDate || !endDate.isValid()) return <Tag style={{ fontSize: 11, padding: '0 4px' }}>-</Tag>;
        const daysLeft = endDate.diff(dayjs().startOf('day'), 'day');
        if (daysLeft < 0) return <Tag color="red" style={{ fontSize: 11, padding: '0 4px' }}>已过期</Tag>;
        if (daysLeft <= 30) return <Tag color="orange" style={{ fontSize: 11, padding: '0 4px' }}>是</Tag>;
        return <Tag color="default" style={{ fontSize: 11, padding: '0 4px' }}>否</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 170,
      fixed: 'right' as const,
      render: (_: any, record: Contract) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/standalone/contracts/${record._id}`, '_blank')}
          >
            查看
          </Button>
          {isManagerOrAdmin && (
            <Button
              size="small"
              icon={<UserSwitchOutlined />}
              onClick={() => handleOpenAssignModal(record)}
            >
              分配
            </Button>
          )}
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteContract(record)}
          >
            {isAdmin ? '删除' : '申请删除'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      {/* 统计卡片 */}
      <Row gutter={12} style={{ marginBottom: '12px' }}>
        {[
          { title: '合同总数', value: statistics.total, color: '#1890ff' },
          { title: '签约中', value: statistics.active, color: '#52c41a' },
          { title: '已签约', value: statistics.completed, color: '#1890ff' },
          { title: '其他状态', value: statistics.cancelled, color: '#ff4d4f' },
        ].map(item => (
          <Col span={6} key={item.title}>
            <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{item.title}</span>}
                value={item.value}
                valueStyle={{ color: item.color, fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="合同管理"
        extra={
          <Space>
            {isAdmin && (
              <Button
                icon={<AuditOutlined />}
                onClick={() => navigate('/contracts/approvals')}
              >
                审批管理
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/contracts/create')}
            >
              新建合同
            </Button>
          </Space>
        }
      >
        {/* 搜索筛选 */}
        <Row gutter={8} style={{ marginBottom: '12px' }}>
          <Col span={6}>
            <Input
              placeholder="搜索合同编号、客户姓名、手机号"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="合同类型"
              value={filters.contractType}
              onChange={(value) => setFilters(prev => ({ ...prev, contractType: value }))}
              allowClear
              style={{ width: '100%' }}
            >
              {CONTRACT_TYPES.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="合同状态"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="等待签约">等待签约</Option>
              <Option value="签约中">签约中</Option>
              <Option value="已签约">已签约</Option>
              <Option value="过期">过期</Option>
              <Option value="拒签">拒签</Option>
              <Option value="作废">作废</Option>
              <Option value="撤销">撤销</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 合同列表 */}
        <Table
          size="small"
          columns={columns}
          dataSource={contracts}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1380 }}
        />
      </Card>

      {/* 合同分配弹窗 */}
      <Modal
        title="分配合同"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        onOk={handleAssignSubmit}
        confirmLoading={assignLoading}
        okText="确认分配"
        cancelText="取消"
      >
        {assigningContract && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>合同编号：</strong>{assigningContract.contractNumber}</p>
            <p><strong>客户姓名：</strong>{assigningContract.customerName}</p>
            <p><strong>服务人员：</strong>{assigningContract.workerName}</p>
          </div>
        )}
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="assignedTo"
            label="分配给"
            rules={[{ required: true, message: '请选择负责人' }]}
          >
            <Select
              placeholder="选择员工"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {assignableUsers.map(user => (
                <Select.Option key={user._id} value={user._id}>
                  {user.name} ({user.username}) - {user.role === 'admin' ? '管理员' : user.role === 'manager' ? '经理' : '员工'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="分配原因"
          >
            <Input.TextArea rows={3} placeholder="请输入分配原因（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractList;
