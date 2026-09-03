// src/app/[locale]/invite/[token]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { user, token: authToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/invitations/${token}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        toast.success("You have been added to the workspace!");
        setAccepted(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to accept invitation");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please sign in to accept this invitation.
            </p>
            <Button className="w-full mt-4" onClick={() => router.push("/")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Workspace Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          {accepted ? (
            <p className="text-green-600">✅ You have joined the workspace!</p>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                You have been invited to join a workspace.
              </p>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? "Accepting..." : "Accept Invitation"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
