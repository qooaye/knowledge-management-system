import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DocumentsPage from '../documents/DocumentsPage';

const DocumentManagement: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<DocumentsPage />} />
      <Route path="*" element={<Navigate to="/documents" replace />} />
    </Routes>
  );
};

export default DocumentManagement;