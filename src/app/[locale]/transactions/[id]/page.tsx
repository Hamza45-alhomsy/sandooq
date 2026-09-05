// src/app/[locale]/transactions/[id]/page.tsx
"use client";

import { useSettings } from "@/hooks/useSettings";
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
import { DocumentUpload } from "@/components/transactions/DocumentUpload";
import { Download, Eye, File, Pencil } from "lucide-react";

export default function TransactionDetailPage() {
  const t = useTranslations();
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { data: transaction, mutate } = useSWR(
    `/api/transactions/${id}`,
    fetcher,
  );
  const { currency } = useSettings();

  if (!transaction)
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );

  const isOwner = transaction.userId === user?.id;
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {isOwner && (
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/transactions/${transaction.id}/edit`)
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("TransactionDetail.editTransaction")}
              </Button>
            )}
            <Button variant="outline" onClick={() => router.back()}>
              {t("Common.back")}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Transaction Info */}
          <Card>
            <CardHeader>
              <CardTitle>{transaction.transactionNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>{t("Transactions.transactionTitle")}:</strong>{" "}
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

          {/* Documents Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("Documents.title")}</CardTitle>
              {isOwner && (
                <DocumentUpload
                  transactionId={transaction.id}
                  onUploadComplete={mutate}
                />
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
                            <Eye className="h-4 w-4" />
                            {t("Common.view")}
                          </Button>
                        </a>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL}${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            {t("Common.download")}
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
        </div>
      </div>
    </MainLayout>
  );
}
