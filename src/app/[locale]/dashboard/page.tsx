// src/app/[locale]/dashboard/page.tsx
"use client";

import { useTranslations } from "next-intl";
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
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const { data, error, isLoading } = useSWR("/api/dashboard/stats", fetcher);

  if (isLoading) {
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

  const stats = data?.stats || {};
  const recentOrders = data?.recentOrders || [];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    approved: "bg-blue-500",
    executed: "bg-green-500",
    rejected: "bg-red-500",
    cancelled: "bg-gray-500",
  };

  const statusLabels: Record<string, string> = {
    pending: t("Common.pending"),
    approved: t("Common.approved"),
    executed: t("Common.executed"),
    rejected: t("Common.rejected"),
    cancelled: t("Common.cancelled"),
  };

  // ✅ Check if the user can view fund data (based on whether the API returned it)
  const canViewFund = stats.fundBalance !== undefined;

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">{t("Dashboard.title")}</h1>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("Dashboard.totalOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalOrders || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              {t("Dashboard.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.pendingOrders || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              {t("Dashboard.approved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {stats.approvedOrders || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              {t("Dashboard.executed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {stats.executedOrders || 0}
            </p>
          </CardContent>
        </Card>

        {/* 🔒 Fund Balance – only visible to admins/investors */}
        {canViewFund && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("Dashboard.fundBalance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {stats.fundBalance?.toLocaleString() || 0}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  SYP
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {canViewFund && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("Dashboard.monthly")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {stats.monthlyTotal?.toLocaleString() || 0}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  SYP
                </span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Orders Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {t("Dashboard.recentOrders")}
          </h2>
          <Link href="/orders">
            <Button variant="outline" size="sm">
              {t("Common.viewAll")}
            </Button>
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Orders.orderNumber")}</TableHead>
                  <TableHead>{t("Orders.client")}</TableHead>
                  <TableHead>{t("Orders.amount")}</TableHead>
                  <TableHead>{t("Orders.status")}</TableHead>
                  <TableHead>{t("Orders.date")}</TableHead>
                  <TableHead>{t("Orders.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.user?.fullName || "—"}</TableCell>
                    <TableCell>
                      {order.totalAmount?.toLocaleString()} SYP
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[order.status] || "bg-gray-500"}
                      >
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          {t("Common.view")}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            {t("Dashboard.noRecentOrders")}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
