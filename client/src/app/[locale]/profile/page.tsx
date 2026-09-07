// src/app/[locale]/profile/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, LogOut } from "lucide-react";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { apiUrl } from "@/lib/api/url";

export default function ProfilePage() {
  const t = useTranslations();
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [loading, setLoading] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const response = await fetch(apiUrl(`/api/users/${user.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          t("Profile.updateSuccess") || "Profile updated successfully",
        );
        setTimeout(() => window.location.reload(), 500);
      } else {
        const error = await response.json();
        toast.error(
          error.error || t("Profile.updateError") || "Failed to update profile",
        );
      }
    } catch (error) {
      toast.error(t("Common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validate password
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({
        type: "error",
        text: t("Profile.passwordMismatch") || "Passwords do not match",
      });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text:
          t("Profile.passwordTooShort") ||
          "Password must be at least 6 characters",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      // 1. Re-authenticate the user (security step)
      const credential = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser!, credential);

      // 2. Update the password
      await updatePassword(auth.currentUser!, newPassword);

      setPasswordMessage({
        type: "success",
        text: t("Profile.passwordSuccess") || "Password changed successfully!",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error(error);
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setPasswordMessage({
          type: "error",
          text: t("Profile.wrongPassword") || "Current password is incorrect",
        });
      } else {
        setPasswordMessage({
          type: "error",
          text: t("Profile.passwordError") || "Failed to change password",
        });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ===== UPDATE PROFILE CARD ===== */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Profile.personalInfo") || "Personal Information"}
            </CardTitle>
            <CardDescription>
              {t("Profile.updateDescription") || "Update your personal details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("Profile.email") || "Email"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t("Profile.emailDisabled") || "Email cannot be changed"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {t("Profile.fullName") || "Full Name"}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? t("Common.saving") || "Saving..."
                  : t("Common.save") || "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Settings.account")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("Profile.email") || "Email"}</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.email || "—"}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              {t("Common.logout")}
            </Button>
          </CardContent>
        </Card>

        {/* ===== CHANGE PASSWORD CARD ===== */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Profile.changePassword") || "Change Password"}
            </CardTitle>
            <CardDescription>
              {t("Profile.changePasswordDesc") || "Update your password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">
                  {t("Profile.currentPassword") || "Current Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordMessage(null);
                    }}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowCurrentPassword((visible) => !visible)
                    }
                    aria-label={
                      showCurrentPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">
                  {t("Profile.newPassword") || "New Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordMessage(null);
                    }}
                    className="pe-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword((visible) => !visible)}
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">
                  {t("Profile.confirmNewPassword") || "Confirm New Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      setPasswordMessage(null);
                    }}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowConfirmNewPassword((visible) => !visible)
                    }
                    aria-label={
                      showConfirmNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={passwordLoading}
              >
                {passwordLoading
                  ? t("Profile.updatingPassword") || "Updating..."
                  : t("Profile.updatePassword") || "Update Password"}
              </Button>
              {passwordMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className={
                    passwordMessage.type === "success"
                      ? "text-sm text-green-600"
                      : "text-sm text-destructive"
                  }
                >
                  {passwordMessage.text}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("Settings.logoutConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("Settings.logoutConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
              disabled={loggingOut}
            >
              {t("Settings.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await logout();
                  router.push("/");
                } finally {
                  setLoggingOut(false);
                  setLogoutDialogOpen(false);
                }
              }}
              disabled={loggingOut}
            >
              {loggingOut ? t("Common.loading") : t("Settings.confirmLogout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
