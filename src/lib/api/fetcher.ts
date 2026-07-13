// src/lib/api/fetcher.ts
import { auth } from "@/lib/firebase/config";

export const fetcher = async (url: string) => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error("Not authenticated");
  }

  const token = await firebaseUser.getIdToken();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "API request failed");
  }

  return res.json();
};
