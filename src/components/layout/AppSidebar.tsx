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
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Package,
  Wallet,
  Settings,
  Moon,
  Sun,
  Plus,
  ChartNoAxesCombined,
  Tags,
  UserRound,
  ClipboardList,
} from "lucide-react";
import { useTheme } from "@teispace/next-themes";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";

export function AppSidebar() {
  const { user } = useAuth();
  const { companyName } = useSettings();
  const t = useTranslations("Sidebar");
  const locale = useLocale();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/transactions", label: t("transactions"), icon: Package },
  ];

  navItems.push(
    { href: "/fund", label: t("fund"), icon: Wallet },
    { href: "/analyzing", label: t("analyzing"), icon: ChartNoAxesCombined },
    { href: "/categories", label: t("categories"), icon: Tags },
    { href: "/audit", label: t("audit"), icon: ClipboardList },
    { href: "/profile", label: t("profile"), icon: UserRound },
    { href: "/settings", label: t("settings"), icon: Settings },
  );

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() || "?";

  const canCreateTransaction = Boolean(user);

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      side={locale === "ar" ? "right" : "left"}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="min-w-0 max-w-[--sidebar-width] overflow-hidden shrink-0"
      style={{
        width: "var(--sidebar-width)",
        maxWidth: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
      }}
    >
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl font-bold truncate"> {companyName}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {canCreateTransaction && (
          <div className="px-2 pt-2">
            <SidebarMenuButton
              render={<Link href="/transactions/create" />}
              tooltip={t("newTransaction")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("newTransaction")}</span>
            </SidebarMenuButton>
          </div>
        )}
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname.includes(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={isActive}
                  className={isActive ? "bg-primary " : undefined}
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
      </SidebarFooter>
    </Sidebar>
  );
}
