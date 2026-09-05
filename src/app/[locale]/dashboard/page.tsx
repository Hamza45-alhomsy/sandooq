// src/app/[locale]/dashboard/page.tsx
"use client";
import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/SearchInput";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const InvestorTooltip = ({
  active,
  payload,
  label,
  cumulativeNetLabel,
}: any) => {
  const { currency } = useSettings();
  const t = useTranslations();

  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border bg-background p-3 shadow-md">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {cumulativeNetLabel || t("Investor.cumulativeNet")}:{" "}
          {Number(payload[0].value ?? 0).toLocaleString()} {currency}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { currency } = useSettings();

  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuth();
  const { data, error, isLoading } = useSWR("/api/dashboard/stats", fetcher);
  const { data: transactions, isLoading: transactionsLoading } = useSWR(
    "/api/transactions",
    fetcher,
  );
  const { data: fund, isLoading: fundLoading } = useSWR("/api/fund", fetcher);
  const [selectedRange, setSelectedRange] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading || transactionsLoading || fundLoading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          {t("Common.loading")}
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-red-500">
          {t("Common.error")}: {error.message}
        </div>
      </MainLayout>
    );
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchableTransactions = (transactions || []).filter(
    (transaction: any) => {
      if (!normalizedSearch) return true;

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

      return searchableText.includes(normalizedSearch);
    },
  );

  const recentTransactions = searchableTransactions
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  const executedTransactions = searchableTransactions || [];

  const totalIncome =
    executedTransactions
      .filter((o: any) => o.type === "income")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const totalExpense =
    executedTransactions
      .filter((o: any) => o.type === "expense")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const monthlyData =
    executedTransactions.reduce((acc: any[], transaction: any) => {
      const month = new Date(transaction.createdAt).toLocaleDateString(
        "en-US",
        {
          month: "short",
        },
      );
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        if (transaction.type === "income")
          existing.income += transaction.totalAmount;
        else existing.expense += transaction.totalAmount;
      } else {
        acc.push({
          month,
          income: transaction.type === "income" ? transaction.totalAmount : 0,
          expense: transaction.type === "expense" ? transaction.totalAmount : 0,
        });
      }
      return acc;
    }, []) || [];

  const balanceTrend =
    executedTransactions
      .sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .reduce((acc: any[], transaction: any) => {
        const prevNet = acc.length > 0 ? acc[acc.length - 1].net : 0;
        const net =
          prevNet +
          (transaction.type === "income"
            ? transaction.totalAmount
            : -transaction.totalAmount);
        acc.push({
          date: new Date(transaction.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          net,
        });
        return acc;
      }, []) || [];

  if (balanceTrend.length === 0) {
    balanceTrend.push({ date: t("Investor.today"), net: 0 });
  }

  const getRangeStart = (range: typeof selectedRange) => {
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

  const filteredTransactions = searchableTransactions
    ? searchableTransactions.filter((transaction: any) => {
        const transactionDate = new Date(transaction.createdAt);
        const rangeStart = getRangeStart(selectedRange);
        return transactionDate >= rangeStart;
      })
    : [];

  const filteredTransactionsInRange = filteredTransactions;

  const filteredIncome = filteredTransactionsInRange
    .filter((o: any) => o.type === "income")
    .reduce((sum: number, o: any) => sum + o.totalAmount, 0);

  const filteredExpense = filteredTransactionsInRange
    .filter((o: any) => o.type === "expense")
    .reduce((sum: number, o: any) => sum + o.totalAmount, 0);

  const filteredTransactionCount = filteredTransactionsInRange.length;

  const averageTransactionAmount =
    filteredTransactionsInRange.length > 0
      ? filteredTransactionsInRange.reduce(
          (sum: number, transaction: any) =>
            sum + Number(transaction.totalAmount || 0),
          0,
        ) / filteredTransactionsInRange.length
      : 0;

  const filteredMonthlyData = filteredTransactionsInRange.reduce(
    (acc: any[], transaction: any) => {
      const month = new Date(transaction.createdAt).toLocaleDateString(
        "en-US",
        {
          month: "short",
        },
      );
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        if (transaction.type === "income")
          existing.income += transaction.totalAmount;
        else existing.expense += transaction.totalAmount;
      } else {
        acc.push({
          month,
          income: transaction.type === "income" ? transaction.totalAmount : 0,
          expense: transaction.type === "expense" ? transaction.totalAmount : 0,
        });
      }
      return acc;
    },
    [],
  );

  const categoryBreakdown = filteredTransactionsInRange.reduce(
    (
      acc: Record<string, { name: string; total: number; type: string }>,
      transaction: any,
    ) => {
      (transaction.items || []).forEach((item: any) => {
        const category = item.category;
        if (!category) return;
        const key = `${category.type}:${category.id}`;
        acc[key] = acc[key] || {
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

  const categoryChartData = Object.values(categoryBreakdown)
    .sort((a: any, b: any) => b.total - a.total)
    .map((item: any) => ({ ...item, total: Number(item.total || 0) }));

  const filteredBalanceTrend = filteredTransactionsInRange
    .sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .reduce((acc: any[], transaction: any) => {
      const prevNet = acc.length > 0 ? acc[acc.length - 1].net : 0;
      const net =
        prevNet +
        (transaction.type === "income"
          ? transaction.totalAmount
          : -transaction.totalAmount);
      acc.push({
        date: new Date(transaction.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        net,
      });
      return acc;
    }, []);

  const hasFilteredData = filteredTransactions.length > 0;

  const rangeOptions = [
    { key: "day", label: t("Investor.thisDay") },
    { key: "week", label: t("Investor.thisWeek") },
    { key: "month", label: t("Investor.thisMonth") },
    { key: "year", label: t("Investor.thisYear") },
  ] as const;

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="mt-3 max-w-xl">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("Dashboard.searchPlaceholder")}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              {t("Investor.fundBalanceTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {(fund?.currentBalance || 0).toLocaleString()} {currency}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Investor.fundBalanceNote")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              {t("Investor.totalTransactions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {data?.stats?.totalTransactions ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {rangeOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSelectedRange(option.key)}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              selectedRange === option.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              {t("Investor.totalIncome")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {filteredIncome.toLocaleString()} {currency}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              {t("Investor.totalExpense")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {filteredExpense.toLocaleString()} {currency}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              {t("Investor.totalTransactions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {filteredTransactionCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              {t("Dashboard.averageTransactionAmount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {averageTransactionAmount.toLocaleString()} {currency}
            </p>
          </CardContent>
        </Card>
      </div>

      {!transactionsLoading && !fundLoading && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">{t("Investor.title")}</h2>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("Investor.incomeVsExpense")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="income"
                        fill="#22c55e"
                        name={t("Investor.income")}
                      />
                      <Bar
                        dataKey="expense"
                        fill="#ef4444"
                        name={t("Investor.expense")}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("Investor.fundBalanceTrend")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredBalanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        content={
                          <InvestorTooltip
                            cumulativeNetLabel={t("Investor.cumulativeNet")}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="net"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            {!hasFilteredData && (
              <div className="mb-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                {t("Investor.noTransactionsInPeriod")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Transactions Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {t("Dashboard.recentTransactions")}
          </h2>
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              {t("Common.viewAll")}
            </Button>
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Transactions.transactionNumber")}</TableHead>
                  <TableHead>{t("Transactions.transactionTitle")}</TableHead>
                  <TableHead>{t("Transactions.amount")}</TableHead>
                  <TableHead>{t("Transactions.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction: any) => (
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      (window.location.href = `/transactions/${transaction.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      {transaction.transactionNumber}
                    </TableCell>
                    <TableCell>{transaction.description || "—"}</TableCell>
                    <TableCell>
                      {transaction.totalAmount?.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            {t("Dashboard.noRecentTransactions")}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
