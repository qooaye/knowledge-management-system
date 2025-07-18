import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login, register, clearError } from '../../store/slices/authSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      if (isRegisterMode) {
        await dispatch(register(values)).unwrap();
      } else {
        await dispatch(login(values)).unwrap();
      }
    } catch (error) {
      // 錯誤已經在 Redux 中處理
    }
  };

  const switchMode = () => {
    setIsRegisterMode(!isRegisterMode);
    form.resetFields();
    dispatch(clearError());
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            知識管理系統
          </Title>
          <Text type="secondary">
            {isRegisterMode ? '創建新帳戶' : '登入到您的帳戶'}
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch(clearError())}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          name="auth"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '請輸入電子郵件' },
              { type: 'email', message: '請輸入有效的電子郵件' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="電子郵件"
              autoComplete="email"
            />
          </Form.Item>

          {isRegisterMode && (
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '請輸入用戶名' },
                { min: 3, message: '用戶名至少需要 3 個字符' },
                { max: 50, message: '用戶名不能超過 50 個字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用戶名"
                autoComplete="username"
              />
            </Form.Item>
          )}

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '請輸入密碼' },
              ...(isRegisterMode
                ? [
                    { min: 8, message: '密碼至少需要 8 個字符' },
                    {
                      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                      message: '密碼必須包含大小寫字母、數字和特殊字符',
                    },
                  ]
                : []),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密碼"
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            />
          </Form.Item>

          {isRegisterMode && (
            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '請確認密碼' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('兩次輸入的密碼不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="確認密碼"
                autoComplete="new-password"
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              {isRegisterMode ? '註冊' : '登入'}
            </Button>
          </Form.Item>

          <Divider />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              {isRegisterMode ? '已有帳戶？' : '沒有帳戶？'}
            </Text>
            <Button type="link" onClick={switchMode} style={{ padding: 0, marginLeft: 8 }}>
              {isRegisterMode ? '立即登入' : '立即註冊'}
            </Button>
          </div>

          {!isRegisterMode && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/forgot-password">忘記密碼？</Link>
            </div>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default Login;