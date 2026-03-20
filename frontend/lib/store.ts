```typescript
// store.ts

import { create } from 'zustand';

interface DraftTransaction {
  type: 'income' | 'expense' | null;
  amount: number | null;
  categoryId: string | null;
  note: string | null;
  date: Date | null;
}

interface DashboardState {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  setPrevMonth: () => void;
  setNextMonth: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface TransactionState {
  draftTransaction: DraftTransaction;
  setDraftField: <K extends keyof DraftTransaction>(
    field: K,
    value: DraftTransaction[K]
  ) => void;
  resetDraft: () => void;
}

interface QuickParseResponse {
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  note: string;
}

interface ParserState {
  isParsingText: boolean;
  setIsParsingText: (loading: boolean) => void;
  parsedPreview: QuickParseResponse | null;
  setParsedPreview: (preview: QuickParseResponse | null) => void;
  parseError: string | null;
  setParseError: (error: string | null) => void;
}

const initialDraftTransaction: DraftTransaction = {
  type: null,
  amount: null,
  categoryId: null,
  note: null,
  date: null,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedMonth: new Date(),
  setSelectedMonth: (date) => set({ selectedMonth: date }),
  setPrevMonth: () =>
    set((state) => {
      const prev = new Date(state.selectedMonth);
      prev.setMonth(prev.getMonth() - 1);
      return { selectedMonth: prev };
    }),
  setNextMonth: () =>
    set((state) => {
      const next = new Date(state.selectedMonth);
      next.setMonth(next.getMonth() + 1);
      return { selectedMonth: next };
    }),
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export const useTransactionStore = create<TransactionState>((set) => ({
  draftTransaction: initialDraftTransaction,
  setDraftField: (field, value) =>
    set((state) => ({
      draftTransaction: { ...state.draftTransaction, [field]: value },
    })),
  resetDraft: () => set({ draftTransaction: initialDraftTransaction }),
}));

export const useParserStore = create<ParserState>((set) => ({
  isParsingText: false,
  setIsParsingText: (loading) => set({ isParsingText: loading }),
  parsedPreview: null,
  setParsedPreview: (preview) => set({ parsedPreview: preview }),
  parseError: null,
  setParseError: (error) => set({ parseError: error }),
}));
```

// --- QUERIES ---

