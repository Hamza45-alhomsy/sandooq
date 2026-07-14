"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { data, error, isLoading } = useSWR("/api/dashboard/stats", fetcher);

  // ... loading/error states ...

  const stats = data?.stats || {};

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("totalOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalOrders || 0}</p>
          </CardContent>
        </Card>
        {/* ... other cards ... */}
      </div>
    </MainLayout>
  );
}
