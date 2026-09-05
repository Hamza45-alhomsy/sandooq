// src/app/[locale]/transactions/page.tsx
"use client";

import { useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { TransactionsFilters } from "@/features/transactions/components/TransactionsFilters";
import { TransactionsTable } from "@/features/transactions/components/TransactionsTable";

export default function TransactionsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuth();
  const { currency } = useSettings();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    transactions,
    error,
    isLoading,
    search,
    type,
    startDate,
    endDate,
    setSearch,
    setType,
    setStartDate,
    setEndDate,
    clearFilters,
    hasFilters,
  } = useTransactions();

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  if (isLoading)
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );

  if (error)
    return (
      <MainLayout>
        <div>
          {t("Common.error")}: {error.message}
        </div>
      </MainLayout>
    );

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Link href="/transactions/create">
          <Button className="w-full sm:w-auto">
            {t("Transactions.newTransaction")}
          </Button>
        </Link>
      </div>

      <TransactionsFilters
        search={search}
        type={type}
        startDate={startDate}
        endDate={endDate}
        locale={locale}
        onSearchChange={setSearch}
        onTypeChange={setType}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={() => {
          clearFilters();
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }}
        hasFilters={hasFilters}
        t={t}
      />

      <TransactionsTable
        transactions={transactions}
        currency={currency}
        t={t}
      />
    </MainLayout>
  );
}
