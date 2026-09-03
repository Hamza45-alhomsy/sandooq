// src/app/[locale]/investor/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";

const getRangeStart = (range: "day" | "week" | "month" | "year") => {
  const today = new Date();

  switch (range) {
    case "day": {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "week": {
      const start = new Date(today);
      const day = start.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "month": {
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }
    case "year": {
      return new Date(today.getFullYear(), 0, 1);
    }
    default:
      return new Date(today.getFullYear(), today.getMonth(), 1);
  }
};

export default function InvestorPage() {
  const t = useTranslations("Investor");
  const tCommon = useTranslations("Common");
  const { currency } = useSettings();
  const [selectedRange, setSelectedRange] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [selectedIncomeCategoryIds, setSelectedIncomeCategoryIds] = useState<
    number[]
  >([]);
  const [selectedExpenseCategoryIds, setSelectedExpenseCategoryIds] = useState<
    number[]
  >([]);
  const [incomeCategoriesInitialized, setIncomeCategoriesInitialized] =
    useState(false);
  const [expenseCategoriesInitialized, setExpenseCategoriesInitialized] =
    useState(false);

  const { user } = useAuth();
  const { data: transactions, isLoading: transactionsLoading } = useSWR(
    user?.role === "investor" ||
      user?.permissions.includes("transaction:view_all")
      ? "/api/transactions"
      : null,
    fetcher,
  );
  const { data: categories = [] } = useSWR("/api/categories", fetcher);
  const { data: fund, isLoading: fundLoading } = useSWR("/api/fund", fetcher);

  const isInvestor =
    user?.permissions.includes("transaction:view_all") ||
    user?.role === "investor";
  const shouldShowAccessDenied = !isInvestor;
  const shouldShowLoading = transactionsLoading || fundLoading;

  const executedTransactions =
    transactions?.filter((o: any) => o.status === "approved") || [];

  const filteredApprovedTransactions = executedTransactions.filter(
    (transaction: any) => {
      const transactionDate = new Date(transaction.createdAt);
      return transactionDate >= getRangeStart(selectedRange);
    },
  );

  const totalIncome =
    filteredApprovedTransactions
      .filter((o: any) => o.type === "income")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const totalExpense =
    filteredApprovedTransactions
      .filter((o: any) => o.type === "expense")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const averageTransactionAmount =
    filteredApprovedTransactions.length > 0
      ? filteredApprovedTransactions.reduce(
          (sum: number, transaction: any) =>
            sum + Number(transaction.totalAmount || 0),
          0,
        ) / filteredApprovedTransactions.length
      : 0;

  const categoryTotals = filteredApprovedTransactions.reduce(
    (
      acc: Record<
        string,
        { id: number; name: string; total: number; type: string }
      >,
      transaction: any,
    ) => {
      (transaction.items || []).forEach((item: any) => {
        const category =
          item.category ||
          categories.find((c: any) => c.id === item.categoryId);
        if (!category) return;
        const key = `${category.type}:${category.id}`;
        acc[key] = acc[key] || {
          id: category.id,
          name: category.name,
          total: 0,
          type: category.type,
        };
        acc[key].total += Number(
          item.totalPrice || item.quantity * item.unitPrice || 0,
        );
      });
      return acc;
    },
    {},
  );

  const categoryData = Object.values(categoryTotals)
    .sort((a: any, b: any) => b.total - a.total)
    .map((item: any) => ({
      ...item,
      total: Number(item.total || 0),
    }));

  const incomeCategoryData = categoryData.filter(
    (category: any) => category.type === "income",
  );
  const expenseCategoryData = categoryData.filter(
    (category: any) => category.type === "expense",
  );

  useEffect(() => {
    if (incomeCategoryData.length > 0 && !incomeCategoriesInitialized) {
      setSelectedIncomeCategoryIds(
        incomeCategoryData.map((category: any) => category.id),
      );
      setIncomeCategoriesInitialized(true);
    }
  }, [incomeCategoryData, incomeCategoriesInitialized]);

  useEffect(() => {
    if (expenseCategoryData.length > 0 && !expenseCategoriesInitialized) {
      setSelectedExpenseCategoryIds(
        expenseCategoryData.map((category: any) => category.id),
      );
      setExpenseCategoriesInitialized(true);
    }
  }, [expenseCategoryData, expenseCategoriesInitialized]);

  const toggleCategorySelection = (
    type: "income" | "expense",
    categoryId: number,
  ) => {
    if (type === "income") {
      setSelectedIncomeCategoryIds((current) => {
        if (current.includes(categoryId)) {
          return current.filter((id) => id !== categoryId);
        }
        return [...current, categoryId];
      });
      return;
    }

    setSelectedExpenseCategoryIds((current) => {
      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      }
      return [...current, categoryId];
    });
  };

  const visibleIncomeCategoryData = incomeCategoryData.filter((category: any) =>
    selectedIncomeCategoryIds.includes(category.id),
  );
  const visibleExpenseCategoryData = expenseCategoryData.filter(
    (category: any) => selectedExpenseCategoryIds.includes(category.id),
  );

  const rangeOptions = [
    { key: "day", label: t("thisDay") },
    { key: "week", label: t("thisWeek") },
    { key: "month", label: t("thisMonth") },
    { key: "year", label: t("thisYear") },
  ] as const;

  const renderCategorySelectors = (
    type: "income" | "expense",
    categories: any[],
  ) => {
    const selectedIds =
      type === "income"
        ? selectedIncomeCategoryIds
        : selectedExpenseCategoryIds;

    return (
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("categories")}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() =>
                type === "income"
                  ? setSelectedIncomeCategoryIds(
                      categories.map((category: any) => category.id),
                    )
                  : setSelectedExpenseCategoryIds(
                      categories.map((category: any) => category.id),
                    )
              }
              className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("selectAll")}
            </button>
            <button
              type="button"
              onClick={() =>
                type === "income"
                  ? setSelectedIncomeCategoryIds([])
                  : setSelectedExpenseCategoryIds([])
              }
              className="rounded-md border border-muted-foreground/30 bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            >
              {t("clearAll")}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category: any) => {
            const isSelected = selectedIds.includes(category.id);

            return (
              <button
                key={`${type}-${category.id}`}
                type="button"
                onClick={() => toggleCategorySelection(type, category.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? type === "income"
                      ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300"
                      : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
                    : "border-muted bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (shouldShowAccessDenied) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center text-red-500">
          {t("accessDenied")}
        </div>
      </MainLayout>
    );
  }

  if (shouldShowLoading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          {tCommon("loading")}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {rangeOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSelectedRange(option.key)}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              selectedRange === option.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              {t("totalIncome")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {totalIncome.toLocaleString()} {currency}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              {t("totalExpense")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {totalExpense.toLocaleString()} {currency}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("averageTransactionAmount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {averageTransactionAmount.toLocaleString()} {currency}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("fundBalanceTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {(fund?.currentBalance || 0).toLocaleString()} {currency}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("fundBalanceNote") || "Incomes - Expenses"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("income")} {t("categoryBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderCategorySelectors("income", incomeCategoryData)}
            <CategoryPieChart
              data={visibleIncomeCategoryData.map((category: any) => ({
                name: category.name,
                value: Number(category.total || 0),
              }))}
              emptyMessage={t("noTransactionsInPeriod")}
              palette="green"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("expense")} {t("categoryBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderCategorySelectors("expense", expenseCategoryData)}
            <CategoryPieChart
              data={visibleExpenseCategoryData.map((category: any) => ({
                name: category.name,
                value: Number(category.total || 0),
              }))}
              emptyMessage={t("noTransactionsInPeriod")}
              palette="red"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentTransactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredApprovedTransactions.length > 0 ? (
              <div className="space-y-2">
                {filteredApprovedTransactions
                  .slice(0, 10)
                  .map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between border-b py-2"
                    >
                      <div>
                        <p className="font-medium">
                          {transaction.description ||
                            transaction.transactionNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {transaction.totalAmount.toLocaleString()} {currency}
                        </p>
                        <Badge
                          variant={
                            transaction.type === "income"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {transaction.type === "income"
                            ? t("income")
                            : t("expense")}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                {t("noTransactions")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
