import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Typography,
  Card,
  Modal,
  message,
  Tag,
  Tooltip,
  Empty,
  Pagination,
  Badge,
  Descriptions
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  RobotOutlined,
  CalendarOutlined,
  TagsOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { aiAnalysisService, AIAnalysisResult, AIAnalysisDetail } from '../../services/aiAnalysisService';
import { formatDate } from '../../utils/format';

const { Search } = Input;
const { Text, Title, Paragraph } = Typography;
const { confirm } = Modal;

interface AnalysisResultListProps {
  refreshTrigger?: number; // 用於觸發刷新
}

const AnalysisResultList: React.FC<AnalysisResultListProps> = ({ 
  refreshTrigger 
}) => {
  const [results, setResults] = useState<AIAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<AIAnalysisDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  /**
   * 載入分析結果列表
   */
  const loadResults = async (page: number = 1, search?: string) => {
    setLoading(true);
    try {
      const response = await aiAnalysisService.getAnalysisResults({
        page,
        limit: pagination.pageSize,
        search
      });

      setResults(response.results);
      setPagination(prev => ({
        ...prev,
        current: response.pagination.page,
        total: response.pagination.total
      }));
    } catch (error) {
      console.error('載入分析結果失敗:', error);
      message.error('載入分析結果失敗');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 查看詳情
   */
  const handleViewDetail = async (record: AIAnalysisResult) => {
    setDetailLoading(true);
    setDetailModalVisible(true);
    
    try {
      const detail = await aiAnalysisService.getAnalysisResult(record.id);
      setSelectedResult(detail);
    } catch (error) {
      console.error('載入詳情失敗:', error);
      message.error('載入詳情失敗');
      setDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  /**
   * 下載Markdown
   */
  const handleDownload = async (record: AIAnalysisResult) => {
    try {
      await aiAnalysisService.downloadMarkdown(record.id);
      message.success('下載開始');
    } catch (error) {
      console.error('下載失敗:', error);
      message.error('下載失敗');
    }
  };

  /**
   * 刪除分析結果
   */
  const handleDelete = (record: AIAnalysisResult) => {
    confirm({
      title: '確認刪除',
      icon: <ExclamationCircleOutlined />,
      content: `確定要刪除分析結果 "${record.title}" 嗎？此操作無法撤銷。`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await aiAnalysisService.deleteAnalysisResult(record.id);
          message.success('分析結果已刪除');
          loadResults(pagination.current, searchQuery);
        } catch (error) {
          console.error('刪除失敗:', error);
          message.error('刪除失敗');
        }
      }
    });
  };

  /**
   * 搜索
   */
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    loadResults(1, value);
  };

  /**
   * 分頁變更
   */
  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize
    }));
    loadResults(page, searchQuery);
  };

  /**
   * 獲取分析類型標籤
   */
  const getAnalysisTypeTag = (type: string) => {
    return type === 'batch' ? (
      <Tag color="blue">批次分析</Tag>
    ) : (
      <Tag color="green">單文件分析</Tag>
    );
  };

  /**
   * 表格列定義
   */
  const columns: ColumnsType<AIAnalysisResult> = [
    {
      title: '分析標題',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: AIAnalysisResult) => (
        <div>
          <div className="title-row">
            <RobotOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            <Text strong className="cursor-pointer" onClick={() => handleViewDetail(record)}>
              {text}
            </Text>
          </div>
          <div className="subtitle-row">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              索引：{record.indexKey}
            </Text>
          </div>
        </div>
      ),
      width: 300,
      ellipsis: true
    },
    {
      title: '文件信息',
      key: 'files',
      render: (_, record: AIAnalysisResult) => (
        <div>
          <div className="file-count">
            <FileTextOutlined style={{ marginRight: 4 }} />
            <Text>{record.originalFiles.length} 個文件</Text>
          </div>
          <div className="file-types">
            {record.originalFiles.slice(0, 3).map((file, index) => (
              <Text key={index} type="secondary" style={{ fontSize: '12px' }}>
                {aiAnalysisService.getFileIcon(file.fileType)} {file.originalName}
                {index < Math.min(record.originalFiles.length, 3) - 1 && ', '}
              </Text>
            ))}
            {record.originalFiles.length > 3 && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ...等{record.originalFiles.length}個
              </Text>
            )}
          </div>
        </div>
      ),
      width: 200
    },
    {
      title: '分析類型',
      dataIndex: 'analysisType',
      key: 'analysisType',
      render: (type: string) => getAnalysisTypeTag(type),
      width: 120,
      filters: [
        { text: '單文件分析', value: 'single' },
        { text: '批次分析', value: 'batch' }
      ],
      onFilter: (value, record) => record.analysisType === value
    },
    {
      title: '關鍵詞',
      dataIndex: 'keywords',
      key: 'keywords',
      render: (keywords: string) => {
        const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
        return (
          <div>
            {keywordList.slice(0, 3).map((keyword, index) => (
              <Tag key={index} style={{ marginBottom: 2, fontSize: '12px' }}>
                {keyword}
              </Tag>
            ))}
            {keywordList.length > 3 && (
              <Tooltip title={keywordList.slice(3).join(', ')}>
                <Tag style={{ marginBottom: 2, fontSize: '12px' }}>
                  +{keywordList.length - 3}
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
      width: 150,
      ellipsis: true
    },
    {
      title: '創建時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <div>
          <CalendarOutlined style={{ marginRight: 4 }} />
          <Text style={{ fontSize: '12px' }}>{formatDate(date)}</Text>
        </div>
      ),
      width: 150,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: AIAnalysisResult) => (
        <Space size="small">
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="下載Markdown">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
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
      fixed: 'right'
    }
  ];

  // 初始化和刷新觸發
  useEffect(() => {
    loadResults();
  }, [refreshTrigger]);

  return (
    <div className="analysis-result-list">
      <Card>
        {/* 搜索欄 */}
        <div className="search-section" style={{ marginBottom: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Search
              placeholder="搜索分析標題、關鍵詞、索引鍵(indexKey)或內容..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 500 }}
              enterButton={<SearchOutlined />}
            />
            <Button
              icon={<RobotOutlined />}
              onClick={() => loadResults(pagination.current, searchQuery)}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </div>

        {/* 結果表格 */}
        <Table
          columns={columns}
          dataSource={results}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暫無AI分析重點"
              >
                <Text type="secondary">
                  上傳文件並進行AI分析後，分析重點將在這裡顯示
                </Text>
              </Empty>
            )
          }}
        />

        {/* 分頁 */}
        {results.length > 0 && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) =>
                `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
              }
              pageSizeOptions={['10', '20', '50']}
            />
          </div>
        )}
      </Card>

      {/* 詳情Modal */}
      <Modal
        title={
          <Space>
            <RobotOutlined />
            AI分析詳情
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedResult(null);
        }}
        footer={[
          <Button key="download" 
            icon={<DownloadOutlined />} 
            onClick={() => selectedResult && handleDownload(selectedResult)}
          >
            下載Markdown
          </Button>,
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            關閉
          </Button>
        ]}
        width={800}
        className="analysis-detail-modal"
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <RobotOutlined spin style={{ fontSize: 24, marginBottom: 16 }} />
            <div>載入詳情中...</div>
          </div>
        ) : selectedResult ? (
          <div className="analysis-detail">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="分析標題">
                <Text strong>{selectedResult.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="原始文件">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {selectedResult.originalFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <Space>
                        <span>{aiAnalysisService.getFileIcon(file.fileType)}</span>
                        <Text>{file.originalName}</Text>
                        <Tag style={{ fontSize: '12px' }}>{aiAnalysisService.formatFileType(file.fileType)}</Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {aiAnalysisService.formatFileSize(file.size)}
                        </Text>
                      </Space>
                    </div>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="分析摘要">
                <Paragraph>{selectedResult.summary}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="重點整理">
                <div 
                  className="markdown-content"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedResult.keyPoints.replace(/\n/g, '<br>') 
                  }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="深度洞察">
                <Paragraph>{selectedResult.insights}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="關鍵詞">
                <div>
                  {selectedResult.keywords.split(',').map((keyword, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                      {keyword.trim()}
                    </Tag>
                  ))}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="分類標籤">
                <div>
                  {selectedResult.categories.split(',').map((category, index) => (
                    <Tag key={index} color="green" style={{ marginBottom: 4 }}>
                      {category.trim()}
                    </Tag>
                  ))}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="創建時間">
                <Text>{formatDate(selectedResult.createdAt)}</Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Modal>

      <style>{`
        .title-row {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }
        
        .subtitle-row {
          margin-left: 24px;
        }
        
        .file-count {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }
        
        .file-types {
          font-size: 12px;
          line-height: 1.4;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .cursor-pointer:hover {
          color: #1890ff;
        }
        
        .markdown-content {
          line-height: 1.6;
          max-height: 200px;
          overflow-y: auto;
          padding: 8px;
          background: #f9f9f9;
          border-radius: 4px;
        }
        
        .file-item {
          padding: 4px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .file-item:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};

export default AnalysisResultList;