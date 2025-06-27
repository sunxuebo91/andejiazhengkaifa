// 前端集成示例：创建合同页面的换人功能集成
// 这个文件展示了如何在 React 组件中集成换人功能

import React, { useState, useEffect } from 'react';
import { contractService } from '@/services/contractService';
import { message, DatePicker, Input, Select, Button, Card, Alert, Form } from 'antd';
import moment from 'moment';

const CreateContractPage = () => {
  const [form] = Form.useForm();
  const [isChangeWorkerMode, setIsChangeWorkerMode] = useState(false);
  const [existingContract, setExistingContract] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 客户选择处理
  const handleCustomerSelect = async (customerPhone) => {
    try {
      setLoading(true);
      
      // 检查客户是否有现有合同
      console.log('🔍 检查客户现有合同:', customerPhone);
      const result = await contractService.checkCustomerContract(customerPhone);
      
      if (result.success && result.data.hasContract) {
        // 进入换人模式
        const contract = result.data.contract;
        setExistingContract(contract);
        setIsChangeWorkerMode(true);
        
        // 自动计算新合同时间
        const currentDate = moment();
        const originalEndDate = moment(contract.endDate);
        
        // 计算已服务天数
        const startDate = moment(contract.startDate);
        const serviceDays = currentDate.diff(startDate, 'days');
        
        // 设置表单值
        form.setFieldsValue({
          customerName: contract.customerName,
          customerPhone: contract.customerPhone,
          customerAddress: contract.customerAddress,
          salary: contract.salary,
          startDate: currentDate, // 新合同从今天开始
          endDate: originalEndDate, // 保持原结束日期
          // 其他客户信息保持不变
        });
        
        // 锁定时间字段
        form.getFieldInstance('startDate')?.input?.setAttribute('disabled', 'disabled');
        form.getFieldInstance('endDate')?.input?.setAttribute('disabled', 'disabled');
        
        message.info(
          `检测到现有合同，已进入换人模式。${contract.workerName}已服务${serviceDays}天，新合同将从今天开始。`
        );
        
      } else {
        // 正常创建模式
        setIsChangeWorkerMode(false);
        setExistingContract(null);
        console.log('✅ 客户无现有合同，正常创建模式');
      }
      
    } catch (error) {
      console.error('❌ 检查客户合同失败:', error);
      message.error('检查客户合同失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 表单提交处理
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      if (isChangeWorkerMode && existingContract) {
        // 换人合同创建
        console.log('🔄 创建换人合同:', values);
        
        const changeData = {
          newWorkerName: values.workerName,
          newWorkerPhone: values.workerPhone,
          newWorkerIdCard: values.workerIdCard,
          newSalary: values.salary,
          // 其他需要的字段...
        };
        
        const result = await contractService.createChangeWorkerContract(
          existingContract._id,
          changeData
        );
        
        if (result.success) {
          message.success('换人合同创建成功！');
          
          // 可选：跳转到爱签签约页面
          const signUrl = result.data.signUrl;
          if (signUrl) {
            window.open(signUrl, '_blank');
          }
          
          // 重置表单或跳转
          form.resetFields();
          setIsChangeWorkerMode(false);
          setExistingContract(null);
          
        } else {
          message.error(result.message || '换人合同创建失败');
        }
        
      } else {
        // 正常合同创建
        console.log('📝 创建新合同:', values);
        
        const result = await contractService.createContract(values);
        
        if (result.success) {
          message.success('合同创建成功！');
          form.resetFields();
        } else {
          message.error(result.message || '合同创建失败');
        }
      }
      
    } catch (error) {
      console.error('❌ 提交失败:', error);
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 查看客户合同历史
  const viewCustomerHistory = async () => {
    if (!existingContract) return;
    
    try {
      const result = await contractService.getCustomerHistory(existingContract.customerPhone);
      
      if (result.success) {
        // 这里可以打开一个模态框显示历史记录
        console.log('📖 客户合同历史:', result.data);
        
        // 示例：创建历史记录显示
        const historyText = result.data.contracts.map((contract, index) => 
          `${index + 1}. ${contract.workerName} (${contract.status}) - ${contract.startDate} 至 ${contract.endDate}`
        ).join('\n');
        
        message.info({
          content: (
            <div>
              <p>客户合同历史：</p>
              <pre style={{ fontSize: '12px', margin: 0 }}>{historyText}</pre>
            </div>
          ),
          duration: 10
        });
      }
    } catch (error) {
      console.error('❌ 获取历史失败:', error);
      message.error('获取客户历史失败');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>创建合同</h1>
      
      {/* 换人模式提示 */}
      {isChangeWorkerMode && existingContract && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
          message="换人模式"
          description={
            <div>
              <p>检测到客户已有合同，正在为以下合同换人：</p>
              <ul>
                <li>当前服务人员：{existingContract.workerName}</li>
                <li>合同期间：{existingContract.startDate} 至 {existingContract.endDate}</li>
                <li>已服务天数：{moment().diff(moment(existingContract.startDate), 'days')} 天</li>
              </ul>
              <Button type="link" onClick={viewCustomerHistory}>
                查看客户完整合同历史
              </Button>
            </div>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* 客户信息 */}
        <Card title="客户信息" style={{ marginBottom: '24px' }}>
          <Form.Item
            label="客户姓名"
            name="customerName"
            rules={[{ required: true, message: '请输入客户姓名' }]}
          >
            <Input placeholder="请输入客户姓名" />
          </Form.Item>
          
          <Form.Item
            label="客户手机号"
            name="customerPhone"
            rules={[{ required: true, message: '请输入客户手机号' }]}
          >
            <Input 
              placeholder="请输入客户手机号"
              onBlur={(e) => handleCustomerSelect(e.target.value)}
            />
          </Form.Item>
          
          <Form.Item
            label="客户地址"
            name="customerAddress"
            rules={[{ required: true, message: '请输入客户地址' }]}
          >
            <Input placeholder="请输入客户地址" />
          </Form.Item>
        </Card>

        {/* 服务人员信息 */}
        <Card title={isChangeWorkerMode ? "新服务人员信息" : "服务人员信息"} style={{ marginBottom: '24px' }}>
          <Form.Item
            label="阿姨姓名"
            name="workerName"
            rules={[{ required: true, message: '请输入阿姨姓名' }]}
          >
            <Input placeholder="请输入阿姨姓名" />
          </Form.Item>
          
          <Form.Item
            label="阿姨手机号"
            name="workerPhone"
            rules={[{ required: true, message: '请输入阿姨手机号' }]}
          >
            <Input placeholder="请输入阿姨手机号" />
          </Form.Item>
          
          <Form.Item
            label="身份证号"
            name="workerIdCard"
            rules={[{ required: true, message: '请输入身份证号' }]}
          >
            <Input placeholder="请输入身份证号" />
          </Form.Item>
        </Card>

        {/* 合同信息 */}
        <Card title="合同信息" style={{ marginBottom: '24px' }}>
          <Form.Item
            label="月工资"
            name="salary"
            rules={[{ required: true, message: '请输入月工资' }]}
          >
            <Input type="number" placeholder="请输入月工资" addonAfter="元" />
          </Form.Item>
          
          <Form.Item
            label="开始日期"
            name="startDate"
            rules={[{ required: true, message: '请选择开始日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              disabled={isChangeWorkerMode} // 换人模式下锁定
              placeholder={isChangeWorkerMode ? "自动计算（今天）" : "请选择开始日期"}
            />
          </Form.Item>
          
          <Form.Item
            label="结束日期"
            name="endDate"
            rules={[{ required: true, message: '请选择结束日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              disabled={isChangeWorkerMode} // 换人模式下锁定
              placeholder={isChangeWorkerMode ? "自动继承原合同结束日期" : "请选择结束日期"}
            />
          </Form.Item>
          
          {isChangeWorkerMode && (
            <Alert
              type="warning"
              showIcon
              message="时间说明"
              description="换人模式下，开始时间自动设为今天，结束时间继承原合同，确保服务不中断。"
              style={{ marginTop: '12px' }}
            />
          )}
        </Card>

        {/* 提交按钮 */}
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            size="large" 
            loading={loading}
            block
          >
            {isChangeWorkerMode ? '创建换人合同' : '创建合同'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateContractPage;

// 使用说明和集成要点：
/*
1. 智能识别：
   - 用户输入客户手机号后自动检查是否有现有合同
   - 如果有，自动进入换人模式

2. 自动计算：
   - 换人模式下自动计算时间
   - 新合同开始时间 = 当前日期
   - 新合同结束时间 = 原合同结束时间

3. 用户体验：
   - 清晰的换人模式提示
   - 锁定时间字段避免用户误操作
   - 显示原合同信息和已服务天数

4. 数据安全：
   - 表单验证确保数据完整性
   - 错误处理和用户反馈
   - 操作确认和状态提示

5. 扩展功能：
   - 查看客户合同历史
   - 直接跳转爱签签约
   - 与现有业务流程无缝集成
*/ 