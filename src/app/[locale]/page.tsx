"use client";

import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { LoginDialog } from "@/components/LogInDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const t = useTranslations("Landing");

  const features = [
    {
      icon: FileText,
      title: t("feature1Title"),
      description: t("feature1Desc"),
    },
    {
      icon: Wallet,
      title: t("feature2Title"),
      description: t("feature2Desc"),
    },
    {
      icon: ShieldCheck,
      title: t("feature3Title"),
      description: t("feature3Desc"),
    },
    {
      icon: CheckCircle,
      title: t("feature4Title"),
      description: t("feature4Desc"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">💰 {t("title")}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <LoginDialog variant="default" size="sm" defaultTab="login">
              {t("navLogin")}
            </LoginDialog>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="flex-1">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {/* Login Button */}
              <LoginDialog
                variant="default"
                size="lg"
                className="min-w-[160px] gap-2"
                defaultTab="login"
              >
                {t("heroCtaLogin")}
                <ArrowRight className="h-4 w-4" />
              </LoginDialog>

              {/* ✅ Create Account Button (replaces Contact Sales) */}
              <LoginDialog
                variant="default"
                size="lg"
                className="min-w-[160px]"
                defaultTab="signup"
              >
                {t("heroCtaCreate") || "Create Account"}
              </LoginDialog>
            </div>
          </div>
        </div>

        {/* ===== FEATURES SECTION ===== */}
        <section className="border-t bg-muted/30 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">{t("featureTitle")}</h2>
              <p className="text-muted-foreground">{t("featureSubtitle")}</p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="border bg-background text-center shadow-sm transition-shadow hover:shadow-md"
                  >
                    <CardHeader>
                      <div className="mx-auto rounded-lg bg-primary/10 p-3 w-fit">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t("footerText")}</p>
        </div>
      </footer>
    </div>
  );
}
