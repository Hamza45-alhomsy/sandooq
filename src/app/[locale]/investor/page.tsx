// src/app/[locale]/investor/page.tsx
"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export default function InvestorPage() {
  const t = useTranslations("Investor");
  const tCommon = useTranslations("Common"); // ✅ Separate hook for Common

  const { user } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useSWR(
    user?.role === "investor" || user?.permissions.includes("order:view_all")
      ? "/api/orders"
      : null,
    fetcher,
  );
  const { data: fund, isLoading: fundLoading } = useSWR("/api/fund", fetcher);

  const isInvestor =
    user?.permissions.includes("order:view_all") || user?.role === "investor";

  if (!isInvestor) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center text-red-500">
          Access Denied: Investor permissions required
        </div>
      </MainLayout>
    );
  }

  if (ordersLoading || fundLoading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          {tCommon("loading")}
        </div>
      </MainLayout>
    );
  }

  // Calculate totals
  const totalIncome =
    orders
      ?.filter((o: any) => o.type === "income")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const totalExpense =
    orders
      ?.filter((o: any) => o.type === "expense")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;

  const netProfit = totalIncome - totalExpense;

  // Prepare income vs expense data for bar chart
  const monthlyData =
    orders?.reduce((acc: any[], order: any) => {
      const month = new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
      });
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        if (order.type === "income") existing.income += order.totalAmount;
        else existing.expense += order.totalAmount;
      } else {
        acc.push({
          month,
          income: order.type === "income" ? order.totalAmount : 0,
          expense: order.type === "expense" ? order.totalAmount : 0,
        });
      }
      return acc;
    }, []) || [];

  // Fund balance trend – prepare data points
  const balanceTrend =
    orders
      ?.filter((o: any) => o.status === "executed")
      .sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .reduce((acc: any[], order: any) => {
        const prevBalance =
          acc.length > 0
            ? acc[acc.length - 1].balance
            : fund?.currentBalance || 0;
        const newBalance =
          order.type === "income"
            ? prevBalance + order.totalAmount
            : prevBalance - order.totalAmount;
        acc.push({
          date: new Date(order.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          balance: newBalance,
        });
        return acc;
      }, []) || [];

  // If no transactions, show current balance as a single point
  if (balanceTrend.length === 0 && fund) {
    balanceTrend.push({
      date: "Today",
      balance: fund.currentBalance || 0,
    });
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              {t("totalIncome")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {totalIncome.toLocaleString()} SYP
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
              {totalExpense.toLocaleString()} SYP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              {t("netProfit")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}
            >
              {netProfit.toLocaleString()} SYP
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
              {fund?.currentBalance?.toLocaleString() || 0} SYP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("incomeVsExpense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" name={t("income")} />
                  <Bar dataKey="expense" fill="#ef4444" name={t("expense")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("fundBalanceTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="balance"
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

      {/* Recent Transactions */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentTransactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {orders?.filter((o: any) => o.status === "executed").length > 0 ? (
              <div className="space-y-2">
                {orders
                  ?.filter((o: any) => o.status === "executed")
                  .slice(0, 10)
                  .map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b py-2"
                    >
                      <div>
                        <p className="font-medium">
                          {order.description || order.orderNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${order.type === "income" ? "text-green-600" : "text-red-600"}`}
                        >
                          {order.type === "income" ? "+" : "-"}
                          {order.totalAmount.toLocaleString()} SYP
                        </p>
                        <Badge
                          variant={
                            order.type === "income" ? "default" : "destructive"
                          }
                        >
                          {order.type === "income" ? t("income") : t("expense")}
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
