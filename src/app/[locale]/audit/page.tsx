// src/app/[locale]/audit/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";
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
import { Search, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 🔥 Map action keys to human-readable translations
const actionMap: Record<string, string> = {
  LOGIN: "Audit.actions.login",
  LOGOUT: "Audit.actions.logout",
  CREATE_TRANSACTION: "Audit.actions.createTransaction",
  UPDATE_TRANSACTION: "Audit.actions.updateTransaction",
  UPDATE_PROFILE: "Audit.actions.updateProfile",
  UPLOAD_DOCUMENT: "Audit.actions.uploadDocument",
  UPDATE_SETTINGS: "Audit.actions.updateSettings",
  CREATE_CATEGORY: "Audit.actions.createCategory",
  DELETE_CATEGORY: "Audit.actions.deleteCategory",
};

export default function AuditPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const { data, error, isLoading } = useSWR(
    "/api/audit-logs?limit=200",
    fetcher,
  );

  // 🔍 Filter logs by search term
  const filteredLogs =
    data?.data?.filter((log: any) => {
      const searchLower = search.trim().toLowerCase();
      const actionKey = actionMap[log.action] || log.action;
      const actionLabel = t(actionKey);
      const createdAt = new Date(log.createdAt).getTime();
      const from = fromDate
        ? new Date(
            fromDate.getFullYear(),
            fromDate.getMonth(),
            fromDate.getDate(),
          ).getTime()
        : null;
      const to = toDate
        ? new Date(
            toDate.getFullYear(),
            toDate.getMonth(),
            toDate.getDate(),
            23,
            59,
            59,
            999,
          ).getTime()
        : null;
      return (
        (!searchLower ||
          log.entityType?.toLowerCase().includes(searchLower) ||
          actionLabel.toLowerCase().includes(searchLower) ||
          log.action?.toLowerCase().includes(searchLower)) &&
        (!action || log.action === action) &&
        (!entity || log.entityType === entity) &&
        (!from || createdAt >= from) &&
        (!to || createdAt <= to)
      );
    }) || [];

  const entityOptions: string[] = Array.from(
    new Set<string>(
      (data?.data || [])
        .map((log: any) => log.entityType)
        .filter((value: unknown): value is string => Boolean(value)),
    ),
  );

  const clearFilters = () => {
    setSearch("");
    setAction("");
    setEntity("");
    setFromDate(undefined);
    setToDate(undefined);
  };

  const dateFormat = locale === "ar" ? "dd/MM/yyyy" : "MM/dd/yyyy";

  // Helper to get entity link (only for transactions)
  const getEntityLink = (log: any) => {
    if (log.entityType === "Transaction" || log.entityType === "transaction") {
      return `/transactions/${log.entityId}`;
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
      <div className="mb-6 rounded-md border bg-muted/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:min-w-[16rem]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("Audit.search") || "Search..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("Audit.allActions")}</option>
            {Object.keys(actionMap).map((actionKey) => (
              <option key={actionKey} value={actionKey}>
                {t(actionMap[actionKey])}
              </option>
            ))}
          </select>
          <select
            value={entity}
            onChange={(event) => setEntity(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm lg:w-40"
          >
            <option value="">{t("Audit.allEntities")}</option>
            {entityOptions.map((entityType) => (
              <option key={entityType} value={entityType}>
                {entityType}
              </option>
            ))}
          </select>
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 w-full justify-start text-left font-normal lg:w-40",
              )}
              aria-label={t("Audit.fromDate")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, dateFormat) : t("Audit.fromDate")}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                disabled={(date) => Boolean(toDate && date > toDate)}
                locale={locale === "ar" ? ar : undefined}
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 w-full justify-start text-left font-normal lg:w-40",
              )}
              aria-label={t("Audit.toDate")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, dateFormat) : t("Audit.toDate")}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                disabled={(date) => Boolean(fromDate && date < fromDate)}
                locale={locale === "ar" ? ar : undefined}
              />
            </PopoverContent>
          </Popover>
          {(search || action || entity || fromDate || toDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 whitespace-nowrap"
            >
              <X className="h-4 w-4" />
              {t("Common.clear")}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
                  colSpan={4}
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
