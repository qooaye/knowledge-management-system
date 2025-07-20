import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import SimpleApp from './SimpleApp';
import './index.css';

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhTW}>
      <SimpleApp />
    </ConfigProvider>
  </React.StrictMode>
);