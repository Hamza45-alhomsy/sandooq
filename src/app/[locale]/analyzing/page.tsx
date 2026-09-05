// src/app/[locale]/analyzing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";
import { SearchInput } from "@/components/SearchInput";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

export default function AnalyzingPage() {
  const t = useTranslations("Investor");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const { currency } = useSettings();
  const [selectedRange, setSelectedRange] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [selectedIncomeCategoryIds, setSelectedIncomeCategoryIds] = useState<
    number[]
  >([]);
  const [selectedExpenseCategoryIds, setSelectedExpenseCategoryIds] = useState<
    number[]
  >([]);
  const { data: transactions, isLoading: transactionsLoading } = useSWR(
    "/api/transactions",
    fetcher,
    {
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
  const { data: categories = [] } = useSWR("/api/categories", fetcher, {
    revalidateOnMount: true,
    revalidateIfStale: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
  const { data: fund, isLoading: fundLoading } = useSWR("/api/fund", fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const shouldShowLoading = transactionsLoading || fundLoading;

  const executedTransactions = transactions || [];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const rangeStart = fromDate
    ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
    : toDate
      ? new Date(0)
      : getRangeStart(selectedRange);
  const rangeEnd = toDate
    ? new Date(
        toDate.getFullYear(),
        toDate.getMonth(),
        toDate.getDate(),
        23,
        59,
        59,
        999,
      )
    : null;

  const filteredTransactionsInRange = executedTransactions.filter(
    (transaction: any) => {
      const transactionDate = new Date(transaction.createdAt);
      const itemText = (transaction.items || [])
        .flatMap((item: any) => [
          item.description,
          item.category?.name,
          item.category?.nameAr,
        ])
        .filter(Boolean)
        .join(" ");
      const searchableText = [
        transaction.transactionNumber,
        transaction.description,
        transaction.type,
        transaction.totalAmount,
        transaction.user?.fullName,
        transaction.user?.email,
        itemText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        transactionDate >= rangeStart &&
        (!rangeEnd || transactionDate <= rangeEnd) &&
        (!normalizedSearch || searchableText.includes(normalizedSearch))
      );
    },
  );

  const totalIncome =
    filteredTransactionsInRange
      .filter((o: any) => o.type === "income")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const totalExpense =
    filteredTransactionsInRange
      .filter((o: any) => o.type === "expense")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const averageTransactionAmount =
    filteredTransactionsInRange.length > 0
      ? filteredTransactionsInRange.reduce(
          (sum: number, transaction: any) =>
            sum + Number(transaction.totalAmount || 0),
          0,
        ) / filteredTransactionsInRange.length
      : 0;

  const categoryTotals = filteredTransactionsInRange.reduce(
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
          name:
            locale === "ar" ? category.nameAr || category.name : category.name,
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

  const incomeCategoryIdsKey = incomeCategoryData
    .map((category: any) => category.id)
    .sort((first: number, second: number) => first - second)
    .join(",");
  const expenseCategoryIdsKey = expenseCategoryData
    .map((category: any) => category.id)
    .sort((first: number, second: number) => first - second)
    .join(",");

  useEffect(() => {
    const categoryIds = incomeCategoryIdsKey
      ? incomeCategoryIdsKey.split(",").map(Number)
      : [];
    setSelectedIncomeCategoryIds((current) => {
      const next =
        current.length === 0
          ? categoryIds
          : [
              ...current.filter((id) => categoryIds.includes(id)),
              ...categoryIds.filter((id) => !current.includes(id)),
            ];
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [incomeCategoryIdsKey]);

  useEffect(() => {
    const categoryIds = expenseCategoryIdsKey
      ? expenseCategoryIdsKey.split(",").map(Number)
      : [];
    setSelectedExpenseCategoryIds((current) => {
      const next =
        current.length === 0
          ? categoryIds
          : [
              ...current.filter((id) => categoryIds.includes(id)),
              ...categoryIds.filter((id) => !current.includes(id)),
            ];
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [expenseCategoryIdsKey]);

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

  const clearFilters = () => {
    setSearchQuery("");
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedRange("month");
  };

  const dateFormat = locale === "ar" ? "dd/MM/yyyy" : "MM/dd/yyyy";

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
                aria-pressed={isSelected}
                title={isSelected ? t("clearAll") : t("selectAll")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? type === "income"
                      ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300"
                      : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
                    : "border-muted bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {locale === "ar"
                  ? category.nameAr || category.name
                  : category.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

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
      <div className="mb-4 rounded-md border bg-muted/20 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium">
              {tCommon("search")}
            </label>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1 text-sm font-medium">
            <span>{tCommon("from")}</span>
            <Popover>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-[150px] justify-start text-left font-normal",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, dateFormat) : tCommon("from")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  disabled={(date) => Boolean(toDate && date > toDate)}
                  locale={locale === "ar" ? ar : undefined}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1 text-sm font-medium">
            <span>{tCommon("to")}</span>
            <Popover>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-[150px] justify-start text-left font-normal",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, dateFormat) : tCommon("to")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  disabled={(date) => Boolean(fromDate && date < fromDate)}
                  locale={locale === "ar" ? ar : undefined}
                />
              </PopoverContent>
            </Popover>
          </div>
          {(searchQuery || fromDate || toDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              {tCommon("clear")}
            </Button>
          )}
        </div>
      </div>

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

      <div className="mx-auto mt-6 grid max-w-5xl gap-4 grid-cols-1 lg:grid-cols-2">
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
              compact
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
              compact
            />
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentTransactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactionsInRange.length > 0 ? (
              <div className="space-y-2">
                {filteredTransactionsInRange
                  .slice(0, 10)
                  .map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between border-b py-1.5"
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
