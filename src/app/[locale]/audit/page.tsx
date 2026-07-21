// src/app/[locale]/audit/page.tsx
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

export default function AuditPage() {
  const t = useTranslations();
  const { data, error, isLoading } = useSWR(
    "/api/audit-logs?limit=100",
    fetcher,
  );

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

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">{t("Audit.title")}</h1>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Audit.user")}</TableHead>
              <TableHead>{t("Audit.action")}</TableHead>
              <TableHead>{t("Audit.entity")}</TableHead>
              <TableHead>{t("Audit.entityId")}</TableHead>
              <TableHead>{t("Audit.date")}</TableHead>
              <TableHead>{t("Audit.ipAddress")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell>{log.user?.fullName || "—"}</TableCell>
                <TableCell className="font-mono text-sm">
                  {log.action}
                </TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell>{log.entityId}</TableCell>
                <TableCell>
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{log.ipAddress || "—"}</TableCell>
              </TableRow>
            ))}
            {data?.data?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("Audit.noLogs")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
}
