// src/app/[locale]/users/page.tsx
"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, X } from "lucide-react";

// ===== Type Definitions =====
interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: number;
  role?: Role;
  isActive: boolean;
}

interface RoleOption {
  value: string;
  label: string;
}

export default function UsersPage() {
  const t = useTranslations();
  const { token } = useAuth();

  // Fetch users and roles
  const {
    data: users,
    error,
    isLoading: usersLoading,
  } = useSWR<User[]>("/api/users", fetcher);
  const {
    data: roles,
    error: rolesError,
    isLoading: rolesLoading,
  } = useSWR<Role[]>("/api/roles", fetcher);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create user form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [phone, setPhone] = useState("");

  // Edit role state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoleId, setEditingRoleId] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Build role options
  const roleOptions = useMemo<RoleOption[]>(() => {
    if (!roles) return [];
    return roles.map((role) => {
      const lowerName = role.name.toLowerCase();
      let label = "";
      if (lowerName === "admin") label = t("Users.roles.admin");
      else if (lowerName === "investor") label = t("Users.roles.investor");
      else if (lowerName === "client") label = t("Users.roles.client");
      else label = role.name.charAt(0).toUpperCase() + role.name.slice(1);
      return {
        value: String(role.id),
        label,
      };
    });
  }, [roles, t]);

  const getRoleNameForUser = (user: User) => {
    const found = roleOptions.find((r) => r.value === String(user.roleId));
    return found ? found.label : user.role?.name || "—";
  };

  // 🔍 Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.phone && user.phone.toLowerCase().includes(query)),
      );
    }

    if (roleFilter !== "") {
      filtered = filtered.filter((user) => String(user.roleId) === roleFilter);
    }

    if (statusFilter !== "") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setStatusFilter("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email,
            password,
            fullName,
            roleId: parseInt(roleId),
            phone: phone || null,
          }),
        },
      );

      if (response.ok) {
        toast.success(t("Users.success"));
        mutate("/api/users");
        setOpen(false);
        setEmail("");
        setPassword("");
        setFullName("");
        setRoleId("");
        setPhone("");
      } else {
        const error = await response.json();
        toast.error(error.error || t("Users.error"));
      }
    } catch (error) {
      toast.error(t("Common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = async () => {
    if (!editingUser) return;
    setEditLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${editingUser.id}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roleId: parseInt(editingRoleId) }),
        },
      );

      if (response.ok) {
        toast.success("User role updated successfully");
        mutate("/api/users");
        setEditDialogOpen(false);
        setEditingUser(null);
        setEditingRoleId("");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update role");
      }
    } catch (error) {
      toast.error(t("Common.networkError"));
    } finally {
      setEditLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditingRoleId(String(user.roleId));
    setEditDialogOpen(true);
  };

  if (usersLoading || rolesLoading) {
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );
  }

  if (error || rolesError) {
    return (
      <MainLayout>
        <div>
          {t("Common.error")}: {error?.message || rolesError?.message}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("Users.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={cn(buttonVariants(), "w-full sm:w-auto")}>
            {t("Users.newUser")}
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{t("Users.create")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>{t("Users.name")}</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>{t("Users.email")}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>{t("Login.password")}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Label>{t("Users.phone")}</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+961 70 123456"
                />
              </div>
              <div>
                <Label>{t("Users.role")}</Label>
                <Select
                  onValueChange={(value: string | null) => {
                    if (value) setRoleId(value);
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Users.role")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("Users.creating") : t("Users.create")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 🔍 FILTER BAR */}
      <div className="mb-6 flex flex-col gap-3 rounded-md border p-4 bg-muted/20">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("Users.search") || "Search users..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Role filter */}
          <Select
            value={roleFilter}
            onValueChange={(value: string | null) => {
              if (value !== null) setRoleFilter(value);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("Users.role")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("Users.all") || "All Roles"}</SelectItem>
              {roleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(value: string | null) => {
              if (value !== null) setStatusFilter(value);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("Users.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("Users.all") || "All"}</SelectItem>
              <SelectItem value="active">{t("Users.active")}</SelectItem>
              <SelectItem value="inactive">{t("Users.inactive")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {(searchQuery || roleFilter || statusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              {t("Users.clear") || "Clear"}
            </Button>
          )}
        </div>
      </div>

      {/* 📋 USERS TABLE */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Users.name")}</TableHead>
              <TableHead>{t("Users.email")}</TableHead>
              <TableHead>{t("Users.phone")}</TableHead>
              <TableHead>{t("Users.role")}</TableHead>
              <TableHead>{t("Users.status")}</TableHead>
              <TableHead>{t("Users.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "—"}</TableCell>
                  <TableCell>{getRoleNameForUser(user)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? t("Users.active") : t("Users.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      {t("Users.editRole")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery || roleFilter || statusFilter
                    ? t("Users.noResults") || "No users match your filters."
                    : t("Users.noUsers") || "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("Users.editRoleDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("Users.editRoleDialog.user")}</Label>
              <p className="text-sm font-medium">{editingUser?.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {editingUser?.email}
              </p>
            </div>
            <div>
              <Label>{t("Users.editRoleDialog.role")}</Label>
              <Select
                value={editingRoleId}
                onValueChange={(value: string | null) => {
                  if (value !== null) setEditingRoleId(value);
                }}
              >
                <SelectTrigger>
                  {editingRoleId
                    ? roleOptions.find((r) => r.value === editingRoleId)
                        ?.label || "Select role"
                    : t("Users.editRoleDialog.role")}
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                {t("Users.editRoleDialog.cancel")}
              </Button>
              <Button onClick={handleEditRole} disabled={editLoading}>
                {editLoading
                  ? t("Users.editRoleDialog.saving")
                  : t("Users.editRoleDialog.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
