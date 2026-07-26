// src/app/[locale]/profile/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function ProfilePage() {
  const t = useTranslations();
  const { user, token } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fullName, phone }),
        },
      );

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

    // Validate password
    if (newPassword !== confirmNewPassword) {
      toast.error(t("Profile.passwordMismatch") || "Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error(
        t("Profile.passwordTooShort") ||
          "Password must be at least 6 characters",
      );
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

      toast.success(
        t("Profile.passwordSuccess") || "Password changed successfully!",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/wrong-password") {
        toast.error(
          t("Profile.wrongPassword") || "Current password is incorrect",
        );
      } else {
        toast.error(
          error.message ||
            t("Profile.passwordError") ||
            "Failed to change password",
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="mb-6 text-2xl font-bold">
          {t("Profile.title") || "Profile"}
        </h1>

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
              <div className="space-y-2">
                <Label htmlFor="phone">{t("Profile.phone") || "Phone"}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Profile.role") || "Role"}</Label>
                <Input value={user?.role || ""} disabled className="bg-muted" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? t("Common.saving") || "Saving..."
                  : t("Common.save") || "Save Changes"}
              </Button>
            </form>
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
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">
                  {t("Profile.newPassword") || "New Password"}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">
                  {t("Profile.confirmNewPassword") || "Confirm New Password"}
                </Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
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
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
