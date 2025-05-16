import React from 'react';
import { Form, Input } from 'antd';
// import AmapAddressAutocomplete from './AmapAddressAutocomplete';

// 定义表单字段组件
const AddressFields: React.FC = () => {
  return (
    <>
      <Form.Item
        label="服务区域"
        name="serviceArea"
        rules={[{ required: true, message: '请输入服务区域' }]}
      >
        <Input placeholder="请输入服务区域" />
      </Form.Item>

      <Form.Item
        label="现居住地址"
        name="currentAddress"
        rules={[{ required: true, message: '请输入现居住地址' }]}
      >
        <Input placeholder="请输入现居住地址" />
      </Form.Item>
    </>
  );
};

export default AddressFields; 