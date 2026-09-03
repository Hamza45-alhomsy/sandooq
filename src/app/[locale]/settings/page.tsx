// src/app/[locale]/settings/page.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
  const { token, user, loading: authLoading } = useAuth();

  const hasAdminRole = user?.role === "admin";
  const canManageSettings =
    hasAdminRole || user?.permissions.includes("setting:manage");
  const canManageCategories =
    hasAdminRole || user?.permissions.includes("category:manage");
  const { data: settings, isLoading } = useSWR(
    canManageSettings ? "/api/settings" : null,
    fetcher,
  );
  const { data: categories, isLoading: categoriesLoading } = useSWR(
    canManageCategories ? "/api/categories" : null,
    fetcher,
  );

  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameAr: "",
    type: "expense",
    description: "",
  });
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<
    "all" | "income" | "expense"
  >("all");

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
  const requireApproval =
    settings?.find((s: any) => s.key === "require_approval")?.value !== "false";

  const [formData, setFormData] = useState({
    companyNameEn,
    companyNameAr,
    currency,
    requireApproval,
  });

  if (authLoading || isLoading || (canManageCategories && categoriesLoading)) {
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

  if (!canManageSettings && !canManageCategories) {
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

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error(t("Settings.categoryNameRequired"));
      return;
    }

    setCategoryLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: categoryForm.name,
            nameAr: categoryForm.nameAr,
            type: categoryForm.type,
            description: categoryForm.description,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("Settings.error"));
      }

      toast.success(t("Settings.categoryCreated"));
      setCategoryForm({
        name: "",
        nameAr: "",
        type: "expense",
        description: "",
      });
      mutate("/api/categories");
    } catch (error: any) {
      toast.error(error.message || t("Settings.error"));
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleCategoryDelete = async (categoryId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${categoryId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("Settings.error"));
      }

      toast.success(t("Settings.categoryDeleted"));
      mutate("/api/categories");
    } catch (error: any) {
      toast.error(error.message || t("Common.networkError"));
    }
  };

  const filteredCategories = (categories || []).filter((category: any) => {
    const matchesType =
      categoryTypeFilter === "all" || category.type === categoryTypeFilter;
    const categoryName =
      locale === "ar" ? category.nameAr || category.name : category.name;
    const matchesSearch = categoryName
      .toLowerCase()
      .includes(categorySearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">{t("Settings.title")}</h1>

      {canManageSettings && (
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

              <div
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2"
              >
                <div className="min-w-0 text-start">
                  <Label className="text-base">
                    {t("Settings.requireApproval")}
                  </Label>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t("Settings.requireApprovalDesc")}
                  </p>
                </div>
                <Switch
                  aria-label={t("Settings.requireApproval")}
                  dir="ltr"
                  className="shrink-0"
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
      )}

      {canManageCategories && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>{t("Settings.categories")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t("Settings.categoryName")}</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    placeholder={t("Settings.categoryNamePlaceholder")}
                  />
                </div>

                <div>
                  <Label>{t("Settings.categoryNameAr")}</Label>
                  <Input
                    value={categoryForm.nameAr}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        nameAr: e.target.value,
                      })
                    }
                    dir="rtl"
                    placeholder={t("Settings.categoryNameArPlaceholder")}
                  />
                </div>

                <div>
                  <Label>{t("Settings.categoryType")}</Label>
                  <select
                    value={categoryForm.type}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        type: e.target.value as "income" | "expense",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="income">{t("Common.income")}</option>
                    <option value="expense">{t("Common.expense")}</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>{t("Settings.categoryDescription")}</Label>
                <Input
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  placeholder={t("Settings.categoryDescriptionPlaceholder")}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={categoryLoading}>
                  {categoryLoading
                    ? t("Settings.saving")
                    : t("Settings.createCategory")}
                </Button>
              </div>
            </form>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="category-search">{t("Common.search")}</Label>
                  <Input
                    id="category-search"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder={t("Settings.categoryNamePlaceholder")}
                  />
                </div>

                <div>
                  <Label htmlFor="category-type-filter">
                    {t("Common.type")}
                  </Label>
                  <select
                    id="category-type-filter"
                    value={categoryTypeFilter}
                    onChange={(e) =>
                      setCategoryTypeFilter(
                        e.target.value as "all" | "income" | "expense",
                      )
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="all">{t("Common.all")}</option>
                    <option value="income">{t("Common.income")}</option>
                    <option value="expense">{t("Common.expense")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category: any) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p
                          className="font-medium"
                          dir={locale === "ar" ? "rtl" : "ltr"}
                        >
                          {locale === "ar"
                            ? category.nameAr || category.name
                            : category.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {category.type === "income"
                            ? t("Common.income")
                            : t("Common.expense")}
                          {category.description
                            ? ` • ${category.description}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCategoryDelete(category.id)}
                        >
                          {t("Users.delete")}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    {t("Settings.noCategories")}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
