import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  spinning?: boolean;
  children?: React.ReactNode;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  tip = 'Loading...',
  spinning = true,
  children,
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  if (children) {
    return (
      <Spin spinning={spinning} tip={tip} indicator={antIcon}>
        {children}
      </Spin>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
      }}
    >
      <Spin size={size} tip={tip} indicator={antIcon} />
    </div>
  );
};

export default LoadingSpinner;