import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CrawlerManager from '../CrawlerManager';

const CrawlerCenter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CrawlerManager />} />
      <Route path="*" element={<CrawlerManager />} />
    </Routes>
  );
};

export default CrawlerCenter;