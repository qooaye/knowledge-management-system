import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import documentSlice from './slices/documentSlice';
import crawlerSlice from './slices/crawlerSlice';
import knowledgeSlice from './slices/knowledgeSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    documents: documentSlice,
    crawler: crawlerSlice,
    knowledge: knowledgeSlice,
    ui: uiSlice,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;