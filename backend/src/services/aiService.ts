import OpenAI from 'openai';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIService');

export interface AIAnalysisResult {
  summary: string;
  keywords: string[];
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  language: string;
  readingTime: number; // 預估閱讀時間（分鐘）
  complexity: 'low' | 'medium' | 'high';
  topics: string[];
  entities: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'misc';
    confidence: number;
  }>;
}

export interface DocumentAnalysisRequest {
  content: string;
  title?: string | undefined;
  documentType?: string | undefined;
  maxSummaryLength?: number | undefined;
  maxKeywords?: number | undefined;
  maxTags?: number | undefined;
}

export class AIService {
  private openai!: OpenAI;
  private isConfigured: boolean;
  private model: string = 'gpt-4o-mini';
  private maxTokens: number = 2000;
  private temperature: number = 0.3;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      logger.warn('OpenAI API key not configured. AI features will be disabled.');
      this.isConfigured = false;
      return;
    }

    this.openai = new OpenAI({
      apiKey,
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '2000');
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.3');
    
    this.isConfigured = true;
    logger.info('OpenAI service initialized successfully');
  }

  /**
   * 檢查 AI 服務是否已配置
   */
  public isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * 分析文檔內容
   */
  async analyzeDocument(request: DocumentAnalysisRequest): Promise<AIAnalysisResult> {
    if (!this.isConfigured) {
      throw new Error('OpenAI API not configured');
    }

    try {
      const {
        content,
        title = '',
        documentType = 'unknown',
        maxSummaryLength = 300,
        maxKeywords = 10,
        maxTags = 8,
      } = request;

      logger.info('開始 AI 文檔分析', {
        contentLength: content.length,
        documentType,
      });

      // 構建分析提示
      const analysisPrompt = this.buildAnalysisPrompt(
        content,
        title,
        documentType,
        maxSummaryLength,
        maxKeywords,
        maxTags
      );

      // 調用 OpenAI API
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `你是一個專業的文檔分析助手，擅長提取文檔的關鍵信息、生成摘要和分析內容。
請用繁體中文回應，並以 JSON 格式返回分析結果。`,
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
        response_format: { type: 'json_object' },
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('OpenAI 返回空響應');
      }

      // 解析 AI 響應
      const aiResult = JSON.parse(analysisText);
      
      // 計算額外指標
      const readingTime = this.calculateReadingTime(content);
      const complexity = this.assessComplexity(content);

      const result: AIAnalysisResult = {
        summary: aiResult.summary || '',
        keywords: aiResult.keywords || [],
        tags: aiResult.tags || [],
        sentiment: aiResult.sentiment || 'neutral',
        confidence: aiResult.confidence || 0.8,
        language: aiResult.language || 'zh-TW',
        readingTime,
        complexity,
        topics: aiResult.topics || [],
        entities: aiResult.entities || [],
      };

      logger.info('AI 文檔分析完成', {
        summaryLength: result.summary.length,
        keywordsCount: result.keywords.length,
        tagsCount: result.tags.length,
        sentiment: result.sentiment,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('AI 文檔分析失敗:', error);
      throw error;
    }
  }

  /**
   * 生成文檔摘要
   */
  async generateSummary(
    content: string,
    maxLength: number = 300,
    language: string = 'zh-TW'
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('OpenAI API not configured');
    }

    try {
      const prompt = `請為以下內容生成一個簡潔的摘要，長度不超過 ${maxLength} 個字符：

${content.substring(0, 8000)}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一個專業的摘要生成助手，能夠提取文檐的核心要點並生成簡潔的摘要。請用繁體中文回應。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: Math.min(maxLength * 2, 1000),
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('生成摘要失敗:', error);
      throw error;
    }
  }

  /**
   * 提取關鍵詞
   */
  async extractKeywords(content: string, maxKeywords: number = 10): Promise<string[]> {
    if (!this.isConfigured) {
      throw new Error('OpenAI API not configured');
    }

    try {
      const prompt = `從以下內容中提取 ${maxKeywords} 個最重要的關鍵詞。
請返回一個 JSON 數組格式的關鍵詞列表：

${content.substring(0, 6000)}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一個關鍵詞提取專家。請分析文檔內容並提取最重要的關鍵詞。返回 JSON 數組格式。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"keywords": []}');
      return result.keywords || [];
    } catch (error) {
      logger.error('提取關鍵詞失敗:', error);
      throw error;
    }
  }

  /**
   * 生成標籤
   */
  async generateTags(content: string, maxTags: number = 8): Promise<string[]> {
    if (!this.isConfigured) {
      throw new Error('OpenAI API not configured');
    }

    try {
      const prompt = `基於以下內容生成 ${maxTags} 個分類標籤。
標籤應該反映文檔的主題、類型和內容領域。
請返回 JSON 數組格式：

${content.substring(0, 4000)}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一個內容分類專家。請分析文檔並生成合適的分類標籤。返回 JSON 數組格式。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"tags": []}');
      return result.tags || [];
    } catch (error) {
      logger.error('生成標籤失敗:', error);
      throw error;
    }
  }

  /**
   * 分析情感
   */
  async analyzeSentiment(content: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    if (!this.isConfigured) {
      throw new Error('OpenAI API not configured');
    }

    try {
      const prompt = `分析以下內容的情感傾向：

${content.substring(0, 3000)}

請返回 JSON 格式的結果，包含 sentiment（positive/negative/neutral）和 confidence（0-1 之間的數值）。`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一個情感分析專家。請分析文本的情感傾向並提供信心度評分。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"sentiment": "neutral", "confidence": 0.5}');
      return {
        sentiment: result.sentiment || 'neutral',
        confidence: result.confidence || 0.5,
      };
    } catch (error) {
      logger.error('情感分析失敗:', error);
      return { sentiment: 'neutral', confidence: 0 };
    }
  }

  /**
   * 通用內容分析
   */
  async analyzeContent(prompt: string): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI 未配置');
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '您是一個專業的內容分析專家，請根據用戶的要求分析內容並提供準確的結果。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('內容分析失敗:', error);
      throw error;
    }
  }

  /**
   * 構建分析提示
   */
  private buildAnalysisPrompt(
    content: string,
    title: string,
    documentType: string,
    maxSummaryLength: number,
    maxKeywords: number,
    maxTags: number
  ): string {
    return `請對以下文檔進行全面分析，並以 JSON 格式返回結果：

文檔標題：${title}
文檔類型：${documentType}
文檔內容：
${content.substring(0, 12000)}

請提供以下分析結果（JSON 格式）：
{
  "summary": "文檔摘要（不超過 ${maxSummaryLength} 字符）",
  "keywords": ["關鍵詞列表（最多 ${maxKeywords} 個）"],
  "tags": ["分類標籤（最多 ${maxTags} 個）"],
  "sentiment": "情感傾向（positive/negative/neutral）",
  "confidence": "分析信心度（0-1 之間的數值）",
  "language": "主要語言",
  "topics": ["主要話題列表"],
  "entities": [
    {
      "text": "實體文本",
      "type": "實體類型（person/organization/location/misc）",
      "confidence": "信心度（0-1）"
    }
  ]
}

請確保所有字段都有合理的值，摘要要準確概括文檔內容。`;
  }

  /**
   * 計算預估閱讀時間
   */
  private calculateReadingTime(content: string): number {
    // 中文：每分鐘約 300-400 字
    // 英文：每分鐘約 200-250 詞
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = content.match(/[a-zA-Z]+/g)?.length || 0;
    
    const chineseReadingTime = chineseChars / 350; // 350 字/分鐘
    const englishReadingTime = englishWords / 225; // 225 詞/分鐘
    
    return Math.max(1, Math.round(chineseReadingTime + englishReadingTime));
  }

  /**
   * 評估文檔複雜度
   */
  private assessComplexity(content: string): 'low' | 'medium' | 'high' {
    const length = content.length;
    const sentences = content.split(/[.!?。！？]+/).length;
    const avgSentenceLength = length / sentences;
    
    // 根據平均句子長度和總長度判斷複雜度
    if (avgSentenceLength > 100 || length > 10000) {
      return 'high';
    } else if (avgSentenceLength > 50 || length > 3000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 批量分析多個文檔
   */
  async analyzeBatch(requests: DocumentAnalysisRequest[]): Promise<AIAnalysisResult[]> {
    if (!this.isConfigured) {
      throw new Error('OpenAI API not configured');
    }

    const results: AIAnalysisResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.analyzeDocument(request);
        results.push(result);
        
        // 添加延遲以避免 API 速率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('批量分析中的文檔分析失敗:', error);
        // 繼續處理其他文檔
      }
    }
    
    return results;
  }

  // 發現知識關聯
  async findConnections(content: string, existingCards: any[] = []): Promise<any[]> {
    try {
      if (!this.isAvailable()) {
        throw new Error('AI service is not available');
      }

      const prompt = `
分析以下內容與現有知識卡片的關聯性：

**新內容：**
${content}

**現有知識卡片：**
${existingCards.map(card => `
- 標題: ${card.title}
- 內容: ${card.content}
- 標籤: ${card.tags ? card.tags.join(', ') : '無'}
`).join('\n')}

**請按照以下JSON格式輸出關聯分析：**
{
  "connections": [
    {
      "cardId": "卡片ID",
      "cardTitle": "卡片標題",
      "relevanceScore": 0.8,
      "connectionType": "概念相關/主題相關/標籤相關",
      "reasoning": "關聯理由",
      "sharedConcepts": ["共同概念1", "共同概念2"],
      "suggestedLinks": ["建議的連結方式"]
    }
  ],
  "newConnections": [
    {
      "concept": "新概念",
      "relatedCards": ["相關卡片ID"],
      "connectionStrength": "強/中/弱"
    }
  ],
  "insights": ["洞察1", "洞察2"]
}
`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一個專業的知識管理分析師，擅長發現不同知識點之間的關聯性。請提供準確的JSON格式回應。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from AI service');
      }

      const analysis = JSON.parse(result);
      
      logger.info('AI connections analysis completed', {
        connectionsFound: analysis.connections?.length || 0,
        newConnections: analysis.newConnections?.length || 0,
      });

      return analysis.connections || [];
    } catch (error) {
      logger.error('AI connections analysis failed', error);
      
      if (error instanceof Error && error.message.includes('AI service')) {
        throw error;
      }
      
      // 如果AI服務失敗，返回基於規則的簡單關聯分析
      return this.fallbackConnectionAnalysis(content, existingCards);
    }
  }

  // 備用的基於規則的關聯分析
  private fallbackConnectionAnalysis(content: string, existingCards: any[]): any[] {
    const connections = [];
    const contentLower = content.toLowerCase();
    const contentWords = contentLower.split(/\s+/);

    for (const card of existingCards) {
      const cardContentLower = card.content.toLowerCase();
      const cardWords = cardContentLower.split(/\s+/);
      const cardTags = card.tags || [];

      let relevanceScore = 0;
      const sharedConcepts = [];
      let connectionType = '';
      let reasoning = '';

      // 計算詞彙重疊度
      const sharedWords = contentWords.filter(word => 
        word.length > 3 && cardWords.includes(word)
      );
      
      if (sharedWords.length > 0) {
        relevanceScore += Math.min(sharedWords.length * 0.1, 0.5);
        sharedConcepts.push(...sharedWords.slice(0, 3));
        connectionType = '內容相關';
        reasoning = `共享關鍵詞: ${sharedWords.slice(0, 3).join(', ')}`;
      }

      // 檢查標籤相關性
      for (const tag of cardTags) {
        if (contentLower.includes(tag.toLowerCase())) {
          relevanceScore += 0.3;
          sharedConcepts.push(tag);
          connectionType = '標籤相關';
          reasoning += reasoning ? '; ' : '';
          reasoning += `包含標籤: ${tag}`;
        }
      }

      if (relevanceScore > 0.2) {
        connections.push({
          cardId: card.id,
          cardTitle: card.title,
          relevanceScore: Math.min(relevanceScore, 1.0),
          connectionType,
          reasoning,
          sharedConcepts,
          suggestedLinks: ['相關概念', '參考資料'],
        });
      }
    }

    return connections.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

export const aiService = new AIService();