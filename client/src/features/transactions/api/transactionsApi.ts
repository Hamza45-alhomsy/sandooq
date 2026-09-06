import { fetcher } from "@/lib/api/fetcher";
import type { Transaction } from "@/features/transactions/types";

export const transactionsApi = {
  getTransactions: async (queryParams?: string) => {
    const url = queryParams ? `/api/transactions?${queryParams}` : "/api/transactions";
    return fetcher(url) as Promise<Transaction[]>;
  },

  getorderById: async (id: number | string) => {
    return fetcher(`/api/transactions/${id}`) as Promise<Transaction>;
  },
};
