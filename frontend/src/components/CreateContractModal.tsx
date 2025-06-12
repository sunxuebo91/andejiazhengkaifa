import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Row,
  Col,
  Space,
  Divider,
  Table,
  Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { contractService } from '../services/contractService';
import { CreateContractData, CONTRACT_TYPES, Worker } from '../types/contract.types';
import { Customer } from '../types/customer.types';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface CreateContractModalProps {
  visible: boolean;
  customer: Customer;
  onCancel: () => void;
  onSuccess: (contractId: string) => void;
}

const CreateContractModal: React.FC<CreateContractModalProps> = ({
  visible,
  customer,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [searchPhone, setSearchPhone] = useState('');

  useEffect(() => {
    if (visible && customer) {
      // 预填充客户信息
      form.setFieldsValue({
        customerName: customer.name,
        customerPhone: customer.phone,
        customerIdCard: customer.idCardNumber || '',
      });
    }
  }, [visible, customer, form]);

  const handleSearchWorkers = async () => {
    if (!searchPhone.trim()) {
      message.warning('请输入手机号进行搜索');
      return;
    }

    setSearchLoading(true);
    try {
      const result = await contractService.searchWorkers(searchPhone);
      console.log('搜索结果:', result);
      console.log('第一个结果的idNumber:', result[0]?.idNumber);
      setWorkers(result);
      if (result.length === 0) {
        message.info('未找到匹配的服务人员');
      }
    } catch (error: any) {
      message.error('搜索服务人员失败');
      console.error('搜索服务人员失败:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    form.setFieldsValue({
      workerName: worker.name,
      workerPhone: worker.phone,
      workerIdCard: worker.idNumber,
    });
    setWorkers([]); // 清空搜索结果
    setSearchPhone(''); // 清空搜索框
  };

  const handleSubmit = async (values: any) => {
    if (!selectedWorker) {
      message.error('请选择服务人员');
      return;
    }

    setLoading(true);
    try {
      const contractData: CreateContractData = {
        ...values,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        expectedDeliveryDate: values.expectedDeliveryDate 
          ? values.expectedDeliveryDate.format('YYYY-MM-DD') 
          : undefined,
        customerId: customer._id,
        workerId: selectedWorker._id,
      };

      const contract = await contractService.createContract(contractData);
      message.success('合同创建成功！');
      onSuccess(contract._id);
      handleCancel();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '合同创建失败');
      console.error('合同创建失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedWorker(null);
    setWorkers([]);
    setSearchPhone('');
    onCancel();
  };

  const workerColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '身份证号',
      dataIndex: 'idNumber',
      key: 'idNumber',
      render: (text: string) => text ? `${text.slice(0, 6)}****${text.slice(-4)}` : '',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '工种',
      dataIndex: 'jobType',
      key: 'jobType',
    },
    {
      title: '籍贯',
      dataIndex: 'nativePlace',
      key: 'nativePlace',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Worker) => (
        <Button type="primary" size="small" onClick={() => handleSelectWorker(record)}>
          选择
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="发起合同"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1000}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {/* 客户信息 */}
        <Divider orientation="left">客户信息</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="客户姓名"
              name="customerName"
              rules={[{ required: true, message: '请输入客户姓名' }]}
            >
              <Input placeholder="客户姓名" disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="客户手机号"
              name="customerPhone"
              rules={[{ required: true, message: '请输入客户手机号' }]}
            >
              <Input placeholder="客户手机号" disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="客户身份证号"
              name="customerIdCard"
            >
              <Input placeholder="客户身份证号" disabled />
            </Form.Item>
          </Col>
        </Row>

        {/* 合同信息 */}
        <Divider orientation="left">合同信息</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="合同类型"
              name="contractType"
              rules={[{ required: true, message: '请选择合同类型' }]}
            >
              <Select placeholder="请选择合同类型">
                {CONTRACT_TYPES.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="开始时间"
              name="startDate"
              rules={[{ required: true, message: '请选择开始时间' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="结束时间"
              name="endDate"
              rules={[{ required: true, message: '请选择结束时间' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* 服务人员搜索 */}
        <Divider orientation="left">服务人员</Divider>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={16}>
            <Input
              placeholder="输入手机号搜索服务人员"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onPressEnter={handleSearchWorkers}
            />
          </Col>
          <Col span={8}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearchWorkers}
              loading={searchLoading}
            >
              搜索简历库
            </Button>
          </Col>
        </Row>

        {/* 搜索结果 */}
        {workers.length > 0 && (
          <Table
            columns={workerColumns}
            dataSource={workers}
            rowKey="_id"
            size="small"
            pagination={false}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 已选择的服务人员信息 */}
        {selectedWorker && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
            <Text strong>已选择服务人员：</Text>
            <Text>{selectedWorker.name} - {selectedWorker.phone}</Text>
          </div>
        )}

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="劳动者姓名"
              name="workerName"
              rules={[{ required: true, message: '请输入劳动者姓名' }]}
            >
              <Input placeholder="劳动者姓名" disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="劳动者电话"
              name="workerPhone"
              rules={[{ required: true, message: '请输入劳动者电话' }]}
            >
              <Input placeholder="劳动者电话" disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="劳动者身份证号"
              name="workerIdCard"
              rules={[{ required: true, message: '请输入劳动者身份证号' }]}
            >
              <Input placeholder="选择服务人员后自动填充" />
            </Form.Item>
          </Col>
        </Row>

        {/* 费用信息 */}
        <Divider orientation="left">费用信息</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="家政员工资"
              name="workerSalary"
              rules={[{ required: true, message: '请输入家政员工资' }]}
            >
              <InputNumber
                placeholder="家政员工资"
                style={{ width: '100%' }}
                min={0}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => parseFloat(value?.replace(/¥\s?|(,*)/g, '') || '0') || 0}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="客户服务费"
              name="customerServiceFee"
              rules={[{ required: true, message: '请输入客户服务费' }]}
            >
              <InputNumber
                placeholder="客户服务费"
                style={{ width: '100%' }}
                min={0}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => parseFloat(value?.replace(/¥\s?|(,*)/g, '') || '0') || 0}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="家政员服务费（选填）"
              name="workerServiceFee"
            >
              <InputNumber
                placeholder="家政员服务费"
                style={{ width: '100%' }}
                min={0}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => parseFloat(value?.replace(/¥\s?|(,*)/g, '') || '0') || 0}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="约定定金（选填）"
              name="deposit"
            >
              <InputNumber
                placeholder="约定定金"
                style={{ width: '100%' }}
                min={0}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => parseFloat(value?.replace(/¥\s?|(,*)/g, '') || '0') || 0}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="约定尾款（选填）"
              name="finalPayment"
            >
              <InputNumber
                placeholder="约定尾款"
                style={{ width: '100%' }}
                min={0}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => parseFloat(value?.replace(/¥\s?|(,*)/g, '') || '0') || 0}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="预产期（选填）"
              name="expectedDeliveryDate"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* 其他信息 */}
        <Divider orientation="left">其他信息</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="工资发放日（选填）"
              name="salaryPaymentDay"
            >
              <InputNumber
                placeholder="工资发放日"
                style={{ width: '100%' }}
                min={1}
                max={31}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="月工作天数（选填）"
              name="monthlyWorkDays"
            >
              <InputNumber
                placeholder="月工作天数"
                style={{ width: '100%' }}
                min={1}
                max={31}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="备注（选填）"
              name="remarks"
            >
              <TextArea
                placeholder="请输入备注信息"
                rows={3}
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 提交按钮 */}
        <Row justify="end">
          <Space>
            <Button onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建合同
            </Button>
          </Space>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateContractModal; 