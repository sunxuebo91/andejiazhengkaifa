import React from 'react';
import './mobile.css';

interface MobileLayoutProps {
  title?: string;
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

/**
 * 移动端布局组件
 * 用于小程序 WebView 内嵌的 H5 页面
 */
const MobileLayout: React.FC<MobileLayoutProps> = ({
  title = '电子合同',
  children,
  showBack = false,
  onBack
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="mobile-layout">
      {/* 顶部导航栏 */}
      <div className="mobile-header">
        {showBack && (
          <div className="mobile-header-back" onClick={handleBack}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </div>
        )}
        <div className="mobile-header-title">{title}</div>
        <div className="mobile-header-right" />
      </div>

      {/* 内容区域 */}
      <div className="mobile-content">
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;

