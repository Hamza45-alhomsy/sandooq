"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/routing";

import { useEffect } from "react";
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
  ChartNoAxesCombined,
  CheckCircle,
  ClipboardList,
  FileText,
  Tags,
  Wallet,
} from "lucide-react";
import { LoginDialog } from "@/components/LogInDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Spinner } from "@/components/ui/spinner";

export default function LandingPage() {
  const t = useTranslations("Landing");
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-12 w-12" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Wallet,
      title: t("feature2Title"),
      description: t("feature2Desc"),
    },
    {
      icon: ClipboardList,
      title: t("feature5Title"),
      description: t("feature5Desc"),
    },
    {
      icon: CheckCircle,
      title: t("feature4Title"),
      description: t("feature4Desc"),
    },
    {
      icon: Tags,
      title: t("feature6Title"),
      description: t("feature6Desc"),
    },
    {
      icon: ChartNoAxesCombined,
      title: t("feature7Title"),
      description: t("feature7Desc"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{t("title")}</span>
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

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
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