```typescript
// queries.ts

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  useQuery,
  useMutation,
  UseQueryResult,
  UseMutationResult,
  QueryClient,
} from '@tanstack/react-query';
import { useAuthStore } from './authStore';
import { useParserStore, useTransactionStore, useDashboardStore } from './store';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  note: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
  categoryId?: string;
  page?: number;
  limit?: number;
}

interface TransactionsResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

interface MonthlySummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

interface YearlySummary {
  year: number;
  months: MonthlySummary[];
}

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  spent: number;
  period: 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}

interface CreateTransactionRequest {
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  date: string;
  note?: string;
}

interface CreateBudgetRequest {
  category_id: string;
  amount: number;
  period: 'monthly' | 'yearly';
}

interface QuickParseResponse {
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  note: string;
}

const API_BASE_URL = 'http://localhost:8000/api/v1';

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshed = await useAuthStore.getState().refreshToken();
          if (refreshed) {
            const token = useAuthStore.getState().token;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          }
        } catch {
          useAuthStore.getState().logout();
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const axiosInstance = createAxiosInstance();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

export const QUERY_KEYS = {
  transactions: (filters?: TransactionFilters) => [
    'transactions',
    filters,
  ] as const,
  transaction: (id: string) => ['transaction', id] as const,
  summaryMonthly: (year: number, month: number) =>
    ['summary', 'monthly', year, month] as const,
  summaryYearly: (year: number) => ['summary', 'yearly', year] as const,
  categories: () => ['categories'] as const,
  budgetsCurrent: () => ['budgets', 'current'] as const,
};

export const useTransactions = (
  filters?: TransactionFilters
): UseQueryResult<TransactionsResponse, Error> =>
  useQuery({
    queryKey: QUERY_KEYS.transactions(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('start_date', filters.startDate);
      if (filters?.endDate) params.append('end_date', filters.endDate);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.categoryId) params.append('category_id', filters.categoryId);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const { data } = await axiosInstance.get<TransactionsResponse>(
        `/transactions?${params.toString()}`
      );
      return data;
    },
    staleTime: 60 * 1000,
  });

export const useTransaction = (
  id: string
): UseQueryResult<Transaction, Error> =>
  useQuery({
    queryKey: QUERY_KEYS.transaction(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<Transaction>(
        `/transactions/${id}`
      );
      return data;
    },
  });

export const useSummaryMonthly = (
  year: number,
  month: number
): UseQueryResult<MonthlySummary, Error> =>
  useQuery({
    queryKey: QUERY_KEYS.summaryMonthly(year, month),
    queryFn: async () => {
      const { data } = await axiosInstance.get<MonthlySummary>(
        `/summary/monthly?year=${year}&month=${month}`
      );
      return data;
    },
    staleTime: 60 * 1000,
  });

export const useSummaryYearly = (
  year: number
): UseQueryResult<YearlySummary, Error> =>
  useQuery({
    queryKey: QUERY_KEYS.summaryYearly(year),
    queryFn: async () => {
      const { data } = await axiosInstance.get<YearlySummary>(
        `/summary/yearly?year=${year}`
      );
      return data;
    },
    staleTime: 60 * 1000,
  });

export const useCategories = (): UseQueryResult<Category[], Error> =>
  useQuery({
    queryKey: QUERY_KEYS.categories(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<Category[]>('/categories');
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

export const useBudgetsCurrent = (): UseQueryResult<Budget[], Error> =>
  useQuery({
    queryKey: QUERY_KEYS.budgetsCurrent(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<Budget[]>('/budgets/current');
      return data;
    },
    staleTime: 60 * 1000,
  });

export const useMutationCreateTransaction = (): UseMutationResult<
  Transaction,
  Error,
  CreateTransactionRequest
> =>
  useMutation({
    mutationFn: async (request: CreateTransactionRequest) => {
      const { data } = await axiosInstance.post<Transaction>(
        '/transactions',
        request
      );
      return data;
    },
    onSuccess: (newTransaction) => {
      const dashboardState = useDashboardStore.getState();
      const year = dashboardState.selectedMonth.getFullYear();
      const month = dashboardState.selectedMonth.getMonth() + 1;

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.transactions(),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.summaryMonthly(year, month),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.summaryYearly(year),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.budgetsCurrent(),
      });

      useTransactionStore.getState().resetDraft();
    },
  });

export const useMutationQuickParse = (): UseMutationResult<
  QuickParseResponse,
  Error,
  string,
  unknown
> => {
  const parserStore = useParserStore();
  const transactionStore = useTransactionStore();

  return useMutation({
    mutationFn: async (text: string) => {
      parserStore.setIsParsingText(true);
      parserStore.setParseError(null);
      const { data } = await axiosInstance.post<QuickParseResponse>(
        '/transactions/quick-parse',
        { text }
      );
      return data;
    },
    onSuccess: (parsed) => {
      parserStore.setParsedPreview(parsed);
      transactionStore.setDraftField('type', parsed.type);
      transactionStore.setDraftField('amount', parsed.amount);
      transactionStore.setDraftField('categoryId', parsed.categoryId);
      transactionStore.setDraftField('note', parsed.note);
      parserStore.setIsParsingText(false);
    },
    onError: (error) => {
      parserStore.setParseError(
        error instanceof Error ? error.message : 'Parse failed'
      );
      parserStore.setIsParsingText(false);
    },
  });
};

export const useMutationCreateBudget = (): UseMutationResult<
  Budget,
  Error,
  CreateBudgetRequest
> =>
  useMutation({
    mutationFn: async (request: CreateBudgetRequest) => {
      const { data } = await axiosInstance.post<Budget>('/budgets', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.budgetsCurrent(),
      });
    },
  });
```