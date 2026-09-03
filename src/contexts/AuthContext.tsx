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
  role: string;
  permissions: string[];
  isActive: boolean;
  phone?: string;
  workspace: { id: number; name: string; role: string };
  workspaces: { id: number; name: string; role: string }[];
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

    // 🔥 1. Wait for Firebase to restore the session before doing anything
    const initAuth = async () => {
      try {
        await auth.authStateReady();
        if (!isMounted.current) return;

        const firebaseUser = auth.currentUser;

        if (firebaseUser) {
          // User is authenticated – verify with backend
          try {
            const idToken = await firebaseUser.getIdToken(true);
            setToken(idToken);

            const res = await fetch(`${API_URL}/api/auth/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: idToken }),
            });

            if (res.status === 401 || res.status === 403) {
              console.warn("Token invalid or user disabled.");
              await signOut(auth);
              setUser(null);
              setToken(null);
            } else if (res.ok) {
              const data = await res.json();
              setUser(data.user);
            } else {
              console.error("Backend error:", res.status);
              setUser(null);
              setToken(null);
            }
          } catch (error) {
            console.error("Network error:", error);
            setUser(null);
            setToken(null);
          }
        } else {
          // No user at all
          setUser(null);
          setToken(null);
        }

        // ✅ Initial loading is done – set loading to false
        if (isMounted.current) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isMounted.current) {
          setLoading(false);
          setUser(null);
          setToken(null);
        }
      }
    };

    // 🔥 2. Subscribe to future auth changes (after initial load)
    // Inside onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(
        "🔥 1. onAuthStateChanged fired. User:",
        firebaseUser?.email || "null",
      );

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true);
          if (idToken) {
            setToken(idToken);
          } else {
            console.error("Failed to get ID token");
          }
          const res = await fetch(`${API_URL}/api/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: idToken }),
          });
          console.log("📡 3. /api/auth/verify status:", res.status);

          if (res.ok) {
            const data = await res.json();
            console.log("👤 4. User data received:", data.user);
            setUser(data.user);
            console.log("✅ 5. User state set.");
          } else {
            console.error("❌ 6. /api/auth/verify failed:", await res.text());
          }
        } catch (error) {
          console.error("❌ 7. Error in auth flow:", error);
        }
      } else {
        console.log("🚫 No user, logging out.");
        setUser(null);
        setToken(null);
      }
      setLoading(false);
      console.log("⏳ 8. loading set to false.");
    });

    // Run the initialisation
    initAuth();

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setToken(null);
  };

  const switchWorkspace = (workspaceId: number) => {
    window.localStorage.setItem("activeWorkspaceId", String(workspaceId));
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
