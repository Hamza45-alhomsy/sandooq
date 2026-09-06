// src/components/layout/MainLayout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Spinner } from "@/components/ui/spinner";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  const pageTitle = pathname.includes("/dashboard")
    ? t("Dashboard.title")
    : pathname.includes("/analyzing")
      ? t("Investor.analysisTitle")
      : pathname.includes("/transactions/create")
        ? t("CreateTransaction.title")
        : pathname.includes("/transactions/") && pathname.includes("/edit")
          ? t("TransactionDetail.editTransaction")
          : pathname.includes("/transactions/")
            ? t("TransactionDetail.title")
            : pathname.includes("/transactions")
              ? t("Transactions.title")
              : pathname.includes("/categories/create")
                ? t("Settings.createCategory")
                : pathname.includes("/categories")
                  ? t("Settings.categories")
                  : pathname.includes("/profile")
                    ? t("Profile.title")
                    : pathname.includes("/settings")
                      ? t("Settings.title")
                      : pathname.includes("/fund")
                        ? t("FundPage.title")
                        : pathname.includes("/audit")
                          ? t("Audit.title")
                          : "";

  useEffect(() => {
    console.log("🔄 MainLayout: loading =", loading, "user =", user);
    if (!loading && !user) {
      console.log("🔴 Redirecting to /");
      router.push("/");
    }
  }, [user, loading, router]);
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="font-bold text-base sm:text-xl md:text-2xl lg:text-3xl">
            {pageTitle}
          </div>{" "}
          <div className="flex-1" />
          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <span className="hidden text-sm text-muted-foreground md:inline">
            {user?.fullName}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
