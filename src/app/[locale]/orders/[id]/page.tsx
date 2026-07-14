// src/app/orders/[id]/page.tsx
"use client";

import useSWR from "swr";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function OrderDetailPage() {
  const t = useTranslations();
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { data: order, mutate } = useSWR(`/api/orders/${id}`, fetcher);

  const handleAction = async (action: "approve" | "execute") => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        toast.success(
          action === "approve"
            ? t("Common.approveSuccess")
            : t("Common.executeSuccess"),
        );
        mutate();
      } else {
        const error = await response.json();
        toast.error(error.error || t("Common.operationFailed"));
      }
    } catch (error) {
      toast.error(t("Common.networkError"));
    }
  };

  if (!order)
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );

  const canApprove =
    user?.permissions.includes("order:approve") && order.status === "pending";
  const canExecute =
    user?.permissions.includes("order:execute") && order.status === "approved";

  const statusMap = {
    pending: t("Common.pending"),
    approved: t("Common.approved"),
    executed: t("Common.executed"),
    rejected: t("Common.rejected"),
    cancelled: t("Common.cancelled"),
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("OrderDetail.title")}</h1>
          <Button variant="outline" onClick={() => router.back()}>
            {t("Common.back")}
          </Button>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{order.orderNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>{t("OrderDetail.description")}:</strong>{" "}
                {order.description || "—"}
              </p>
              <p>
                <strong>{t("OrderDetail.type")}:</strong>{" "}
                {order.type === "income"
                  ? t("Common.income")
                  : t("Common.expense")}
              </p>
              <p>
                <strong>{t("OrderDetail.amount")}:</strong>{" "}
                {order.totalAmount.toLocaleString()} {t("Common.syp")}
              </p>
              <p>
                <strong>{t("OrderDetail.status")}:</strong>{" "}
                <Badge>
                  {statusMap[order.status as keyof typeof statusMap]}
                </Badge>
              </p>
              <p>
                <strong>{t("OrderDetail.client")}:</strong>{" "}
                {order.user?.fullName}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("OrderDetail.items")}</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items?.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b py-2"
                >
                  <span>{item.description}</span>
                  <span>
                    {item.quantity} × {item.unitPrice} = {item.totalPrice}{" "}
                    {t("Common.syp")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            {canApprove && (
              <Button
                onClick={() => handleAction("approve")}
                className="flex-1"
              >
                {t("OrderDetail.approve")}
              </Button>
            )}
            {canExecute && (
              <Button
                onClick={() => handleAction("execute")}
                className="flex-1"
                variant="default"
              >
                {t("OrderDetail.execute")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
