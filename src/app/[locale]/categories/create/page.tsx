"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function CreateCategoryPage() {
  const t = useTranslations();
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    type: "expense",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("Settings.categoryNameRequired"));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || t("Settings.error"));
      }
      toast.success(t("Settings.categoryCreated"));
      router.push("/categories");
    } catch (error: any) {
      toast.error(error.message || t("Common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {t("Settings.createCategoryDescription")}
        </p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("Settings.categoryDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="category-name">
                {t("Settings.categoryName")}
              </Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder={t("Settings.categoryNamePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="category-name-ar">
                {t("Settings.categoryNameAr")}
              </Label>
              <Input
                id="category-name-ar"
                dir="rtl"
                value={form.nameAr}
                onChange={(event) =>
                  setForm({ ...form, nameAr: event.target.value })
                }
                placeholder={t("Settings.categoryNameArPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="category-type">
                {t("Settings.categoryType")}
              </Label>
              <select
                id="category-type"
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="income">{t("Common.income")}</option>
                <option value="expense">{t("Common.expense")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="category-description">
                {t("Settings.categoryDescription")}
              </Label>
              <Input
                id="category-description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder={t("Settings.categoryDescriptionPlaceholder")}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? t("Settings.saving") : t("Settings.createCategory")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/categories")}
              >
                {t("Common.back")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
