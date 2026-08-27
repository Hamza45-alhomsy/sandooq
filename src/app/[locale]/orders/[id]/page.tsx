// src/app/[locale]/orders/[id]/page.tsx
"use client";

import { useSettings } from "@/hooks/useSettings";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/orders/DocumentUpload";
import { Download, File, XCircle, Pencil } from "lucide-react";

export default function OrderDetailPage() {
  const t = useTranslations();
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { data: order, mutate } = useSWR(`/api/orders/${id}`, fetcher);
  const { currency } = useSettings();

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (action: "approve") => {
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
        toast.success(action === "approve" ? t("Common.approveSuccess") : null);
        mutate();
      } else {
        const error = await response.json();
        toast.error(error.error || t("Common.operationFailed"));
      }
    } catch (error) {
      toast.error(t("Common.networkError"));
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rejectReason }),
        },
      );

      if (response.ok) {
        toast.success("Order rejected");
        mutate();
        setRejectDialogOpen(false);
        setRejectReason("");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reject order");
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

  const isOwner = order.userId === user?.id;
  const isAdmin = user?.permissions.includes("order:approve");
  const canApprove = isAdmin && order.status === "pending";
  const canReject =
    isAdmin && (order.status === "pending" || order.status === "approved");

  const statusMap: Record<string, string> = {
    pending: t("Common.pending"),
    approved: t("Common.approved"),
    rejected: t("Common.rejected"),
  };
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("OrderDetail.title")}</h1>
          <Button variant="outline" onClick={() => router.back()}>
            {t("Common.back")}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Order Info */}
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
                {order.totalAmount.toLocaleString()} {currency}
              </p>
              <p>
                <strong>{t("OrderDetail.status")}:</strong>{" "}
                <Badge>{statusMap[order.status] || order.status}</Badge>
              </p>
              <p>
                <strong>{t("OrderDetail.client")}:</strong>{" "}
                {order.user?.fullName}
              </p>
            </CardContent>
          </Card>

          {/* Order Items */}
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
                    {currency}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rejection Reason – only if rejected */}
          {order.status === "rejected" && order.notes && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
              <strong>{t("OrderDetail.rejectionReason")}:</strong> {order.notes}
            </div>
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("Documents.title")}</CardTitle>
              {(isOwner || isAdmin) && (
                <DocumentUpload orderId={order.id} onUploadComplete={mutate} />
              )}
            </CardHeader>
            <CardContent>
              {order.documents?.length > 0 ? (
                <div className="space-y-2">
                  {order.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between border-b py-2"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {doc.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL}${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            {t("Common.download") || "Download"}
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {t("Documents.noDocuments")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canApprove && (
              <Button
                onClick={() => handleApprove("approve")}
                className="flex-1"
              >
                {t("OrderDetail.approve")}
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            )}
            {isOwner && order.status === "pending" && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/orders/${order.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("OrderDetail.editOrder")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===== REJECT DIALOG ===== */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("OrderDetail.rejectDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">
                {t("OrderDetail.rejectDialog.reason")}
              </Label>
              <Input
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("OrderDetail.rejectDialog.reasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              {t("OrderDetail.rejectDialog.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t("OrderDetail.rejectDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
