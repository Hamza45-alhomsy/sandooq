// src/components/LoginDialog.tsx
"use client";
import { sendPasswordResetEmail } from "firebase/auth";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FcGoogle } from "react-icons/fc";
import { apiUrl } from "@/lib/api/url";
import { Eye, EyeOff } from "lucide-react";

interface LoginDialogProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  defaultTab?: "login" | "signup";
}

const getAuthErrorMessage = (
  t: (key: string) => string,
  error: any,
  context: "login" | "signup" | "reset" | "google",
) => {
  const code = error?.code || "";

  if (code === "auth/invalid-email") return t("AuthErrors.invalidEmail");
  if (code === "auth/user-not-found") return t("AuthErrors.userNotFound");
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return t("AuthErrors.invalidCredentials");
  }
  if (code === "auth/email-already-in-use") {
    return t("AuthErrors.emailAlreadyInUse");
  }
  if (code === "auth/weak-password") return t("AuthErrors.weakPassword");
  if (code === "auth/too-many-requests") return t("AuthErrors.tooManyRequests");
  if (code === "auth/popup-closed-by-user") return t("AuthErrors.popupClosed");
  if (code === "auth/network-request-failed") return t("AuthErrors.network");

  return context === "login"
    ? t("Login.loginFailed")
    : context === "signup"
      ? t("SignUp.error")
      : context === "reset"
        ? t("AuthErrors.resetFailed")
        : t("Login.googleFailed");
};

export function LoginDialog({
  children,
  variant = "default",
  size = "default",
  className,
  defaultTab = "login",
}: LoginDialogProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] =
    useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleForgotPassword = async () => {
    setAuthMessage(null);
    if (!loginEmail) {
      setAuthMessage({
        type: "error",
        text: t("AuthErrors.resetEmailRequired"),
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      setAuthMessage({ type: "success", text: t("AuthErrors.resetSent") });
    } catch (error: any) {
      setAuthMessage({
        type: "error",
        text: getAuthErrorMessage(t, error, "reset"),
      });
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    setAuthMessage(null);
    try {
      await signInWithPopup(auth, provider);
      setOpen(false);
      router.replace("/dashboard");
    } catch (error: any) {
      console.error(error);
      setAuthMessage({
        type: "error",
        text: getAuthErrorMessage(t, error, "google"),
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setOpen(false);
      router.push("/dashboard");
    } catch (error: any) {
      setAuthMessage({
        type: "error",
        text: getAuthErrorMessage(t, error, "login"),
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    if (signupPassword !== signupConfirmPassword) {
      setAuthMessage({
        type: "error",
        text: t("SignUp.passwordMismatch"),
      });
      return;
    }
    setSignupLoading(true);
    try {
      // 1. Register user in Firebase + MySQL
      const response = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: signupFullName,
          email: signupEmail,
          password: signupPassword,
          companyName:
            locale === "ar" ? "إدارة التدفقات النقدية" : "Cash Flow Management",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message =
          data.error === "Email already registered"
            ? t("AuthErrors.emailAlreadyInUse")
            : t("SignUp.error");
        setAuthMessage({ type: "error", text: message });
        return;
      }

      // 2. Auto-login
      await signInWithEmailAndPassword(auth, signupEmail, signupPassword);
      setOpen(false);

      // ⏳ Wait for AuthContext to verify user with backend
      setTimeout(() => {
        router.replace("/dashboard");
      }, 600);
    } catch (error: any) {
      console.error("Signup error:", error);
      setAuthMessage({
        type: "error",
        text: getAuthErrorMessage(t, error, "signup"),
      });
    } finally {
      setSignupLoading(false);
    }
  };

  const renderAuthMessage = () =>
    authMessage && (
      <p
        role="status"
        aria-live="polite"
        className={
          authMessage.type === "success"
            ? "text-sm text-green-600"
            : "text-sm text-destructive"
        }
      >
        {authMessage.text}
      </p>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant, size }), "gap-2", className)}
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center px-8">
            {t("Login.title")}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("Login.signIn")}</TabsTrigger>
            <TabsTrigger value="signup">{t("SignUp.title")}</TabsTrigger>
          </TabsList>

          {/* ===== LOGIN TAB ===== */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t("Login.email")}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="example@system.com"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setAuthMessage(null);
                  }}
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t("Login.password")}</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setAuthMessage(null);
                    }}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowLoginPassword((visible) => !visible)}
                    aria-label={
                      showLoginPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground p-0 h-auto"
                  onClick={handleForgotPassword}
                >
                  {t("Login.forgotPassword") || "Forgot Password?"}
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? t("Login.signingIn") : t("Login.signIn")}
              </Button>
              {renderAuthMessage()}
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("Login.or") || "Or continue with"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleAuth}
            >
              <FcGoogle className="h-5 w-5" />
              {t("Login.googleSignIn") || "Sign in with Google"}
            </Button>
          </TabsContent>

          {/* ===== SIGNUP TAB ===== */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-fullname">{t("SignUp.fullName")}</Label>
                <Input
                  id="signup-fullname"
                  type="text"
                  placeholder="John Doe"
                  value={signupFullName}
                  onChange={(e) => {
                    setSignupFullName(e.target.value);
                    setAuthMessage(null);
                  }}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">{t("SignUp.email")}</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    setAuthMessage(null);
                  }}
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{t("SignUp.password")}</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      setAuthMessage(null);
                    }}
                    className="pe-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSignupPassword((visible) => !visible)}
                    aria-label={
                      showSignupPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showSignupPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm">
                  {t("SignUp.confirmPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="signup-confirm"
                    type={showSignupConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => {
                      setSignupConfirmPassword(e.target.value);
                      setAuthMessage(null);
                    }}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowSignupConfirmPassword((visible) => !visible)
                    }
                    aria-label={
                      showSignupConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showSignupConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={signupLoading}>
                {signupLoading ? t("SignUp.signingUp") : t("SignUp.signUp")}
              </Button>
              {renderAuthMessage()}
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("SignUp.or") || "Or sign up with"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleAuth}
            >
              <FcGoogle className="h-5 w-5" />
              {t("SignUp.googleSignUp") || "Sign up with Google"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
