import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Spin,
  Alert,
  Typography,
  Row,
  Col,
  Tag,
  Progress,
  Divider,
  Space,
  Tooltip,
  Input,
  Select,
  Form,
  message,
} from 'antd';
import {
  RobotOutlined,
  FileTextOutlined,
  TagsOutlined,
  HeartOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { aiService, AIAnalysisResult } from '../../services/aiService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface AIAnalysisPanelProps {
  documentId?: string;
  initialContent?: string;
  onAnalysisComplete?: (result: AIAnalysisResult) => void;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  documentId,
  initialContent = '',
  onAnalysisComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  // 檢查 AI 服務狀態
  useEffect(() => {
    checkAIAvailability();
  }, []);

  const checkAIAvailability = async () => {
    try {
      const available = await aiService.isAvailable();
      setAiAvailable(available);
    } catch (err) {
      setAiAvailable(false);
      console.error('Failed to check AI availability:', err);
    }
  };

  // 分析文檔
  const handleAnalyze = async (values: any) => {
    setLoading(true);
    setError(null);

    try {
      let result: AIAnalysisResult;

      if (documentId) {
        // 分析已上傳的文檔
        const response = await aiService.analyzeDocumentById(documentId, {
          maxSummaryLength: values.maxSummaryLength,
          maxKeywords: values.maxKeywords,
          maxTags: values.maxTags,
        });
        result = response.analysis;
      } else {
        // 分析文本內容
        result = await aiService.analyzeDocument({
          content: values.content,
          title: values.title,
          documentType: values.documentType,
          maxSummaryLength: values.maxSummaryLength,
          maxKeywords: values.maxKeywords,
          maxTags: values.maxTags,
        });
      }

      setAnalysisResult(result);
      onAnalysisComplete?.(result);
      message.success('AI 分析完成！');
    } catch (err: any) {
      setError(err.message || 'AI 分析失敗');
      message.error('AI 分析失敗');
    } finally {
      setLoading(false);
    }
  };

  // 渲染情感分析結果
  const renderSentimentAnalysis = (sentiment: string, confidence: number) => {
    const sentimentColor = {
      positive: 'green',
      negative: 'red',
      neutral: 'blue',
    }[sentiment] || 'default';

    const sentimentText = aiService.getSentimentText(sentiment as any);

    return (
      <Space>
        <Tag color={sentimentColor}>{sentimentText}</Tag>
        <Text type="secondary">信心度: {aiService.formatConfidence(confidence)}</Text>
      </Space>
    );
  };

  // 渲染實體列表
  const renderEntities = (entities: AIAnalysisResult['entities']) => {
    if (!entities || entities.length === 0) {
      return <Text type="secondary">未識別到實體</Text>;
    }

    return (
      <div>
        {entities.map((entity, index) => (
          <Tooltip
            key={index}
            title={`類型: ${aiService.getEntityTypeText(entity.type)} | 信心度: ${aiService.formatConfidence(entity.confidence)}`}
          >
            <Tag style={{ marginBottom: 4 }}>
              {entity.text}
            </Tag>
          </Tooltip>
        ))}
      </div>
    );
  };

  // AI 服務不可用時的提示
  if (!aiAvailable) {
    return (
      <Card>
        <Alert
          message="AI 服務不可用"
          description="AI 分析功能需要配置 OpenAI API 密鑰。請聯繫管理員配置相關設定。"
          type="warning"
          showIcon
          icon={<RobotOutlined />}
        />
      </Card>
    );
  }

  return (
    <div>
      {/* 分析配置表單 */}
      <Card title={
        <Space>
          <RobotOutlined />
          AI 智能分析
        </Space>
      } style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAnalyze}
          initialValues={{
            content: initialContent,
            maxSummaryLength: 300,
            maxKeywords: 10,
            maxTags: 8,
          }}
        >
          {!documentId && (
            <>
              <Form.Item
                name="content"
                label="分析內容"
                rules={[{ required: true, message: '請輸入要分析的內容' }]}
              >
                <TextArea
                  rows={6}
                  placeholder="請輸入要分析的文本內容..."
                  maxLength={20000}
                  showCount
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="title" label="標題（可選）">
                    <Input placeholder="文檔標題" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="documentType" label="文檔類型（可選）">
                    <Select placeholder="選擇文檔類型">
                      <Option value="article">文章</Option>
                      <Option value="report">報告</Option>
                      <Option value="news">新聞</Option>
                      <Option value="academic">學術論文</Option>
                      <Option value="blog">部落格</Option>
                      <Option value="other">其他</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="maxSummaryLength" label="摘要長度">
                <Select>
                  <Option value={150}>簡短 (150字)</Option>
                  <Option value={300}>標準 (300字)</Option>
                  <Option value={500}>詳細 (500字)</Option>
                  <Option value={800}>完整 (800字)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="maxKeywords" label="關鍵詞數量">
                <Select>
                  <Option value={5}>5個</Option>
                  <Option value={10}>10個</Option>
                  <Option value={15}>15個</Option>
                  <Option value={20}>20個</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="maxTags" label="標籤數量">
                <Select>
                  <Option value={5}>5個</Option>
                  <Option value={8}>8個</Option>
                  <Option value={12}>12個</Option>
                  <Option value={15}>15個</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<RobotOutlined />}
              size="large"
            >
              {loading ? '分析中...' : '開始 AI 分析'}
            </Button>
          </Form.Item>
        </Form>

        {error && (
          <Alert
            message="分析失敗"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* 分析結果展示 */}
      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>AI 正在分析文檔內容，請稍候...</Text>
            </div>
          </div>
        </Card>
      )}

      {analysisResult && !loading && (
        <div>
          {/* 摘要 */}
          <Card
            title={
              <Space>
                <FileTextOutlined />
                文檔摘要
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Paragraph>{analysisResult.summary}</Paragraph>
          </Card>

          {/* 關鍵指標 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <ClockCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <div style={{ marginTop: 8 }}>
                    <Text strong>{aiService.formatReadingTime(analysisResult.readingTime)}</Text>
                    <div><Text type="secondary">預估閱讀時間</Text></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <BarChartOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <div style={{ marginTop: 8 }}>
                    <Text strong>{aiService.getComplexityText(analysisResult.complexity)}</Text>
                    <div><Text type="secondary">文檔複雜度</Text></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <HeartOutlined style={{ fontSize: 24, color: '#f5222d' }} />
                  <div style={{ marginTop: 8 }}>
                    {renderSentimentAnalysis(analysisResult.sentiment, analysisResult.confidence)}
                    <div><Text type="secondary">情感傾向</Text></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <BulbOutlined style={{ fontSize: 24, color: '#faad14' }} />
                  <div style={{ marginTop: 8 }}>
                    <Text strong>{analysisResult.language}</Text>
                    <div><Text type="secondary">主要語言</Text></div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 關鍵詞和標籤 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}>
              <Card
                title={
                  <Space>
                    <TagsOutlined />
                    關鍵詞
                  </Space>
                }
                size="small"
              >
                <div>
                  {analysisResult.keywords.map((keyword, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                      {keyword}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card
                title={
                  <Space>
                    <TagsOutlined />
                    分類標籤
                  </Space>
                }
                size="small"
              >
                <div>
                  {analysisResult.tags.map((tag, index) => (
                    <Tag key={index} color="green" style={{ marginBottom: 4 }}>
                      {tag}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          {/* 主題和實體 */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Card
                title={
                  <Space>
                    <BulbOutlined />
                    主要主題
                  </Space>
                }
                size="small"
              >
                <div>
                  {analysisResult.topics.map((topic, index) => (
                    <Tag key={index} color="purple" style={{ marginBottom: 4 }}>
                      {topic}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    識別實體
                  </Space>
                }
                size="small"
              >
                {renderEntities(analysisResult.entities)}
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;