// src/contexts/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        setLoading(true);

        if (firebaseUser) {
          try {
            // Get Firebase ID token
            const idToken = await firebaseUser.getIdToken();
            setToken(idToken);

            // Verify with your backend and get user data + permissions
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: idToken }),
              },
            );

            if (res.ok) {
              const data = await res.json();
              setUser(data.user);
            } else {
              console.error("Failed to fetch user from backend");
              setUser(null);
              setToken(null);
              await signOut(auth);
            }
          } catch (error) {
            console.error("Auth error:", error);
            setUser(null);
            setToken(null);
          }
        } else {
          setUser(null);
          setToken(null);
        }

        setLoading(false);
      },
    );

    return () => unsubscribe();
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
