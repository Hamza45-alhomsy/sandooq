// src/app/[locale]/transactions/[id]/page.tsx
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
import { DocumentUpload } from "@/components/transactions/DocumentUpload";
import { Download, File, XCircle, Pencil } from "lucide-react";

export default function TransactionDetailPage() {
  const t = useTranslations();
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { data: transaction, mutate } = useSWR(`/api/transactions/${id}`, fetcher);
  const { currency, requireApproval } = useSettings();

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (action: "approve") => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}/${action}`,
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}/reject`,
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
        toast.success(t("TransactionDetail.rejectSuccess"));
        mutate();
        setRejectDialogOpen(false);
        setRejectReason("");
      } else {
        const error = await response.json();
        toast.error(error.error || t("TransactionDetail.rejectFailed"));
      }
    } catch (error) {
      toast.error(t("Common.networkError"));
    }
  };

  if (!transaction)
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );

  const isOwner = transaction.userId === user?.id;
  const isAdmin = user?.permissions.includes("transaction:approve");
  const canApprove = isAdmin && transaction.status === "pending";
  const canReject =
    isAdmin && (transaction.status === "pending" || transaction.status === "approved");

  const statusMap: Record<string, string> = {
    pending: t("Common.pending"),
    approved: t("Common.approved"),
    rejected: t("Common.rejected"),
  };
  const showStatusBadge = transaction.status === "rejected" || requireApproval;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("TransactionDetail.title")}</h1>
          <Button variant="outline" onClick={() => router.back()}>
            {t("Common.back")}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Transaction Info */}
          <Card>
            <CardHeader>
              <CardTitle>{transaction.transactionNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>{t("TransactionDetail.description")}:</strong>{" "}
                {transaction.description || "—"}
              </p>
              <p>
                <strong>{t("TransactionDetail.type")}:</strong>{" "}
                {transaction.type === "income"
                  ? t("Common.income")
                  : t("Common.expense")}
              </p>
              <p>
                <strong>{t("TransactionDetail.amount")}:</strong>{" "}
                {transaction.totalAmount.toLocaleString()} {currency}
              </p>
              {showStatusBadge && (
                <p>
                  <strong>{t("TransactionDetail.status")}:</strong>{" "}
                  <Badge>{statusMap[transaction.status] || transaction.status}</Badge>
                </p>
              )}
              <p>
                <strong>{t("TransactionDetail.client")}:</strong>{" "}
                {transaction.user?.fullName}
              </p>
            </CardContent>
          </Card>

          {/* Transaction Items */}
          <Card>
            <CardHeader>
              <CardTitle>{t("TransactionDetail.items")}</CardTitle>
            </CardHeader>
            <CardContent>
              {transaction.items?.map((item: any) => (
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
          {transaction.status === "rejected" && transaction.notes && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
              <strong>{t("TransactionDetail.rejectionReason")}:</strong> {transaction.notes}
            </div>
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("Documents.title")}</CardTitle>
              {(isOwner || isAdmin) && (
                <DocumentUpload transactionId={transaction.id} onUploadComplete={mutate} />
              )}
            </CardHeader>
            <CardContent>
              {transaction.documents?.length > 0 ? (
                <div className="space-y-2">
                  {transaction.documents.map((doc: any) => (
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
                {t("TransactionDetail.approve")}
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("TransactionDetail.reject")}
              </Button>
            )}
            {isOwner && transaction.status === "pending" && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/transactions/${transaction.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("TransactionDetail.editTransaction")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===== REJECT DIALOG ===== */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("TransactionDetail.rejectDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">
                {t("TransactionDetail.rejectDialog.reason")}
              </Label>
              <Input
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("TransactionDetail.rejectDialog.reasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              {t("TransactionDetail.rejectDialog.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t("TransactionDetail.rejectDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
