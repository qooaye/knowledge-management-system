import { KnowledgeCard } from '@prisma/client';
import prisma from '../utils/database';
import { createLogger } from '../utils/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/error';
import { aiService } from './aiService';

const logger = createLogger('Knowledge Service');

export interface CreateKnowledgeCardData {
  userId: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  sourceDocumentId?: string;
  sourceCrawlerResultId?: string;
}

export interface UpdateKnowledgeCardData {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
}

export interface KnowledgeCardFilters {
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchKnowledgeCardsParams {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface KnowledgeConnection {
  id: string;
  title: string;
  category: string;
  relevanceScore: number;
  sharedTags: string[];
  connectionReason: string;
}

export class KnowledgeService {
  // 獲取知識卡片列表
  async getKnowledgeCards(userId: string, filters: KnowledgeCardFilters = {}) {
    try {
      const { category, tags, limit = 20, offset = 0 } = filters;

      const whereClause: any = {
        userId,
      };

      if (category) {
        whereClause.category = category;
      }

      if (tags && tags.length > 0) {
        // 在 SQLite 中，tags 是字符串，需要使用 LIKE 查詢
        whereClause.OR = tags.map(tag => ({
          tags: {
            contains: tag,
          },
        }));
      }

      const [cards, total] = await Promise.all([
        prisma.knowledgeCard.findMany({
          where: whereClause,
          orderBy: {
            updatedAt: 'desc',
          },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            sourceDocument: {
              select: {
                id: true,
                title: true,
                fileName: true,
              },
            },
            sourceCrawlerResult: {
              select: {
                id: true,
                title: true,
                url: true,
                platform: true,
              },
            },
          },
        }),
        prisma.knowledgeCard.count({
          where: whereClause,
        }),
      ]);

      // 解析標籤字符串為數組
      const processedCards = cards.map(card => ({
        ...card,
        tags: card.tags ? card.tags.split(',').filter(Boolean) : [],
      }));

      return {
        cards: processedCards,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Failed to get knowledge cards', error, { userId, filters });
      throw error;
    }
  }

  // 創建知識卡片
  async createKnowledgeCard(data: CreateKnowledgeCardData): Promise<KnowledgeCard> {
    try {
      const { userId, title, content, category, tags = [], sourceDocumentId, sourceCrawlerResultId } = data;

      // 驗證來源文件或爬蟲結果存在
      if (sourceDocumentId) {
        const document = await prisma.document.findFirst({
          where: { id: sourceDocumentId, userId },
        });
        if (!document) {
          throw new NotFoundError('Source document not found');
        }
      }

      if (sourceCrawlerResultId) {
        const crawlerResult = await prisma.crawlerResult.findFirst({
          where: { 
            id: sourceCrawlerResultId,
            task: { userId },
          },
        });
        if (!crawlerResult) {
          throw new NotFoundError('Source crawler result not found');
        }
      }

      // 將標籤數組轉換為字符串
      const tagsString = tags.join(',');

      const knowledgeCard = await prisma.knowledgeCard.create({
        data: {
          userId,
          title,
          content,
          category,
          tags: tagsString,
          sourceDocumentId,
          sourceCrawlerResultId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          sourceDocument: {
            select: {
              id: true,
              title: true,
              fileName: true,
            },
          },
          sourceCrawlerResult: {
            select: {
              id: true,
              title: true,
              url: true,
              platform: true,
            },
          },
        },
      });

      logger.info('Knowledge card created successfully', {
        userId,
        cardId: knowledgeCard.id,
        title,
      });

      // 處理標籤
      const processedCard = {
        ...knowledgeCard,
        tags: knowledgeCard.tags ? knowledgeCard.tags.split(',').filter(Boolean) : [],
      };

      return processedCard as KnowledgeCard;
    } catch (error) {
      logger.error('Failed to create knowledge card', error, { userId: data.userId });
      throw error;
    }
  }

  // 獲取單個知識卡片
  async getKnowledgeCard(userId: string, cardId: string): Promise<KnowledgeCard> {
    try {
      const knowledgeCard = await prisma.knowledgeCard.findFirst({
        where: {
          id: cardId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          sourceDocument: {
            select: {
              id: true,
              title: true,
              fileName: true,
            },
          },
          sourceCrawlerResult: {
            select: {
              id: true,
              title: true,
              url: true,
              platform: true,
            },
          },
        },
      });

      if (!knowledgeCard) {
        throw new NotFoundError('Knowledge card not found');
      }

      // 處理標籤
      const processedCard = {
        ...knowledgeCard,
        tags: knowledgeCard.tags ? knowledgeCard.tags.split(',').filter(Boolean) : [],
      };

      return processedCard as KnowledgeCard;
    } catch (error) {
      logger.error('Failed to get knowledge card', error, { userId, cardId });
      throw error;
    }
  }

  // 更新知識卡片
  async updateKnowledgeCard(userId: string, cardId: string, data: UpdateKnowledgeCardData): Promise<KnowledgeCard> {
    try {
      // 檢查卡片是否存在且屬於當前用戶
      const existingCard = await prisma.knowledgeCard.findFirst({
        where: {
          id: cardId,
          userId,
        },
      });

      if (!existingCard) {
        throw new NotFoundError('Knowledge card not found');
      }

      // 準備更新數據
      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.tags !== undefined) updateData.tags = data.tags.join(',');

      const knowledgeCard = await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          sourceDocument: {
            select: {
              id: true,
              title: true,
              fileName: true,
            },
          },
          sourceCrawlerResult: {
            select: {
              id: true,
              title: true,
              url: true,
              platform: true,
            },
          },
        },
      });

