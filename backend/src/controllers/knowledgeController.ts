import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { knowledgeService } from '../services/knowledgeService';
import { createLogger } from '../utils/logger';
import { sendSuccess, sendError, asyncHandler } from '../middleware/error';

const logger = createLogger('Knowledge Controller');

export class KnowledgeController {
  // 獲取知識卡片列表
  getKnowledgeCards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { category, tags, limit = 20, offset = 0 } = req.query;

    const filters = {
      category: category as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: Number(limit),
      offset: Number(offset),
    };

    const result = await knowledgeService.getKnowledgeCards(userId, filters);

    logger.info('Knowledge cards retrieved successfully', {
      userId,
      count: result.cards.length,
      total: result.total,
    });

    sendSuccess(res, result, 'Knowledge cards retrieved successfully');
  });

  // 創建知識卡片
  createKnowledgeCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { title, content, category, tags, sourceDocumentId, sourceCrawlerResultId } = req.body;

    const knowledgeCard = await knowledgeService.createKnowledgeCard({
      userId,
      title,
      content,
      category,
      tags,
      sourceDocumentId,
      sourceCrawlerResultId,
    });

    logger.info('Knowledge card created successfully', {
      userId,
      cardId: knowledgeCard.id,
      title,
    });

    sendSuccess(res, knowledgeCard, 'Knowledge card created successfully', 201);
  });

  // 獲取單個知識卡片
  getKnowledgeCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const knowledgeCard = await knowledgeService.getKnowledgeCard(userId, id);

    logger.info('Knowledge card retrieved successfully', {
      userId,
      cardId: id,
    });

    sendSuccess(res, knowledgeCard, 'Knowledge card retrieved successfully');
  });

  // 更新知識卡片
  updateKnowledgeCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData = req.body;

    const knowledgeCard = await knowledgeService.updateKnowledgeCard(userId, id, updateData);

    logger.info('Knowledge card updated successfully', {
      userId,
      cardId: id,
      changes: updateData,
    });

    sendSuccess(res, knowledgeCard, 'Knowledge card updated successfully');
  });

  // 刪除知識卡片
  deleteKnowledgeCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    await knowledgeService.deleteKnowledgeCard(userId, id);

    logger.info('Knowledge card deleted successfully', {
      userId,
      cardId: id,
    });

    sendSuccess(res, null, 'Knowledge card deleted successfully');
  });

  // 搜索知識卡片
  searchKnowledgeCards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { q, category, tags, limit = 20, offset = 0 } = req.query;

    const searchParams = {
      query: q as string,
      category: category as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: Number(limit),
      offset: Number(offset),
    };

    const result = await knowledgeService.searchKnowledgeCards(userId, searchParams);

    logger.info('Knowledge cards search completed', {
      userId,
      query: q,
      count: result.cards.length,
      total: result.total,
    });

    sendSuccess(res, result, 'Knowledge cards search completed');
  });

  // 獲取知識卡片關聯
  getKnowledgeConnections = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { cardId, limit = 10 } = req.query;

    const connections = await knowledgeService.getKnowledgeConnections(userId, {
      cardId: cardId as string,
      limit: Number(limit),
    });

    logger.info('Knowledge connections retrieved successfully', {
      userId,
      cardId,
      connectionCount: connections.length,
    });

    sendSuccess(res, connections, 'Knowledge connections retrieved successfully');
  });

  // 獲取知識統計
  getKnowledgeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const stats = await knowledgeService.getKnowledgeStats(userId);

    logger.info('Knowledge stats retrieved successfully', {
      userId,
      totalCards: stats.totalCards,
    });

    sendSuccess(res, stats, 'Knowledge stats retrieved successfully');
  });

  // 根據標籤獲取知識卡片
  getKnowledgeCardsByTags = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { tags } = req.query;

    if (!tags) {
      return sendError(res, 'Tags parameter is required', 400);
    }

    const tagArray = (tags as string).split(',');
    const cards = await knowledgeService.getKnowledgeCardsByTags(userId, tagArray);

    logger.info('Knowledge cards by tags retrieved successfully', {
      userId,
      tags: tagArray,
      count: cards.length,
    });

    sendSuccess(res, cards, 'Knowledge cards by tags retrieved successfully');
  });

  // 獲取知識卡片分類
  getKnowledgeCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const categories = await knowledgeService.getKnowledgeCategories(userId);

    logger.info('Knowledge categories retrieved successfully', {
      userId,
      count: categories.length,
    });

    sendSuccess(res, categories, 'Knowledge categories retrieved successfully');
  });
}

export const knowledgeController = new KnowledgeController();