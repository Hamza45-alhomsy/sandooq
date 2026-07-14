// src/app/orders/page.tsx
"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";

export default function OrdersPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const { data, error, isLoading } = useSWR("/api/orders", fetcher);

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

  const statusMap = {
    pending: t("Common.pending"),
    approved: t("Common.approved"),
    executed: t("Common.executed"),
    rejected: t("Common.rejected"),
    cancelled: t("Common.cancelled"),
  };

  const statusColors = {
    pending: "bg-yellow-500",
    approved: "bg-blue-500",
    executed: "bg-green-500",
    rejected: "bg-red-500",
    cancelled: "bg-gray-500",
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("Orders.title")}</h1>
        {user?.permissions.includes("order:create") && (
          <Link href="/orders/create">
            <Button className="w-full sm:w-auto">{t("Orders.newOrder")}</Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Orders.orderNumber")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("Orders.description")}
              </TableHead>
              <TableHead>{t("Orders.type")}</TableHead>
              <TableHead>{t("Orders.amount")}</TableHead>
              <TableHead>{t("Orders.status")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("Orders.date")}
              </TableHead>
              <TableHead>{t("Orders.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((order: any) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  {order.orderNumber}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {order.description || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.type === "income" ? "default" : "destructive"
                    }
                  >
                    {order.type === "income"
                      ? t("Common.income")
                      : t("Common.expense")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.totalAmount.toLocaleString()} {t("Common.syp")}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      statusColors[order.status as keyof typeof statusColors]
                    }
                  >
                    {statusMap[order.status as keyof typeof statusMap]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      {t("Common.view")}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("Common.noOrders")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
}
