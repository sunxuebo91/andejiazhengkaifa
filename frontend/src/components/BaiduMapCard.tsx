import React, { useEffect, useState } from 'react';
import { Alert, Card, Form, Input } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

interface BaiduMapCardProps {
  value?: string;
  onChange?: (value: string) => void;
}

const BaiduMapCard: React.FC<BaiduMapCardProps> = ({ value, onChange }) => {
  const [address, setAddress] = useState<string>(value || '');

  useEffect(() => {
    setAddress(value || '');
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setAddress(nextValue);
    onChange?.(nextValue);
  };

  return (
    <Card size="small">
      <Alert
        type="warning"
        showIcon
        message="地图功能已禁用"
        description="百度地图商用授权未完成，地图选点和地址联想已停用。请手动填写服务区域。"
        style={{ marginBottom: 16 }}
      />
      <Form.Item style={{ marginBottom: 0 }}>
        <Input
          prefix={<EnvironmentOutlined />}
          placeholder="请输入服务区域，例如：北京市朝阳区"
          value={address}
          onChange={handleChange}
        />
      </Form.Item>
    </Card>
  );
};

export default BaiduMapCard;
