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

export default function ProfilePage() {
  const t = useTranslations();
  const { user, token } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);

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
        // Update the user in AuthContext? We'll just reload the page or let the user know.
        // For simplicity, we can refresh the page or just show a success message.
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

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold">
          {t("Profile.title") || "Profile"}
        </h1>
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
      </div>
    </MainLayout>
  );
}
