// src/lib/hooks/useSettings.ts
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "next-intl";
import { auth } from "@/lib/firebase/config";

const settingsFetcher = async (url: string) => {
  const firebaseUser = auth.currentUser;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (firebaseUser) {
    const token = await firebaseUser.getIdToken(true);
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${res.status}`);
  }

  return res.json();
};

export function useSettings() {
  const { user } = useAuth();
  const locale = useLocale();
  const { data, error, isLoading } = useSWR("/api/settings", settingsFetcher);
  const settings = data || [];

  const companyNameEn =
    settings.find((s: any) => s.key === "company_name_en")?.value ||
    settings.find((s: any) => s.key === "company_name")?.value ||
    "Cash Flow Management";
  const companyNameAr =
    settings.find((s: any) => s.key === "company_name_ar")?.value ||
    companyNameEn;
  const companyName = locale === "ar" ? companyNameAr : companyNameEn;

  const currency =
    settings.find((s: any) => s.key === "currency")?.value || "SYP";
  const requireApproval =
    settings.find((s: any) => s.key === "require_approval")?.value !== "false";

  return {
    settings,
    companyName,
    companyNameEn,
    companyNameAr,
    currency,
    requireApproval,
    isLoading,
    error,
  };
}
