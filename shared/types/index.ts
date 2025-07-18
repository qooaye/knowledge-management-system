// ===============================
// 共用類型定義
// ===============================

// 用戶相關類型
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// 文件相關類型
export interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  status: DocumentStatus;
  content?: string;
  ocrText?: string;
  analysis?: DocumentAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface DocumentAnalysis {
  id: string;
  documentId: string;
  summary: string;
  keywords: string[];
  concepts: Concept[];
  topics: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  insights: string[];
  createdAt: Date;
}

export interface Concept {
  name: string;
  description: string;
  importance: number; // 1-5
}

// 爬蟲相關類型
export interface CrawlerTask {
  id: string;
  userId: string;
  name: string;
  platform: CrawlerPlatform;
  keywords: string[];
  config: CrawlerConfig;
  status: CrawlerStatus;
  progress: number;
  resultCount: number;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
}

export enum CrawlerPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  THREADS = 'threads',
  TWITTER = 'twitter',
  MEDIUM = 'medium',
  PTT = 'ptt',
  MOBILE01 = 'mobile01',
  DCARD = 'dcard'
}

export enum CrawlerStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

export interface CrawlerConfig {
  maxResults?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filterKeywords?: string[];
  minRelevanceScore?: number;
}

export interface CrawlerResult {
  id: string;
  taskId: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedAt?: Date;
  platform: CrawlerPlatform;
  relevanceScore: number;
  relevanceReason: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  createdAt: Date;
}

// 知識卡片相關類型
export interface KnowledgeCard {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  sourceDocumentId?: string;
  sourceCrawlerResultId?: string;
  connections: CardConnection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CardConnection {
  id: string;
  fromCardId: string;
  toCardId: string;
  connectionType: ConnectionType;
  strength: number; // 0-1
  description?: string;
  createdAt: Date;
}

export enum ConnectionType {
  RELATED = 'related',
  PREREQUISITE = 'prerequisite',
  FOLLOWUP = 'followup',
  CONTRADICTION = 'contradiction',
  EXAMPLE = 'example',
  REFERENCE = 'reference'
}

// AI服務相關類型
export interface AIAnalysisRequest {
  content: string;
  type: 'document' | 'crawler_result';
}

export interface AIAnalysisResponse {
  summary: string;
  keywords: string[];
  concepts: Concept[];
  topics: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  insights: string[];
}

export interface KeywordGenerationRequest {
  documentSummary: string;
}

export interface KeywordGenerationResponse {
  coreKeywords: string[];
  longTailKeywords: string[];
  relatedTerms: string[];
  hashtags: string[];
  englishKeywords: string[];
}

export interface RelevanceAssessmentRequest {
  userTopic: string;
  crawlerContent: string;
}

export interface RelevanceAssessmentResponse {
  relevanceScore: number;
  reasoning: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  recommendation: string;
}

// API響應類型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 搜索相關類型
export interface SearchQuery {
  query: string;
  filters?: {
    category?: string;
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    platform?: CrawlerPlatform;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  type: 'document' | 'knowledge_card' | 'crawler_result';
  title: string;
  content: string;
  highlights: string[];
  relevanceScore: number;
  createdAt: Date;
}

// WebSocket事件類型
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface ProcessingProgressEvent extends WebSocketEvent {
  type: 'processing_progress';
  data: {
    taskId: string;
    progress: number;
    status: string;
    message?: string;
  };
}

// 統計數據類型
export interface DashboardStats {
  totalDocuments: number;
  totalKnowledgeCards: number;
  totalCrawlerTasks: number;
  recentActivity: ActivityItem[];
  storageUsed: number;
  storageLimit: number;
}

export interface ActivityItem {
  id: string;
  type: 'document_upload' | 'card_created' | 'crawler_completed';
  title: string;
  description: string;
  timestamp: Date;
}

// 知識圖譜類型
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'document' | 'knowledge_card' | 'concept';
  category: string;
  size: number;
  color: string;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: ConnectionType;
  strength: number;
  label?: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}