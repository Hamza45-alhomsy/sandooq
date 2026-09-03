// src/components/layout/AppSidebar.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Package,
  Wallet,
  Users,
  FileText,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@teispace/next-themes";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";

export function AppSidebar() {
  const { user, logout, switchWorkspace } = useAuth();
  const { companyName } = useSettings();
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const { theme, setTheme } = useTheme();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const stored = localStorage.getItem("activeWorkspaceId");
    if (stored) {
      setActiveWorkspaceId(parseInt(stored, 10));
    } else if (user?.workspaces && user.workspaces.length > 0) {
      // If no stored workspace, default to the first one
      const first = user.workspaces[0].id;
      setActiveWorkspaceId(first);
      localStorage.setItem("activeWorkspaceId", String(first));
    }
  }, [user]);

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const workspaceId = parseInt(e.target.value, 10);
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem("activeWorkspaceId", String(workspaceId));
    switchWorkspace(workspaceId);
  };

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/orders", label: t("orders"), icon: Package },
  ];

  if (user?.permissions.includes("fund:view")) {
    navItems.push({ href: "/fund", label: t("fund"), icon: Wallet });
  }

  if (user?.permissions.includes("user:manage")) {
    navItems.push({ href: "/users", label: t("users"), icon: Users });
  }
  if (user?.permissions.includes("audit:view")) {
    navItems.push({ href: "/audit", label: t("audit"), icon: FileText });
  }
  if (user?.permissions.includes("setting:manage")) {
    navItems.push({ href: "/settings", label: t("settings"), icon: Settings });
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() || "?";

  const currentWorkspace = user?.workspaces?.find(
    (w: any) => w.id === activeWorkspaceId,
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="border-l min-w-0 max-w-[--sidebar-width] overflow-hidden shrink-0"
      style={{
        width: "var(--sidebar-width)",
        maxWidth: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
      }}
    >
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl font-bold truncate">💰 {companyName}</span>
        </div>
      </SidebarHeader>

      {/* Workspace Selector */}
      <div className="border-b p-3">
        <select
          className="w-full rounded-md border bg-background p-2 text-sm"
          value={activeWorkspaceId ?? ""}
          onChange={handleWorkspaceChange}
        >
          <option value="">Select Workspace</option>
          {user?.workspaces?.map((ws: any) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {currentWorkspace?.name || "No workspace selected"}
        </p>
      </div>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = window.location.pathname.includes(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={isActive}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate text-sm">
            <p className="font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-4 w-4" />
              <span>{t("lightMode") || "Light Mode"}</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              <span>{t("darkMode") || "Dark Mode"}</span>
            </>
          )}
        </Button>

        <LanguageToggle />

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>{t("logout")}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
