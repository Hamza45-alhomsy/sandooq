"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useLocale, useTranslations } from "next-intl";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { token } = useAuth();
  const { data: categories = [], isLoading } = useSWR(
    "/api/categories",
    fetcher,
  );
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");

  const filteredCategories = categories.filter((category: any) => {
    const name =
      locale === "ar" ? category.nameAr || category.name : category.name;
    return (
      (type === "all" || category.type === type) &&
      name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const deleteCategory = async (categoryId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${categoryId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || t("Settings.error"));
      }
      toast.success(t("Settings.categoryDeleted"));
      mutate("/api/categories");
    } catch (error: any) {
      toast.error(error.message || t("Common.networkError"));
    }
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("Settings.categoriesDescription")}
          </p>
        </div>
        <div className="mt-3">
          <Link href="/categories/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("Settings.createCategory")}
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mx-auto max-w-5xl">
        <CardHeader>
          <CardTitle>{t("Settings.categoryList")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Settings.categorySearchPlaceholder")}
            />
            <select
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">{t("Common.all")}</option>
              <option value="income">{t("Common.income")}</option>
              <option value="expense">{t("Common.expense")}</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("Common.loading")}
            </p>
          ) : filteredCategories.length > 0 ? (
            <div className="space-y-1.5">
              {filteredCategories.map((category: any) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div>
                    <p className="font-medium">
                      {locale === "ar"
                        ? category.nameAr || category.name
                        : category.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.type === "income"
                        ? t("Common.income")
                        : t("Common.expense")}
                      {category.description ? ` • ${category.description}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("Users.delete")}
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {t("Settings.noCategories")}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
