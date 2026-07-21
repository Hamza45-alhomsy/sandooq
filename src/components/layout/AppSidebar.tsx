// src/components/layout/AppSidebar.tsx
"use client";
import { useRouter } from "@/i18n/routing";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { LanguageToggle } from "@/components/LanguageToggle";
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
  User,
} from "lucide-react";
import { useTheme } from "@teispace/next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const router = useRouter();

  const { user, logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const locale = useLocale();
  const { theme, setTheme } = useTheme();

  const side = locale === "ar" ? "right" : "left";
  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() || "?";

  // ✅ Navigation items (conditional)
  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/orders", label: t("orders"), icon: Package },
  ];

  if (user?.permissions.includes("fund:view")) {
    navItems.push({ href: "/fund", label: t("fund"), icon: Wallet });
  }

  if (
    user?.role === "investor" ||
    user?.permissions.includes("order:view_all")
  ) {
    navItems.push({
      href: "/investor",
      label: "Investor Dashboard",
      icon: LayoutDashboard,
    });
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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      side={side}
      className="border-l min-w-0 max-w-[--sidebar-width] overflow-hidden shrink-0"
      style={{
        width: "var(--sidebar-width)",
        maxWidth: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
      }}
    >
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl font-bold truncate">💰 {t("title")}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="truncate">
            {t("mainMenu")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-2">
        {/* 👤 User Profile – using render prop to avoid asChild */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-2"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage alt={user?.fullName} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <span className="truncate">{user?.fullName}</span>
              </Button>
            }
          />
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {t("profile") || "Profile"}
                  </Link>
                }
              />
              <DropdownMenuItem onClick={logout}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={async () => {
                    await logout();
                    router.push("/");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t("logout")}</span>
                </Button>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 🌙 Night Mode Toggle */}
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

        {/* Language Toggle */}
        <LanguageToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
