// src/app/[locale]/settings/page.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations();
  const { token, user, loading: authLoading } = useAuth();

  const { data: settings, isLoading } = useSWR("/api/settings", fetcher);

  const [loading, setLoading] = useState(false);

  // Find settings with compatibility fallbacks
  const companyNameEn =
    settings?.find((s: any) => s.key === "company_name_en")?.value ||
    settings?.find((s: any) => s.key === "company_name")?.value ||
    "";
  const companyNameAr =
    settings?.find((s: any) => s.key === "company_name_ar")?.value ||
    companyNameEn;
  const currency =
    settings?.find((s: any) => s.key === "currency")?.value || "SYP";
  const [formData, setFormData] = useState({
    companyNameEn,
    companyNameAr,
    currency,
  });

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-red-500">{t("Settings.accessDenied")}</div>
      </MainLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = [
        { key: "company_name_en", value: formData.companyNameEn },
        { key: "company_name_ar", value: formData.companyNameAr },
        { key: "company_name", value: formData.companyNameEn },
        { key: "currency", value: formData.currency },
      ];

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        },
      );

      if (response.ok) {
        toast.success(t("Settings.success"));
        mutate("/api/settings");
      } else {
        toast.error(t("Settings.error"));
      }
    } catch (error) {
      toast.error(t("Common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-2xl mb-6">
        <CardHeader>
          <CardTitle>{t("Settings.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t("Settings.companyNameEn")}</Label>
              <Input
                value={formData.companyNameEn}
                onChange={(e) =>
                  setFormData({ ...formData, companyNameEn: e.target.value })
                }
                placeholder={t("Settings.companyNameEnPlaceholder")}
              />
            </div>

            <div>
              <Label>{t("Settings.companyNameAr")}</Label>
              <Input
                value={formData.companyNameAr}
                onChange={(e) =>
                  setFormData({ ...formData, companyNameAr: e.target.value })
                }
                placeholder={t("Settings.companyNameArPlaceholder")}
              />
            </div>

            <div>
              <Label>{t("Settings.currency")}</Label>
              <Input
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                placeholder="SYP"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("Settings.saving") : t("Settings.save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
