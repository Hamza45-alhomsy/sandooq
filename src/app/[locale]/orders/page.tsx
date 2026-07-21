// src/app/[locale]/orders/page.tsx
"use client";
import { SearchInput } from "@/components/SearchInput";

import { useState, useMemo, useRef, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { File, Search, X, CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const locale = useLocale();

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (type) params.append("type", type);
    if (startDate)
      params.append("startDate", startDate.toISOString().split("T")[0]);
    if (endDate) params.append("endDate", endDate.toISOString().split("T")[0]);
    return params.toString();
  }, [search, status, type, startDate, endDate]);

  const apiUrl = `/api/orders${queryParams ? `?${queryParams}` : ""}`;
  const { data, error, isLoading } = useSWR(apiUrl, fetcher);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setType("");
    setStartDate(undefined);
    setEndDate(undefined);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

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

  const dateFormat = locale === "ar" ? "dd/MM/yyyy" : "MM/dd/yyyy";
  const dateLocale = locale === "ar" ? ar : undefined;

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("Orders.title")}</h1>
        {user?.permissions.includes("order:create") && (
          <Link href="/orders/create">
            <Button className="w-full sm:w-auto">{t("Orders.newOrder")}</Button>
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-md border p-4 bg-muted/20">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[150px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("Common.search") || "Search..."}
            />{" "}
          </div>

          {/* Status */}
          <Select
            value={status}
            onValueChange={(value: string | null) => {
              if (value !== null) setStatus(value);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("Orders.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("Common.all") || "All"}</SelectItem>
              <SelectItem value="pending">{t("Common.pending")}</SelectItem>
              <SelectItem value="approved">{t("Common.approved")}</SelectItem>
              <SelectItem value="executed">{t("Common.executed")}</SelectItem>
              <SelectItem value="rejected">{t("Common.rejected")}</SelectItem>
              <SelectItem value="cancelled">{t("Common.cancelled")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Type */}
          <Select
            value={type}
            onValueChange={(value: string | null) => {
              if (value !== null) setType(value);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t("Orders.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("Common.all") || "All"}</SelectItem>
              <SelectItem value="income">{t("Common.income")}</SelectItem>
              <SelectItem value="expense">{t("Common.expense")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Start Date */}
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-[150px] justify-start text-left font-normal",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, dateFormat) : t("Common.from")}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-[150px] justify-start text-left font-normal",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, dateFormat) : t("Common.to")}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>

          {/* Clear */}
          {(search || status || type || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              {t("Common.clear") || "Clear"}
            </Button>
          )}
        </div>
      </div>

      {/* Orders Table */}
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
              <TableHead>{t("Documents.title")}</TableHead>
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
                  {order.documents?.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 w-fit"
                    >
                      <File className="h-3 w-3" />
                      {order.documents.length}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
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
                  colSpan={8}
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
