import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { checkAuth } from './store/slices/authSlice';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import DocumentManagement from './pages/document/DocumentManagement';
import AIAnalysis from './pages/AIAnalysis';
import CrawlerCenter from './pages/crawler/CrawlerCenter';
import KnowledgeBase from './pages/knowledge/KnowledgeBase';
import Settings from './pages/Settings';
import LoadingSpinner from './components/common/LoadingSpinner';

const { Content } = Layout;

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector(state => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <LoadingSpinner size="large" />
        </Content>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* Documents route redirects to AI analysis */}
        <Route path="/documents/*" element={<Navigate to="/ai-analysis" replace />} />
        <Route path="/ai-analysis" element={<AIAnalysis />} />
        <Route path="/document-management" element={<DocumentManagement />} />
        <Route path="/crawler/*" element={<CrawlerCenter />} />
        <Route path="/knowledge/*" element={<KnowledgeBase />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
};

export default App;