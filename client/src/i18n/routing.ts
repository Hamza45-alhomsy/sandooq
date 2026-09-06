// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

// Lightweight wrappers around Next.js' navigation APIs
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
