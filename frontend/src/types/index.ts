// 重新導出共用類型
export * from '../../../shared/types';

// 前端特定類型
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  protected?: boolean;
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  children?: MenuItem[];
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface UploadFile {
  uid: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  response?: any;
  error?: any;
  progress?: number;
}

export interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  render?: (value: any, record: any) => React.ReactNode;
  sorter?: boolean;
  filters?: Array<{ text: string; value: string }>;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}