import { auth } from "@/lib/firebase/config";

export const fetcher = async (url: string) => {
  try {
    await auth.authStateReady();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Not authenticated");

    let token = await firebaseUser.getIdToken(true);
    if (!token) throw new Error("Token is null");

    // ✅ Get the active workspace ID from localStorage
    const workspaceId = localStorage.getItem("activeWorkspaceId");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // ✅ Add workspace header if available

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      let errorMessage = `API error: ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        const text = await res.text();
        errorMessage = `API error: ${res.status} - ${text.slice(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    return res.json();
  } catch (error) {
    console.error("Fetcher error:", error);
    throw error;
  }
};
