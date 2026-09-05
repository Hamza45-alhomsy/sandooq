import { useMemo, useState } from "react";
import useSWR from "swr";
import { transactionsApi } from "@/features/transactions/api/transactionsApi";
import type { Transaction } from "@/features/transactions/types";

export const useTransactions = () => {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleTypeChange = (value: string | null) => {
    setType(value ?? "");
  };

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (search) params.append("search", search);
    if (type) params.append("type", type);
    if (startDate)
      params.append("startDate", startDate.toISOString().split("T")[0]);
    if (endDate) params.append("endDate", endDate.toISOString().split("T")[0]);

    return params.toString();
  }, [search, type, startDate, endDate]);

  const { data, error, isLoading } = useSWR<Transaction[]>(
    ["transactions", queryParams],
    () => transactionsApi.getTransactions(queryParams),
  );

  const clearFilters = () => {
    setSearch("");
    setType("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return {
    transactions: data ?? [],
    error,
    isLoading,
    search,
    type,
    startDate,
    endDate,
    setSearch,
    setType: handleTypeChange,
    setStartDate,
    setEndDate,
    clearFilters,
    hasFilters: Boolean(search || type || startDate || endDate),
  };
};
