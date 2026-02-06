import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Select,
  message,
  Tooltip,
  Modal,
  Descriptions,
  Popconfirm,
  Radio,
  Form,
  Input,
  DatePicker,
} from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import {
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  PrinterOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  WechatOutlined,
  RollbackOutlined,
  SwapOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import insuranceService from '../../services/insuranceService';
import { getCurrentUser } from '../../services/auth';
import {
  InsurancePolicy,
  PolicyStatus,
  POLICY_STATUS_MAP,
  ID_TYPE_OPTIONS,
  GENDER_OPTIONS,
} from '../../types/insurance.types';
import WechatPayModal from '../../components/WechatPayModal';

const { Option } = Select;

const InsuranceList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | undefined>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentPolicy, setPaymentPolicy] = useState<InsurancePolicy | null>(null);
  const [surrenderModalVisible, setSurrenderModalVisible] = useState(false);
  const [surrenderPolicy, setSurrenderPolicy] = useState<InsurancePolicy | null>(null);
  const [surrenderForm] = Form.useForm();
  // 换人功能状态
  const [amendModalVisible, setAmendModalVisible] = useState(false);
  const [amendPolicy, setAmendPolicy] = useState<InsurancePolicy | null>(null);
  const [amendLoading, setAmendLoading] = useState(false);
  const [amendForm] = Form.useForm();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const canDeletePolicy =
    (currentUser?.role === '系统管理员' || currentUser?.role === 'admin' || currentUser?.role === '管理员') &&
    (currentUser?.name === '孙学博' || currentUser?.username === '孙学博');

  // 加载保单列表
  const loadPolicies = async () => {
    setLoading(true);
    try {
      const result = await insuranceService.getPolicies({
        status: statusFilter,
        page,
        limit: pageSize,
      });
      setPolicies(result.data);
      setTotal(result.total);
    } catch (error: any) {
      message.error(error.message || '加载保单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [page, pageSize, statusFilter]);

  // 查看详情
  const handleViewDetail = (record: InsurancePolicy) => {
    setSelectedPolicy(record);
    setDetailVisible(true);
  };

  // 打印保单
  const handlePrint = async (policyNo: string, event?: React.MouseEvent) => {
    // 阻止事件冒泡，防止重复触发
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    try {
      message.loading({ content: '正在下载保单...', key: 'download-policy' });

      const blob = await insuranceService.printPolicy({ policyNo });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `policy-${policyNo}.pdf`;
      document.body.appendChild(link);
      link.click();

      // 延迟清理，确保下载完成
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      message.success({ content: '保单PDF下载成功', key: 'download-policy' });
    } catch (error: any) {
      message.error({ content: error.message || '打印保单失败', key: 'download-policy' });
    }
  };

  // 注销保单
  const handleCancel = async (policyNo: string) => {
    try {
      const result = await insuranceService.cancelPolicy({ policyNo });
      if (result.Success === 'true') {
        message.success('保单注销成功');
        loadPolicies();
      } else {
        message.error(result.Message || '保单注销失败');
      }
    } catch (error: any) {
      message.error(error.message || '保单注销失败');
    }
  };

  // 同步状态（支持保单号或商户单号）
  const handleSync = async (identifier: string) => {
    try {
      await insuranceService.syncPolicyStatus(identifier);
      message.success('状态同步成功');
      loadPolicies();
    } catch (error: any) {
      message.error(error.message || '状态同步失败');
    }
  };

  const handleDeletePolicy = async (record: InsurancePolicy) => {
    try {
      if (!record?._id) {
        message.error('保单ID不存在');
        return;
      }
      const result = await insuranceService.deletePolicy(record._id);
      if (result?.success === false) {
        message.error(result.message || '保单删除失败');
        return;
      }
      message.success('保单删除成功');
      loadPolicies();
    } catch (error: any) {
      message.error(error.message || '保单删除失败');
    }
  };

  // 打开支付弹窗
  const handlePay = (record: InsurancePolicy) => {
    setPaymentPolicy(record);
    setPaymentModalVisible(true);
  };

  // 打开退保弹窗
  const handleOpenSurrender = (record: InsurancePolicy) => {
    setSurrenderPolicy(record);
    setSurrenderModalVisible(true);
    surrenderForm.resetFields();
  };

  const isDashubaoSuccess = (result?: { Success?: string | boolean }) => {
    return result?.Success === 'true' || result?.Success === true;
  };

  // 退保
  const handleSurrender = async () => {
    try {
      const values = await surrenderForm.validateFields();

      console.log('退保数据检查:', {
        surrenderPolicy,
        policyNo: surrenderPolicy?.policyNo,
        removeReason: values.removeReason
      });

      if (!surrenderPolicy?.policyNo) {
        message.error('保单号不存在');
        return;
      }

      const result = await insuranceService.surrenderPolicy({
        policyNo: surrenderPolicy.policyNo,
        removeReason: values.removeReason,
      });

      console.log('退保接口响应:', result);

      if (isDashubaoSuccess(result)) {
        message.success('退保成功');
        setSurrenderModalVisible(false);
        loadPolicies();
      } else {
        message.error(result.Message || '退保失败（接口未返回原因）');
      }
    } catch (error: any) {
      console.error('退保错误:', error);
      message.error(error.message || '退保失败');
    }
  };

  // 支付成功回调
  const handlePaymentSuccess = () => {
    setPaymentModalVisible(false);
    message.success('支付成功！');
    loadPolicies();
  };

  // 打开换人弹窗
  const handleOpenAmend = (record: InsurancePolicy) => {
    setAmendPolicy(record);
    setAmendModalVisible(true);
    // 预填原被保险人信息（默认取第一个被保险人）
    const oldInsured = record.insuredList?.[0];
    if (oldInsured) {
      amendForm.setFieldsValue({
        oldInsuredName: oldInsured.insuredName,
        oldIdType: oldInsured.idType,
        oldIdNumber: oldInsured.idNumber,
        newIdType: '1', // 默认身份证
        newGender: 'M', // 默认男
      });
    }
  };

  // 从身份证号提取出生日期和性别
  const extractInfoFromIdCard = (idNumber: string) => {
    if (!idNumber || idNumber.length !== 18) return null;
    const birthYear = idNumber.substring(6, 10);
    const birthMonth = idNumber.substring(10, 12);
    const birthDay = idNumber.substring(12, 14);
    const genderCode = parseInt(idNumber.substring(16, 17), 10);
    return {
      birthDate: `${birthYear}${birthMonth}${birthDay}000000`,
      gender: genderCode % 2 === 1 ? 'M' : 'F',
    };
  };

  // 处理新被保险人身份证变化
  const handleNewIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idNumber = e.target.value;
    const info = extractInfoFromIdCard(idNumber);
    if (info) {
      amendForm.setFieldsValue({
        newBirthDate: dayjs(info.birthDate.substring(0, 8), 'YYYYMMDD'),
        newGender: info.gender,
      });
    }
  };

  // 执行换人
  const handleAmend = async () => {
    try {
      const values = await amendForm.validateFields();

      if (!amendPolicy?.policyNo) {
        message.error('保单号不存在');
        return;
      }

      setAmendLoading(true);

      const oldInfoFromId = extractInfoFromIdCard(values.oldIdNumber);
      const fallbackOld = amendPolicy?.insuredList?.[0];
      const oldBirthDate = oldInfoFromId?.birthDate || fallbackOld?.birthDate;
      const oldGender = oldInfoFromId?.gender || fallbackOld?.gender;

      if (!oldBirthDate || !oldGender) {
        message.error('原被保险人出生日期或性别缺失，请核对证件信息');
        return;
      }

      // 构建请求数据
      const amendData = {
        policyNo: amendPolicy.policyNo,
        oldInsured: {
          insuredName: values.oldInsuredName,
          idType: values.oldIdType,
          idNumber: values.oldIdNumber,
          birthDate: oldBirthDate,
          gender: oldGender,
        },
        newInsured: {
          insuredName: values.newInsuredName,
          idType: values.newIdType,
          idNumber: values.newIdNumber,
          birthDate: values.newBirthDate?.format('YYYYMMDDHHmmss') || values.newBirthDate,
          gender: values.newGender,
          mobile: values.newMobile || undefined,
        },
      };

      console.log('换人请求数据:', amendData);

      const result = await insuranceService.amendPolicy(amendData);

      console.log('换人接口响应:', result);

      if (isDashubaoSuccess(result)) {
        message.success('换人成功！');
        setAmendModalVisible(false);
        amendForm.resetFields();
        loadPolicies();
      } else {
        message.error(result.Message || '换人失败（接口未返回原因）');
      }
    } catch (error: any) {
      console.error('换人错误:', error);
      message.error(error.message || '换人失败');
    } finally {
      setAmendLoading(false);
    }
  };

  // 格式化日期显示
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.length === 14) {
      return dayjs(dateStr, 'YYYYMMDDHHmmss').format('YYYY-MM-DD HH:mm');
    }
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
  };

  const columns: ColumnsType<InsurancePolicy> = [
    {
      title: '保单流水号',
      dataIndex: 'agencyPolicyRef',
      key: 'agencyPolicyRef',
      width: 180,
      ellipsis: true,
    },
    {
      title: '保单号',
      dataIndex: 'policyNo',
      key: 'policyNo',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '计划代码',
      dataIndex: 'planCode',
      key: 'planCode',
      width: 120,
    },
    {
      title: '被保险人',
      key: 'insured',
      width: 150,
      render: (_, record) => {
        const names = record.insuredList?.map(i => i.insuredName).join(', ');
        return (
          <Tooltip title={names}>
            <span>{record.insuredList?.[0]?.insuredName || '-'}</span>
            {record.insuredList?.length > 1 && <Tag style={{ marginLeft: 4 }}>+{record.insuredList.length - 1}</Tag>}
          </Tooltip>
        );
      },
    },
    {
      title: '总保费',
      dataIndex: 'totalPremium',
      key: 'totalPremium',
      width: 100,
      render: (val) => `¥${val?.toFixed(2) || '0.00'}`,
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 150,
      render: formatDate,
    },
    {
      title: '结束日期',
      dataIndex: 'expireDate',
      key: 'expireDate',
      width: 150,
      render: formatDate,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PolicyStatus) => {
        const statusInfo = POLICY_STATUS_MAP[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (val) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          {record.status === PolicyStatus.PENDING && (
            <Tooltip title="立即支付">
              <Button
                type="link"
                size="small"
                icon={<WechatOutlined />}
                style={{ color: '#07c160' }}
                onClick={() => handlePay(record)}
              />
            </Tooltip>
          )}
          {/* 同步状态按钮 - 始终显示 */}
          <Tooltip title="同步状态">
            <Button
              type="link"
              size="small"
              icon={<SyncOutlined />}
              onClick={() => handleSync(record.policyNo || record.agencyPolicyRef)}
            />
          </Tooltip>

          {record.policyNo && (
            <>
              <Tooltip title="下载保单">
                <Button
                  type="link"
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={(e) => handlePrint(record.policyNo!, e)}
                />
              </Tooltip>
              {(() => {
                // 如果保单已注销或已退保，不显示注销和换人按钮
                if (record.status === PolicyStatus.CANCELLED || record.status === PolicyStatus.SURRENDERED) {
                  return null;
                }

                // 判断保单是否已生效（根据生效日期）
                const now = new Date();
                const effectiveDate = record.effectiveDate
                  ? new Date(
                      parseInt(record.effectiveDate.substring(0, 4)),
                      parseInt(record.effectiveDate.substring(4, 6)) - 1,
                      parseInt(record.effectiveDate.substring(6, 8)),
                      parseInt(record.effectiveDate.substring(8, 10) || '0'),
                      parseInt(record.effectiveDate.substring(10, 12) || '0'),
                      parseInt(record.effectiveDate.substring(12, 14) || '0')
                    )
                  : null;

                const isEffective = effectiveDate ? now >= effectiveDate : false;

                // 🆕 生效前和生效后都可以换人
                return (
                  <>
                    {/* 未生效：显示注销按钮 */}
                    {!isEffective && (
                      <Popconfirm
                        title="确定要注销此保单吗？"
                        onConfirm={() => handleCancel(record.policyNo!)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Tooltip title="注销保单（未生效）">
                          <Button type="link" size="small" danger icon={<CloseCircleOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    )}

                    {/* 换人按钮：生效前和生效后都可以换人 */}
                    <Tooltip title={isEffective ? "换人" : "换人（生效前）"}>
                      <Button
                        type="link"
                        size="small"
                        icon={<SwapOutlined />}
                        style={{ color: '#722ed1' }}
                        onClick={() => handleOpenAmend(record)}
                      />
                    </Tooltip>
                  </>
                );
              })()}
            </>
          )}
          {canDeletePolicy && (
            <Popconfirm
              title="确定要删除此保单记录吗？"
              description="此操作仅删除本地记录，不会影响大树保平台"
              onConfirm={() => handleDeletePolicy(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除保单记录">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="保单管理"
      subTitle="管理所有保险保单"
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/insurance/create')}
        >
          新建投保
        </Button>,
      ]}
    >
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="保单状态"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            {Object.entries(POLICY_STATUS_MAP).map(([key, val]) => (
              <Option key={key} value={key}>{val.text}</Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadPolicies}>
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={policies}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="保单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedPolicy && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="保单流水号">{selectedPolicy.agencyPolicyRef}</Descriptions.Item>
            <Descriptions.Item label="保单号">{selectedPolicy.policyNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="计划代码">{selectedPolicy.planCode}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={POLICY_STATUS_MAP[selectedPolicy.status]?.color}>
                {POLICY_STATUS_MAP[selectedPolicy.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="总保费">¥{selectedPolicy.totalPremium?.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="被保险人数">{selectedPolicy.groupSize}</Descriptions.Item>
            <Descriptions.Item label="生效日期">{formatDate(selectedPolicy.effectiveDate)}</Descriptions.Item>
            <Descriptions.Item label="结束日期">{formatDate(selectedPolicy.expireDate)}</Descriptions.Item>
            <Descriptions.Item label="投保人" span={2}>
              {selectedPolicy.policyHolder?.policyHolderName} ({selectedPolicy.policyHolder?.policyHolderType === 'I' ? '个人' : '企业'})
            </Descriptions.Item>
            <Descriptions.Item label="被保险人" span={2}>
              {selectedPolicy.insuredList?.map((i, idx) => (
                <div key={idx}>
                  {i.insuredName} - {i.idNumber} ({i.gender === 'M' ? '男' : '女'})
                </div>
              ))}
            </Descriptions.Item>
            {selectedPolicy.serviceAddress && (
              <Descriptions.Item label="服务地址" span={2}>{selectedPolicy.serviceAddress}</Descriptions.Item>
            )}
            {selectedPolicy.remark && (
              <Descriptions.Item label="备注" span={2}>{selectedPolicy.remark}</Descriptions.Item>
            )}
            {selectedPolicy.policyPdfUrl && (
              <Descriptions.Item label="电子保单" span={2}>
                <a href={selectedPolicy.policyPdfUrl} target="_blank" rel="noopener noreferrer">
                  点击下载
                </a>
              </Descriptions.Item>
            )}
            {selectedPolicy.errorMessage && selectedPolicy.status !== 'active' && (
              <Descriptions.Item label="错误信息" span={2}>
                <span style={{ color: 'red' }}>{selectedPolicy.errorMessage}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 退保弹窗 */}
      <Modal
        title="退保申请"
        open={surrenderModalVisible}
        onOk={handleSurrender}
        onCancel={() => setSurrenderModalVisible(false)}
        okText="确认退保"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Form form={surrenderForm} layout="vertical">
          <Form.Item label="保单信息">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="保单号">{surrenderPolicy?.policyNo}</Descriptions.Item>
              <Descriptions.Item label="被保险人">
                {surrenderPolicy?.insuredList?.map(i => i.insuredName).join(', ')}
              </Descriptions.Item>
              <Descriptions.Item label="总保费">¥{surrenderPolicy?.totalPremium?.toFixed(2)}</Descriptions.Item>
            </Descriptions>
          </Form.Item>
          <Form.Item
            name="removeReason"
            label="退保原因"
            rules={[{ required: true, message: '请选择退保原因' }]}
          >
            <Radio.Group>
              <Radio value="13">退票退保</Radio>
              <Radio value="14">航班取消</Radio>
              <Radio value="15">航班改签</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* 换人弹窗 */}
      <Modal
        title="保险换人"
        open={amendModalVisible}
        onOk={handleAmend}
        onCancel={() => {
          setAmendModalVisible(false);
          amendForm.resetFields();
        }}
        okText="确认换人"
        cancelText="取消"
        confirmLoading={amendLoading}
        width={600}
      >
        <Form form={amendForm} layout="vertical">
          <Form.Item label="保单信息">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="保单号">{amendPolicy?.policyNo}</Descriptions.Item>
              <Descriptions.Item label="生效日期">
                {amendPolicy?.effectiveDate ? dayjs(amendPolicy.effectiveDate, 'YYYYMMDDHHmmss').format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="结束日期">
                {amendPolicy?.expireDate ? dayjs(amendPolicy.expireDate, 'YYYYMMDDHHmmss').format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Form.Item>

          <Card title="原被保险人信息" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="oldInsuredName"
              label="姓名"
              rules={[{ required: true, message: '请输入原被保险人姓名' }]}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="oldIdType"
              label="证件类型"
              rules={[{ required: true, message: '请选择证件类型' }]}
            >
              <Select disabled>
                {ID_TYPE_OPTIONS.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="oldIdNumber"
              label="证件号码"
              rules={[{ required: true, message: '请输入证件号码' }]}
            >
              <Input disabled />
            </Form.Item>
          </Card>

          <Card title="新被保险人信息" size="small" type="inner" style={{ borderColor: '#722ed1' }}>
            <Form.Item
              name="newInsuredName"
              label="姓名"
              rules={[{ required: true, message: '请输入新被保险人姓名' }]}
            >
              <Input placeholder="请输入新被保险人姓名" />
            </Form.Item>
            <Form.Item
              name="newIdType"
              label="证件类型"
              rules={[{ required: true, message: '请选择证件类型' }]}
            >
              <Select placeholder="请选择证件类型">
                {ID_TYPE_OPTIONS.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="newIdNumber"
              label="证件号码"
              rules={[{ required: true, message: '请输入证件号码' }]}
            >
              <Input
                placeholder="请输入身份证号（自动识别出生日期和性别）"
                onChange={handleNewIdCardChange}
              />
            </Form.Item>
            <Form.Item
              name="newBirthDate"
              label="出生日期"
              rules={[{ required: true, message: '请选择出生日期' }]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="选择出生日期" />
            </Form.Item>
            <Form.Item
              name="newGender"
              label="性别"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Radio.Group>
                {GENDER_OPTIONS.map(opt => (
                  <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
                ))}
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="newMobile"
              label="手机号"
            >
              <Input placeholder="请输入手机号（可选）" />
            </Form.Item>
          </Card>
        </Form>
      </Modal>

      {/* 支付弹窗 */}
      {paymentPolicy && (
        <WechatPayModal
          visible={paymentModalVisible}
          policyNo={paymentPolicy.policyNo || ''}
          agencyPolicyRef={paymentPolicy.agencyPolicyRef || ''}
          totalPremium={paymentPolicy.totalPremium || 0}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setPaymentModalVisible(false)}
        />
      )}
    </PageContainer>
  );
};

export default InsuranceList;

