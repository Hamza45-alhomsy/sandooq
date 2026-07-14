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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const verifyUser = async (firebaseUser: FirebaseUser | null) => {
      if (!isMounted.current) return;

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true);
          setToken(idToken);

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: idToken }),
            },
          );

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
        // No user
        setUser(null);
        setToken(null);
      }

      // 🔥 IMPORTANT: Only set loading to false AFTER the first check is complete
      if (isMounted.current) {
        setLoading(false);
      }
    };

    // 🛡️ Step 1: Wait for Firebase to restore the session
    // This prevents the initial 'null' emission from triggering a redirect.
    auth
      .authStateReady()
      .then(() => {
        if (!isMounted.current) return;
        // Now the session is restored, get the current user.
        const firebaseUser = auth.currentUser;
        verifyUser(firebaseUser);
      })
      .catch((error) => {
        console.error("authStateReady error:", error);
        if (isMounted.current) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
      });

    // 🛡️ Step 2: Subscribe to future auth changes (logout, login in other tabs)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only handle changes after the initial load is done
      // If loading is false, we are in "watching" mode.
      if (!loading) {
        verifyUser(firebaseUser);
      }
    });

    // Cleanup
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

  return (
    <AuthContext.Provider value={{ user, loading, token, logout }}>
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
