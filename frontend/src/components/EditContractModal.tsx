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
} from 'antd';
import { contractService } from '../services/contractService';
import { Contract, CreateContractData, CONTRACT_TYPES } from '../types/contract.types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface EditContractModalProps {
  visible: boolean;
  contract: Contract;
  onCancel: () => void;
  onSuccess: () => void;
}

const EditContractModal: React.FC<EditContractModalProps> = ({
  visible,
  contract,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && contract) {
      // 预填充合同信息
      form.setFieldsValue({
        customerName: contract.customerName,
        customerPhone: contract.customerPhone,
        customerIdCard: contract.customerIdCard || '',
        contractType: contract.contractType,
        startDate: dayjs(contract.startDate),
        endDate: dayjs(contract.endDate),
        workerName: contract.workerName,
        workerPhone: contract.workerPhone,
        workerIdCard: contract.workerIdCard,
        workerSalary: contract.workerSalary,
        customerServiceFee: contract.customerServiceFee,
        workerServiceFee: contract.workerServiceFee,
        deposit: contract.deposit,
        finalPayment: contract.finalPayment,
        expectedDeliveryDate: contract.expectedDeliveryDate ? dayjs(contract.expectedDeliveryDate) : null,
        salaryPaymentDay: contract.salaryPaymentDay,
        monthlyWorkDays: contract.monthlyWorkDays,
        remarks: contract.remarks,
      });
    }
  }, [visible, contract, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const contractData: Partial<CreateContractData> = {
        ...values,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        expectedDeliveryDate: values.expectedDeliveryDate 
          ? values.expectedDeliveryDate.format('YYYY-MM-DD') 
          : undefined,
      };

      await contractService.updateContract(contract._id, contractData);
      message.success('合同更新成功！');
      onSuccess();
      handleCancel();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '合同更新失败');
      console.error('合同更新失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="编辑合同"
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
              <Input placeholder="客户姓名" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="客户手机号"
              name="customerPhone"
              rules={[{ required: true, message: '请输入客户手机号' }]}
            >
              <Input placeholder="客户手机号" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="客户身份证号"
              name="customerIdCard"
            >
              <Input placeholder="客户身份证号" />
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

        {/* 服务人员信息 */}
        <Divider orientation="left">服务人员信息</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="劳动者姓名"
              name="workerName"
              rules={[{ required: true, message: '请输入劳动者姓名' }]}
            >
              <Input placeholder="劳动者姓名" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="劳动者电话"
              name="workerPhone"
              rules={[{ required: true, message: '请输入劳动者电话' }]}
            >
              <Input placeholder="劳动者电话" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="劳动者身份证号"
              name="workerIdCard"
              rules={[{ required: true, message: '请输入劳动者身份证号' }]}
            >
              <Input placeholder="劳动者身份证号" />
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
              更新合同
            </Button>
          </Space>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditContractModal; 