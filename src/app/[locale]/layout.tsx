// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { Inter, Tajawal } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Cash Flow Management",
  description: "Cash Flow Daily Management System",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // ✅ Type as a Promise
}) {
  // ✅ Await the params before using them
  const { locale } = await params;

  // Validate the locale
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Load the messages for this locale
  const messages = await getMessages();

  // Select the correct font
  const font = locale === "ar" ? tajawal.className : inter.className;

  return (
    <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={font}>
      <NextIntlClientProvider messages={messages}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  );
}
