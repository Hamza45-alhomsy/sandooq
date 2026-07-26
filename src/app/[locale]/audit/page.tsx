// src/app/[locale]/audit/page.tsx
"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// 🔥 Map action keys to human-readable translations
const actionMap: Record<string, string> = {
  LOGIN: "Audit.actions.login",
  LOGOUT: "Audit.actions.logout",
  CREATE_ORDER: "Audit.actions.createOrder",
  UPDATE_ORDER: "Audit.actions.updateOrder",
  APPROVE_ORDER: "Audit.actions.approveOrder",
  EXECUTE_ORDER: "Audit.actions.executeOrder",
  REJECT_ORDER: "Audit.actions.rejectOrder",
  CANCEL_ORDER: "Audit.actions.cancelOrder",
  CREATE_USER: "Audit.actions.createUser",
  UPDATE_USER_ROLE: "Audit.actions.updateUserRole",
  UPDATE_PROFILE: "Audit.actions.updateProfile",
  UPLOAD_DOCUMENT: "Audit.actions.uploadDocument",
  UPDATE_SETTINGS: "Audit.actions.updateSettings",
  REGISTER: "Audit.actions.register",
};

export default function AuditPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const { data, error, isLoading } = useSWR(
    "/api/audit-logs?limit=200",
    fetcher,
  );

  // 🔍 Filter logs by search term
  const filteredLogs =
    data?.data?.filter((log: any) => {
      const searchLower = search.toLowerCase();
      const actionKey = actionMap[log.action] || log.action;
      const actionLabel = t(actionKey);
      return (
        log.user?.fullName?.toLowerCase().includes(searchLower) ||
        log.entityType?.toLowerCase().includes(searchLower) ||
        actionLabel.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower)
      );
    }) || [];

  // Helper to get entity link (only for orders)
  const getEntityLink = (log: any) => {
    if (log.entityType === "Order" || log.entityType === "order") {
      return `/orders/${log.entityId}`;
    }
    if (log.entityType === "User" || log.entityType === "user") {
      return `/users`;
    }
    return null;
  };

  if (isLoading)
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          {t("Common.loading")}
        </div>
      </MainLayout>
    );
  if (error)
    return (
      <MainLayout>
        <div className="text-red-500">
          {t("Common.error")}: {error.message}
        </div>
      </MainLayout>
    );

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("Audit.title")}</h1>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("Audit.search") || "Search..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Audit.user")}</TableHead>
              <TableHead>{t("Audit.action")}</TableHead>
              <TableHead>{t("Audit.entity")}</TableHead>
              <TableHead>{t("Audit.recordId")}</TableHead>
              <TableHead>{t("Audit.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log: any) => {
                const actionKey = actionMap[log.action] || log.action;
                const actionLabel = t(actionKey);
                const entityLink = getEntityLink(log);

                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.user?.fullName || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {actionLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell>
                      {entityLink ? (
                        <Link
                          href={entityLink}
                          className="text-primary hover:underline"
                        >
                          #{log.entityId}
                        </Link>
                      ) : (
                        `#${log.entityId}`
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {search ? t("Audit.noResults") : t("Audit.noLogs")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
}
