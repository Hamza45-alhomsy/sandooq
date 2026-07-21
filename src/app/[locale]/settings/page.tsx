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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations();
  const { token } = useAuth();
  const { data: settings, isLoading } = useSWR("/api/settings", fetcher);
  const [loading, setLoading] = useState(false);

  // Find specific settings
  const companyName =
    settings?.find((s: any) => s.key === "company_name")?.value || "";
  const currency =
    settings?.find((s: any) => s.key === "currency")?.value || "SYP";
  const requireApproval =
    settings?.find((s: any) => s.key === "require_approval")?.value === "true";

  const [formData, setFormData] = useState({
    companyName: companyName,
    currency: currency,
    requireApproval: requireApproval,
  });

  if (isLoading)
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = [
        { key: "company_name", value: formData.companyName },
        { key: "currency", value: formData.currency },
        { key: "require_approval", value: String(formData.requireApproval) },
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
      <h1 className="mb-6 text-2xl font-bold">{t("Settings.title")}</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("Settings.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t("Settings.companyName")}</Label>
              <Input
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                placeholder="My Company"
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

            <div className="flex items-center justify-between">
              <Label>{t("Settings.requireApproval")}</Label>
              <Switch
                checked={formData.requireApproval}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requireApproval: checked })
                }
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
