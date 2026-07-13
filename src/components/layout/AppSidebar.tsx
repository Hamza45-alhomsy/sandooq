// src/components/layout/AppSidebar.tsx
"use client";

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
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Wallet,
  Users,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/orders", label: "الطلبات", icon: Package },
    { href: "/fund", label: "الصندوق", icon: Wallet },
    ...(user?.permissions.includes("user:manage")
      ? [{ href: "/users", label: "المستخدمين", icon: Users }]
      : []),
    ...(user?.permissions.includes("audit:view")
      ? [{ href: "/audit", label: "سجل التدقيق", icon: FileText }]
      : []),
    { href: "/settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold">
            💰 نظام التدفق
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="mb-2 text-sm">
          <p className="font-medium">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
