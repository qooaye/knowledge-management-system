import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const SimpleLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        // 簡單的本地存儲
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('accessToken', data.data.tokens.accessToken);
        
        message.success('登入成功！');
        
        // 直接跳轉到主頁面
        window.location.href = '/dashboard';
      } else {
        message.error(data.message || '登入失敗');
      }
    } catch (error) {
      message.error('登入失敗，請檢查網絡連接');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { email: string; password: string; username: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        message.success('註冊成功！請登入');
      } else {
        message.error(data.message || '註冊失敗');
      }
    } catch (error) {
      message.error('註冊失敗，請檢查網絡連接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f0f2f5'
    }}>
      <Card title="知識管理系統" style={{ width: 400 }}>
        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '請輸入電子郵件!' },
              { type: 'email', message: '請輸入有效的電子郵件!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="電子郵件" 
              defaultValue="test@example.com"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '請輸入密碼!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="密碼" 
              defaultValue="password123"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ width: '100%' }}
            >
              登入
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p>測試帳號：test@example.com</p>
          <p>密碼：password123</p>
        </div>
      </Card>
    </div>
  );
};

export default SimpleLogin;