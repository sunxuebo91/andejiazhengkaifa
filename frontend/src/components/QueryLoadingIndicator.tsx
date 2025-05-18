import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';

const QueryLoadingIndicator = () => {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [showLoading, setShowLoading] = useState(false);
  
  useEffect(() => {
    // 当有请求或变更操作时启动定时器
    if (isFetching > 0 || isMutating > 0) {
      // 延迟显示加载状态，避免短暂请求导致闪烁
      const timer = setTimeout(() => setShowLoading(true), 800);
      return () => clearTimeout(timer);
    } else {
      // 当请求完成后延迟隐藏，避免快速切换时的闪烁
      const timer = setTimeout(() => setShowLoading(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isFetching, isMutating]);
  
  if (!showLoading) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      padding: '8px 16px',
      background: 'rgba(0, 0, 0, 0.65)',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      color: 'white',
    }}>
      <Spin size="small" style={{ marginRight: 8 }} />
      <span>数据加载中...</span>
    </div>
  );
};

export default QueryLoadingIndicator; 