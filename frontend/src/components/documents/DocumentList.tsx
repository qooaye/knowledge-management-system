import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Typography,
  Card,
  Dropdown,
  Modal,
  message,
  Progress,
  Tooltip,
  Empty,
  Pagination,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchDocuments,
  deleteDocument,
  getDocumentDownloadUrl,
  setFilters,
  clearError,
  DocumentStatus,
  Document,
  selectDocuments,
  selectDocumentLoading,
  selectDocumentError,
  selectDocumentPagination,
  selectDocumentFilters,
} from '../../store/slices/documentSlice';
import { formatFileSize, formatDate } from '../../utils/format';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;
const { confirm } = Modal;

interface DocumentListProps {
  showUploadButton?: boolean;
  onUploadClick?: () => void;
  onDocumentClick?: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  showUploadButton = true,
  onUploadClick,
  onDocumentClick,
}) => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector(selectDocuments);
  const loading = useAppSelector(selectDocumentLoading);
  const error = useAppSelector(selectDocumentError);
  const pagination = useAppSelector(selectDocumentPagination);
  const filters = useAppSelector(selectDocumentFilters);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    dispatch(fetchDocuments(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSearch = (value: string) => {
    dispatch(setFilters({ ...filters, search: value, page: 1 }));
  };

  const handleFilterChange = (key: string, value: any) => {
    dispatch(setFilters({ ...filters, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    dispatch(setFilters({ ...filters, page, limit: pageSize || filters.limit }));
  };

  const handleRefresh = () => {
    dispatch(fetchDocuments(filters));
  };

  const handleDownload = async (document: Document) => {
    try {
      const result = await dispatch(getDocumentDownloadUrl(document.id)).unwrap();
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName;
      link.click();
      message.success('開始下載');
    } catch (error) {
      message.error('下載失敗');
    }
  };

  const handleDelete = (document: Document) => {
    confirm({
      title: '確認刪除',
      icon: <ExclamationCircleOutlined />,
      content: `確定要刪除文件 "${document.title}" 嗎？此操作無法撤銷。`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dispatch(deleteDocument(document.id)).unwrap();
          message.success('文件刪除成功');
          dispatch(fetchDocuments(filters));
        } catch (error) {
          message.error('刪除失敗');
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('請選擇要刪除的文件');
      return;
    }

    confirm({
      title: '批量刪除',
      icon: <ExclamationCircleOutlined />,
      content: `確定要刪除選中的 ${selectedRowKeys.length} 個文件嗎？此操作無法撤銷。`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => dispatch(deleteDocument(id as string)).unwrap())
          );
          message.success('批量刪除成功');
          setSelectedRowKeys([]);
          dispatch(fetchDocuments(filters));
        } catch (error) {
          message.error('批量刪除失敗');
        }
      },
    });
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PROCESSING:
        return 'processing';
      case DocumentStatus.COMPLETED:
        return 'success';
      case DocumentStatus.FAILED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PROCESSING:
        return '處理中';
      case DocumentStatus.COMPLETED:
        return '已完成';
      case DocumentStatus.FAILED:
        return '失敗';
      default:
        return '未知';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'image':
        return '🖼️';
      case 'pdf':
        return '📄';
      case 'document':
        return '📝';
      case 'spreadsheet':
        return '📊';
      case 'presentation':
        return '📋';
      case 'text':
        return '📄';
      default:
        return '📁';
    }
  };

  const columns: ColumnsType<Document> = [
    {
      title: '文件名',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Document) => (
        <Space>
          <span style={{ fontSize: '18px' }}>{getCategoryIcon(record.category)}</span>
          <div>
            <div
              className="cursor-pointer hover:text-blue-500"
              onClick={() => onDocumentClick?.(record)}
            >
              <Text strong>{text}</Text>
            </div>
            <div className="text-sm text-gray-500">{record.originalName}</div>
          </div>
        </Space>
      ),
      sorter: true,
      ellipsis: true,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: DocumentStatus, record: Document) => (
        <div>
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
          {status === DocumentStatus.FAILED && record.processingError && (
            <Tooltip title={record.processingError}>
              <ExclamationCircleOutlined className="text-red-500 ml-1" />
            </Tooltip>
          )}
        </div>
      ),
      filters: [
        { text: '處理中', value: DocumentStatus.PROCESSING },
        { text: '已完成', value: DocumentStatus.COMPLETED },
        { text: '失敗', value: DocumentStatus.FAILED },
      ],
      filterMultiple: false,
      width: 120,
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      ),
      filters: [
        { text: '文檔', value: 'document' },
        { text: '圖片', value: 'image' },
        { text: '電子表格', value: 'spreadsheet' },
        { text: '演示文稿', value: 'presentation' },
        { text: '文本', value: 'text' },
        { text: '其他', value: 'other' },
      ],
      filterMultiple: false,
      width: 100,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
      sorter: true,
      width: 100,
    },
    {
      title: '標籤',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <div>
          {tags.map(tag => (
            <Tag key={tag} size="small">
              {tag}
            </Tag>
          ))}
        </div>
      ),
      ellipsis: true,
      width: 150,
    },
    {
      title: '創建時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
      sorter: true,
      width: 120,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Document) => (
        <Space size="small">
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onDocumentClick?.(record)}
            />
          </Tooltip>
          <Tooltip title="下載">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
              disabled={record.status !== DocumentStatus.COMPLETED}
            />
          </Tooltip>
          <Tooltip title="刪除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
      width: 120,
      fixed: 'right',
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  return (
    <div className="document-list">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <Title level={4} className="!mb-0">
              文件管理
            </Title>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              刷新
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量刪除 ({selectedRowKeys.length})
              </Button>
            )}
            {showUploadButton && (
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={onUploadClick}
              >
                上傳文件
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <Search
            placeholder="搜索文件名、描述或內容"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder="選擇分類"
            allowClear
            style={{ width: 120 }}
            value={filters.category}
            onChange={value => handleFilterChange('category', value)}
          >
            <Option value="document">文檔</Option>
            <Option value="image">圖片</Option>
            <Option value="spreadsheet">電子表格</Option>
            <Option value="presentation">演示文稿</Option>
            <Option value="text">文本</Option>
            <Option value="other">其他</Option>
          </Select>
          <Select
            placeholder="選擇狀態"
            allowClear
            style={{ width: 120 }}
            value={filters.status}
            onChange={value => handleFilterChange('status', value)}
          >
            <Option value={DocumentStatus.PROCESSING}>處理中</Option>
            <Option value={DocumentStatus.COMPLETED}>已完成</Option>
            <Option value={DocumentStatus.FAILED}>失敗</Option>
          </Select>
          <Select
            placeholder="排序方式"
            style={{ width: 120 }}
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={value => {
              const [sortBy, sortOrder] = value.split('-');
              handleFilterChange('sortBy', sortBy);
              handleFilterChange('sortOrder', sortOrder);
            }}
          >
            <Option value="createdAt-desc">最新創建</Option>
            <Option value="createdAt-asc">最早創建</Option>
            <Option value="updatedAt-desc">最近更新</Option>
            <Option value="updatedAt-asc">最早更新</Option>
            <Option value="title-asc">標題 A-Z</Option>
            <Option value="title-desc">標題 Z-A</Option>
            <Option value="size-desc">大小從大到小</Option>
            <Option value="size-asc">大小從小到大</Option>
          </Select>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暫無文件"
              />
            ),
          }}
        />

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            共 {pagination.total} 個文件
          </div>
          <Pagination
            current={pagination.page}
            pageSize={pagination.limit}
            total={pagination.total}
            onChange={handlePageChange}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
            }
            pageSizeOptions={['10', '20', '50', '100']}
          />
        </div>
      </Card>
    </div>
  );
};

export default DocumentList;