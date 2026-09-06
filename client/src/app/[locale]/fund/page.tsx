// src/app/fund/page.tsx
"use client";
import { useSettings } from "@/hooks/useSettings";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FundPage() {
  const { currency } = useSettings();

  const t = useTranslations();
  const { data, error, isLoading } = useSWR("/api/fund", fetcher);

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
      <Card className="max-w-md">
        <CardContent>
          <p className="text-4xl font-bold text-primary">
            {data?.currentBalance?.toLocaleString()} {currency || "SYP"}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("FundPage.lastUpdated")}:{" "}
            {new Date(data?.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
