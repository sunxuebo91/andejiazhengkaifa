import React, { memo, useEffect, useState } from 'react';
import { Alert, Input } from 'antd';
import type { InputRef } from 'antd';
import styles from './BaiduMapCard.module.css';

interface BaiduMapCardProps {
  value?: string;
  onChange?: (value: string) => void;
}

const BaiduMapCard = memo(({ value, onChange }: BaiduMapCardProps) => {
  const [address, setAddress] = useState<string>(value || '');

  useEffect(() => {
    setAddress(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setAddress(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div className={styles.baiduMapCard}>
      <Alert
        type="warning"
        showIcon
        message="地图功能已禁用"
        description="百度地图商用授权未完成，地图选点和地址联想已停用。请手动填写服务区域。"
        style={{ marginBottom: 12 }}
      />
      <div className={styles.mapSearch}>
        <Input
          placeholder="请输入服务区域"
          value={address}
          onChange={handleChange}
          ref={undefined as unknown as React.Ref<InputRef>}
        />
      </div>
      <div className={styles.mapContainer} style={{ display: 'none' }} />
    </div>
  );
});

BaiduMapCard.displayName = 'BaiduMapCard';

export default BaiduMapCard;
