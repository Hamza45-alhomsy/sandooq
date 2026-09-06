// src/contexts/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { auth } from "@/lib/firebase/config";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from "firebase/auth";

export interface User {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  phone?: string;
  workspaceId?: number | null;
  workspace?: { id: number; name: string; role: string };
  workspaces?: { id: number; name: string; role: string }[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // 🔥 Single source of truth: onAuthStateChanged
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (!isMounted.current) return;

        console.log(
          "🔥 1. onAuthStateChanged fired. User:",
          firebaseUser?.email || "null",
        );

        // Start loading
        setLoading(true);

        if (firebaseUser) {
          try {
            // Get fresh ID token
            const idToken = await firebaseUser.getIdToken(true);
            console.log("✅ 2. Token obtained:", idToken.slice(0, 20) + "...");
            setToken(idToken);

            // ✅ Send token and active workspace in request headers
            const activeWorkspaceId = localStorage.getItem("activeWorkspaceId");
            const res = await fetch(`${API_URL}/api/auth/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
                ...(activeWorkspaceId
                  ? { "x-workspace-id": activeWorkspaceId }
                  : {}),
              },
              // ❌ No body – token is in the header
            });

            console.log("📡 3. /api/auth/verify status:", res.status);

            if (res.ok) {
              const data = await res.json();
              console.log("👤 4. User data received:", data.user);
              setUser(data.user);

              // ✅ Store active workspace ID for API requests
              if (!activeWorkspaceId && data.user?.workspaceId) {
                localStorage.setItem(
                  "activeWorkspaceId",
                  String(data.user.workspaceId),
                );
              }

              console.log("✅ 5. User state set.");
            } else {
              const errorText = await res.text();
              console.error("❌ 6. /api/auth/verify failed:", errorText);

              // If token invalid, sign out
              if (res.status === 401 || res.status === 403) {
                await signOut(auth);
              }
              setUser(null);
              setToken(null);
            }
          } catch (error) {
            console.error("❌ 7. Error in auth flow:", error);
            setUser(null);
            setToken(null);
          }
        } else {
          // No user
          console.log("🚫 No user, clearing state.");
          setUser(null);
          setToken(null);
        }

        // ✅ Done loading
        if (isMounted.current) {
          setLoading(false);
          console.log("⏳ 8. loading set to false.");
        }
      },
    );

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setToken(null);
    localStorage.removeItem("activeWorkspaceId");
  };

  const switchWorkspace = (workspaceId: number) => {
    localStorage.setItem("activeWorkspaceId", String(workspaceId));
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, token, logout, switchWorkspace }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
