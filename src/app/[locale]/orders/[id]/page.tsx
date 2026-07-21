// src/app/[locale]/orders/[id]/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
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
import { Download, File, Trash2, XCircle } from "lucide-react";

export default function OrderDetailPage() {
  const t = useTranslations();
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { data: order, mutate } = useSWR(`/api/orders/${id}`, fetcher);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

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

  const handleCancel = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        toast.success("Order cancelled");
        mutate();
        setCancelDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to cancel order");
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
  const canExecute = isAdmin && order.status === "approved";
  const canReject =
    isAdmin && (order.status === "pending" || order.status === "approved");
  const canCancel =
    (isOwner || isAdmin) &&
    (order.status === "pending" || order.status === "approved") &&
    order.status !== "executed";

  const statusMap: Record<string, string> = {
    pending: t("Common.pending"),
    approved: t("Common.approved"),
    executed: t("Common.executed"),
    rejected: t("Common.rejected"),
    cancelled: t("Common.cancelled"),
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
                {order.totalAmount.toLocaleString()} {t("Common.syp")}
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
                    {t("Common.syp")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

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
                        <span>{doc.fileName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL}${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
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
                onClick={() => handleAction("approve")}
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
            {canExecute && (
              <Button
                onClick={() => handleAction("execute")}
                className="flex-1"
                variant="default"
              >
                {t("OrderDetail.execute")}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Cancel Order
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

      {/* ===== CANCEL DIALOG ===== */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("OrderDetail.cancelDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {t("OrderDetail.cancelDialog.description")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              {t("OrderDetail.cancelDialog.goBack")}
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              {t("OrderDetail.cancelDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
