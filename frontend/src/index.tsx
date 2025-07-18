import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { store } from './store';
import App from './App';
import './index.css';

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider locale={zhTW}>
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);