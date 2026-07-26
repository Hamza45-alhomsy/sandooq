// src/lib/hooks/useSettings.ts
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

export function useSettings() {
  const { data, error, isLoading } = useSWR("/api/settings", fetcher);
  const settings = data || [];

  const companyName =
    settings.find((s: any) => s.key === "company_name")?.value ||
    "Cash Flow Management";
  const currency =
    settings.find((s: any) => s.key === "currency")?.value || "SYP";

  return { settings, companyName, currency, isLoading, error };
}
