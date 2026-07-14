"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Spinner } from "@/components/ui/spinner";
import { LanguageToggle } from "../LanguageToggle";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();

  // Calculate margin based on sidebar state
  const marginLeft =
    state === "expanded"
      ? "var(--sidebar-width)" // 16rem when expanded
      : "var(--sidebar-width-icon)"; // 3rem when collapsed

  return (
    <>
      <AppSidebar />
      <SidebarInset
        style={{ marginLeft }}
        className="transition-all duration-200 ease-linear"
      >
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {useAuth().user?.fullName} | {useAuth().user?.role}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
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
      <LanguageToggle />

      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
