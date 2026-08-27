// src/lib/hooks/useSettings.ts
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { useAuth } from "@/contexts/AuthContext";
export function useSettings() {
  const { user } = useAuth();
  const canManageSettings = user?.permissions.includes("setting:manage");
  const { data, error, isLoading } = useSWR(
    canManageSettings ? "/api/settings" : null,
    fetcher,
  );
  const settings = data || [];

  const companyName =
    settings.find((s: any) => s.key === "company_name")?.value ||
    "Cash Flow Management";
  const currency =
    settings.find((s: any) => s.key === "currency")?.value || "SYP";

  return { settings, companyName, currency, isLoading, error };
}
