import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { KnowledgeCard, CardConnection, KnowledgeGraph, SearchResult } from '../../types';
import { knowledgeService } from '../../services/knowledgeService';

interface KnowledgeState {
  cards: KnowledgeCard[];
  currentCard: KnowledgeCard | null;
  connections: CardConnection[];
  searchResults: SearchResult[];
  knowledgeGraph: KnowledgeGraph | null;
  loading: boolean;
  searching: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

const initialState: KnowledgeState = {
  cards: [],
  currentCard: null,
  connections: [],
  searchResults: [],
  knowledgeGraph: null,
  loading: false,
  searching: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    hasMore: false,
  },
};

// 異步 thunks
export const fetchCards = createAsyncThunk(
  'knowledge/fetchCards',
  async (params: { page?: number; limit?: number; category?: string; tags?: string[] }) => {
    const response = await knowledgeService.getCards(params);
    return response.data;
  }
);

export const fetchCard = createAsyncThunk(
  'knowledge/fetchCard',
  async (id: string) => {
    const response = await knowledgeService.getCard(id);
    return response.data;
  }
);

export const createCard = createAsyncThunk(
  'knowledge/createCard',
  async (cardData: Omit<KnowledgeCard, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'connections'>) => {
    const response = await knowledgeService.createCard(cardData);
    return response.data;
  }
);

export const updateCard = createAsyncThunk(
  'knowledge/updateCard',
  async (params: { id: string; data: Partial<KnowledgeCard> }) => {
    const response = await knowledgeService.updateCard(params.id, params.data);
    return response.data;
  }
);

export const deleteCard = createAsyncThunk(
  'knowledge/deleteCard',
  async (id: string) => {
    await knowledgeService.deleteCard(id);
    return id;
  }
);

export const searchCards = createAsyncThunk(
  'knowledge/searchCards',
  async (params: { query: string; filters?: any }) => {
    const response = await knowledgeService.searchCards(params);
    return response.data;
  }
);

export const fetchConnections = createAsyncThunk(
  'knowledge/fetchConnections',
  async (cardId?: string) => {
    const response = await knowledgeService.getConnections(cardId);
    return response.data;
  }
);

export const createConnection = createAsyncThunk(
  'knowledge/createConnection',
  async (connectionData: Omit<CardConnection, 'id' | 'createdAt'>) => {
    const response = await knowledgeService.createConnection(connectionData);
    return response.data;
  }
);

export const fetchKnowledgeGraph = createAsyncThunk(
  'knowledge/fetchKnowledgeGraph',
  async (params?: { category?: string; depth?: number }) => {
    const response = await knowledgeService.getKnowledgeGraph(params);
    return response.data;
  }
);

export const findSimilarCards = createAsyncThunk(
  'knowledge/findSimilarCards',
  async (cardId: string) => {
    const response = await knowledgeService.findSimilarCards(cardId);
    return response.data;
  }
);

const knowledgeSlice = createSlice({
  name: 'knowledge',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setCurrentCard: (state, action: PayloadAction<KnowledgeCard | null>) => {
      state.currentCard = action.payload;
    },
    clearSearchResults: state => {
      state.searchResults = [];
    },
    addCard: (state, action: PayloadAction<KnowledgeCard>) => {
      state.cards.unshift(action.payload);
    },
    updateCardInList: (state, action: PayloadAction<KnowledgeCard>) => {
      const index = state.cards.findIndex(card => card.id === action.payload.id);
      if (index !== -1) {
        state.cards[index] = action.payload;
      }
    },
  },
  extraReducers: builder => {
    builder
      // Fetch Cards
      .addCase(fetchCards.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCards.fulfilled, (state, action) => {
        state.loading = false;
        const { data, total, page, limit, hasMore } = action.payload;
        
        if (page === 1) {
          state.cards = data;
        } else {
          state.cards = [...state.cards, ...data];
        }
        
        state.pagination = { total, page, limit, hasMore };
      })
      .addCase(fetchCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cards';
      })
      // Fetch Card
      .addCase(fetchCard.fulfilled, (state, action) => {
        state.currentCard = action.payload;
      })
      // Create Card
      .addCase(createCard.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCard.fulfilled, (state, action) => {
        state.loading = false;
        state.cards.unshift(action.payload);
      })
      .addCase(createCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create card';
      })
      // Update Card
      .addCase(updateCard.fulfilled, (state, action) => {
        const index = state.cards.findIndex(card => card.id === action.payload.id);
        if (index !== -1) {
          state.cards[index] = action.payload;
        }
        if (state.currentCard?.id === action.payload.id) {
          state.currentCard = action.payload;
        }
      })
      // Delete Card
      .addCase(deleteCard.fulfilled, (state, action) => {
        state.cards = state.cards.filter(card => card.id !== action.payload);
        if (state.currentCard?.id === action.payload) {
          state.currentCard = null;
        }
      })
      // Search Cards
      .addCase(searchCards.pending, state => {
        state.searching = true;
        state.error = null;
      })
      .addCase(searchCards.fulfilled, (state, action) => {
        state.searching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchCards.rejected, (state, action) => {
        state.searching = false;
        state.error = action.error.message || 'Failed to search cards';
      })
      // Fetch Connections
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.connections = action.payload;
      })
      // Create Connection
      .addCase(createConnection.fulfilled, (state, action) => {
        state.connections.push(action.payload);
      })
      // Fetch Knowledge Graph
      .addCase(fetchKnowledgeGraph.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchKnowledgeGraph.fulfilled, (state, action) => {
        state.loading = false;
        state.knowledgeGraph = action.payload;
      })
      .addCase(fetchKnowledgeGraph.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch knowledge graph';
      });
  },
});

export const {
  clearError,
  setCurrentCard,
  clearSearchResults,
  addCard,
  updateCardInList,
} = knowledgeSlice.actions;

export default knowledgeSlice.reducer;