      logger.info('Knowledge card updated successfully', {
        userId,
        cardId,
        changes: data,
      });

      // 處理標籤
      const processedCard = {
        ...knowledgeCard,
        tags: knowledgeCard.tags ? knowledgeCard.tags.split(',').filter(Boolean) : [],
      };

      return processedCard as KnowledgeCard;
    } catch (error) {
      logger.error('Failed to update knowledge card', error, { userId, cardId });
      throw error;
    }
  }

  // 刪除知識卡片
  async deleteKnowledgeCard(userId: string, cardId: string): Promise<void> {
    try {
      const knowledgeCard = await prisma.knowledgeCard.findFirst({
        where: {
          id: cardId,
          userId,
        },
      });

      if (!knowledgeCard) {
        throw new NotFoundError('Knowledge card not found');
      }

      await prisma.knowledgeCard.delete({
        where: { id: cardId },
      });

      logger.info('Knowledge card deleted successfully', {
        userId,
        cardId,
      });
    } catch (error) {
      logger.error('Failed to delete knowledge card', error, { userId, cardId });
      throw error;
    }
  }

  // 搜索知識卡片
  async searchKnowledgeCards(userId: string, params: SearchKnowledgeCardsParams) {
    try {
      const { query, category, tags, limit = 20, offset = 0 } = params;

      const whereClause: any = {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (category) {
        whereClause.category = category;
      }

      if (tags && tags.length > 0) {
        whereClause.AND = tags.map(tag => ({
          tags: {
            contains: tag,
          },
        }));
      }

      const [cards, total] = await Promise.all([
        prisma.knowledgeCard.findMany({
          where: whereClause,
          orderBy: {
            updatedAt: 'desc',
          },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            sourceDocument: {
              select: {
                id: true,
                title: true,
                fileName: true,
              },
            },
            sourceCrawlerResult: {
              select: {
                id: true,
                title: true,
                url: true,
                platform: true,
              },
            },
          },
        }),
        prisma.knowledgeCard.count({
          where: whereClause,
        }),
      ]);

      // 處理標籤
      const processedCards = cards.map(card => ({
        ...card,
        tags: card.tags ? card.tags.split(',').filter(Boolean) : [],
      }));

      return {
        cards: processedCards,
        total,
        limit,
        offset,
        query,
      };
    } catch (error) {
      logger.error('Failed to search knowledge cards', error, { userId, params });
      throw error;
    }
  }

  // 獲取知識卡片關聯
  async getKnowledgeConnections(userId: string, params: { cardId?: string; limit?: number }): Promise<KnowledgeConnection[]> {
    try {
      const { cardId, limit = 10 } = params;

      if (cardId) {
        // 獲取特定卡片的關聯
        const targetCard = await prisma.knowledgeCard.findFirst({
          where: { id: cardId, userId },
        });

        if (!targetCard) {
          throw new NotFoundError('Knowledge card not found');
        }

        // 獲取其他卡片
        const otherCards = await prisma.knowledgeCard.findMany({
          where: {
            userId,
            NOT: { id: cardId },
          },
          take: limit * 2, // 多取一些，後面會篩選
        });

        // 計算關聯度
        const connections: KnowledgeConnection[] = [];
        const targetTags = targetCard.tags ? targetCard.tags.split(',').filter(Boolean) : [];

        for (const card of otherCards) {
          const cardTags = card.tags ? card.tags.split(',').filter(Boolean) : [];
          const sharedTags = targetTags.filter(tag => cardTags.includes(tag));
          
          let relevanceScore = 0;
          let connectionReason = '';

          // 基於標籤的相似度
          if (sharedTags.length > 0) {
            relevanceScore += sharedTags.length * 0.3;
            connectionReason += `共享標籤: ${sharedTags.join(', ')}`;
          }

          // 基於分類的相似度
          if (card.category === targetCard.category) {
            relevanceScore += 0.2;
            connectionReason += connectionReason ? '; ' : '';
            connectionReason += `相同分類: ${card.category}`;
          }

          // 基於內容的相似度（簡單的關鍵字匹配）
          const targetWords = targetCard.content.toLowerCase().split(' ');
          const cardWords = card.content.toLowerCase().split(' ');
          const sharedWords = targetWords.filter(word => cardWords.includes(word) && word.length > 3);
          
          if (sharedWords.length > 0) {
            relevanceScore += Math.min(sharedWords.length * 0.1, 0.3);
            connectionReason += connectionReason ? '; ' : '';
            connectionReason += `內容相關`;
          }

          if (relevanceScore > 0.1) {
            connections.push({
              id: card.id,
              title: card.title,
              category: card.category,
              relevanceScore,
              sharedTags,
              connectionReason,
            });
          }
        }

        // 按相關度排序並限制數量
        return connections
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, limit);
      } else {
        // 獲取所有卡片的關聯統計
        const allCards = await prisma.knowledgeCard.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            category: true,
            tags: true,
          },
        });

        // 簡化版本：返回按分類分組的卡片
        const categoryGroups: { [key: string]: any[] } = {};
        
        allCards.forEach(card => {
          if (!categoryGroups[card.category]) {
            categoryGroups[card.category] = [];
          }
          categoryGroups[card.category].push(card);
        });

        const connections: KnowledgeConnection[] = [];
        
        Object.entries(categoryGroups).forEach(([category, cards]) => {
          if (cards.length > 1) {
            cards.forEach(card => {
              connections.push({
                id: card.id,
                title: card.title,
                category: card.category,
                relevanceScore: 0.5,
                sharedTags: [],
                connectionReason: `分類: ${category}`,
              });
            });
          }
        });

        return connections.slice(0, limit);
      }
    } catch (error) {
      logger.error('Failed to get knowledge connections', error, { userId, params });
      throw error;
    }
  }

  // 獲取知識統計
  async getKnowledgeStats(userId: string) {
    try {
      const [totalCards, categories, recentCards] = await Promise.all([
        prisma.knowledgeCard.count({ where: { userId } }),
        prisma.knowledgeCard.groupBy({
          by: ['category'],
          where: { userId },
          _count: { category: true },
        }),
        prisma.knowledgeCard.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            category: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        totalCards,
        categories: categories.map(cat => ({
          name: cat.category,
          count: cat._count.category,
        })),
        recentCards,
      };
    } catch (error) {
      logger.error('Failed to get knowledge stats', error, { userId });
      throw error;
    }
  }

  // 根據標籤獲取知識卡片
  async getKnowledgeCardsByTags(userId: string, tags: string[]) {
    try {
      const cards = await prisma.knowledgeCard.findMany({
        where: {
          userId,
          OR: tags.map(tag => ({
            tags: {
              contains: tag,
            },
          })),
        },
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      // 處理標籤
      const processedCards = cards.map(card => ({
        ...card,
        tags: card.tags ? card.tags.split(',').filter(Boolean) : [],
      }));

      return processedCards;
    } catch (error) {
      logger.error('Failed to get knowledge cards by tags', error, { userId, tags });
      throw error;
    }
  }

  // 獲取知識卡片分類
  async getKnowledgeCategories(userId: string) {
    try {
      const categories = await prisma.knowledgeCard.groupBy({
        by: ['category'],
        where: { userId },
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
      });

      return categories.map(cat => ({
        name: cat.category,
        count: cat._count.category,
      }));
    } catch (error) {
      logger.error('Failed to get knowledge categories', error, { userId });
      throw error;
    }
  }

  // 自動生成知識卡片（從文檔或爬蟲結果）
  async generateKnowledgeCardsFromDocument(userId: string, documentId: string) {
    try {
      const document = await prisma.document.findFirst({
        where: { id: documentId, userId },
        include: { analysis: true },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      if (!document.analysis) {
        throw new ValidationError('Document analysis not found. Please analyze the document first.');
      }

      // 解析分析結果
      const concepts = JSON.parse(document.analysis.concepts || '[]');
      const keywords = document.analysis.keywords.split(',').filter(Boolean);
      const topics = document.analysis.topics.split(',').filter(Boolean);

      const cards = [];

      // 為每個重要概念創建卡片
      for (const concept of concepts) {
        if (concept.importance >= 3) {
          const card = await this.createKnowledgeCard({
            userId,
            title: concept.name,
            content: concept.description,
            category: document.analysis.category,
            tags: [concept.name, ...keywords.slice(0, 3)],
            sourceDocumentId: documentId,
          });
          cards.push(card);
        }
      }

      logger.info('Knowledge cards generated from document', {
        userId,
        documentId,
        cardsCount: cards.length,
      });

      return cards;
    } catch (error) {
      logger.error('Failed to generate knowledge cards from document', error, { userId, documentId });
      throw error;
    }
  }
}

export const knowledgeService = new KnowledgeService();