// src/components/layout/MainLayout.tsx
"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
        جاري التحميل...
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 p-4 md:p-6">
        <SidebarTrigger className="mb-4 md:hidden" />
        {children}
      </main>
    </SidebarProvider>
  );
}
