import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authPersistenceMiddleware } from './authPersistenceMiddleware';
import { baseApi } from './api/baseApi';
import './api/authApi';
import './api/uploadsApi';
import './api/feedApi';
import './api/commentsApi';
import './api/usersApi';
import './api/blogsApi';
import './api/musicApi';
import './api/soundsApi';
import './api/storiesApi';
import './api/earningsApi';
import './api/notificationsApi';
import './api/adsApi';
import './api/withdrawalApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, authPersistenceMiddleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
