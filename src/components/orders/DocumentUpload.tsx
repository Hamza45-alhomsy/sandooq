// src/components/orders/DocumentUpload.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
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
import { toast } from "sonner";
import { Upload, File } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  orderId: number;
  onUploadComplete?: () => void;
}

export function DocumentUpload({
  orderId,
  onUploadComplete,
}: DocumentUploadProps) {
  const t = useTranslations("Documents");
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orderId", String(orderId));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/documents/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (response.ok) {
        toast.success(t("uploadSuccess"));
        setOpen(false);
        setFile(null);
        if (onUploadComplete) onUploadComplete();
      } else {
        const error = await response.json();
        toast.error(error.error || t("uploadError"));
      }
    } catch (error) {
      toast.error(t("uploadError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2",
        )}
      >
        <Upload className="h-4 w-4" />
        {t("upload")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("upload")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <File className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("dragDrop")}
            </p>
            <p className="text-xs text-muted-foreground">{t("fileTypes")}</p>
            <Input
              type="file"
              onChange={handleFileChange}
              className="mt-4 cursor-pointer"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            {file && <p className="mt-2 text-sm font-medium">{file.name}</p>}
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? t("uploading") : t("upload")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
