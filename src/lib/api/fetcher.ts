// src/lib/api/fetcher.ts
import { auth } from "@/lib/firebase/config";

export const fetcher = async (url: string) => {
  try {
    // Wait for Firebase to be ready
    await auth.authStateReady();

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error("Not authenticated");
    }

    // Force a fresh token
    let token = await firebaseUser.getIdToken(true);
    if (!token) {
      // If still null, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 500));
      token = await firebaseUser.getIdToken(true);
    }

    if (!token) {
      throw new Error("Unable to obtain authentication token");
    }

    // Log the token (for debugging – remove later)
    console.log("📤 Fetcher token:", token.slice(0, 20) + "...");

    // ✅ AbortController with 10-second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let res;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      clearTimeout(timeout);
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error("Request timed out after 10 seconds");
      }
      throw fetchError;
    }

    // ✅ Always check status and throw error if not OK
    if (!res.ok) {
      let errorMessage = `API error: ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response is not JSON, get text
        const text = await res.text();
        errorMessage = `API error: ${res.status} - ${text.slice(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    return res.json();
  } catch (error) {
    console.error("Fetcher error:", error);
    throw error; // Re-throw so SWR can catch it
  }
};
