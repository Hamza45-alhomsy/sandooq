// src/app/[locale]/orders/create/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import * as z from "zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const orderSchema = z.object({
  type: z.enum(["income", "expense"], {
    required_error: "نوع الطلب مطلوب",
  }),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "الوصف مطلوب"),
        quantity: z.number().min(1, "الكمية مطلوبة"),
        unitPrice: z.number().min(0.01, "السعر مطلوب"),
      }),
    )
    .min(1, "يجب إضافة عنصر واحد على الأقل"),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface UploadFile {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

export default function CreateOrderPage() {
  const t = useTranslations();
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: "expense",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

      // Validate file type
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        continue;
      }

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev];
      // Revoke the object URL to prevent memory leaks
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const onSubmit = async (data: OrderFormData) => {
    setLoading(true);
    try {
      // 1. Create the order
      const orderResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        toast.error(error.error || t("Common.createFailed"));
        setLoading(false);
        return;
      }

      const order = await orderResponse.json();

      // 2. Upload all documents
      if (uploadedFiles.length > 0) {
        let uploadErrors = 0;
        for (const uploadedFile of uploadedFiles) {
          const formData = new FormData();
          formData.append("file", uploadedFile.file);
          formData.append("orderId", String(order.id));

          try {
            const uploadResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/documents/upload`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              },
            );

            if (!uploadResponse.ok) {
              uploadErrors++;
              console.error(`Failed to upload: ${uploadedFile.name}`);
            }
          } catch (error) {
            uploadErrors++;
            console.error(`Error uploading ${uploadedFile.name}:`, error);
          }
        }

        if (uploadErrors > 0) {
          toast.warning(
            `Order created but ${uploadErrors} document(s) failed to upload`,
          );
        } else {
          toast.success(t("Documents.uploadSuccess"));
        }
      }

      toast.success(t("Common.createSuccess"));
      router.push("/orders");
    } catch (error) {
      toast.error(t("Common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = watch("items").reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold">{t("CreateOrder.title")}</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{t("CreateOrder.orderInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Type */}
              <div>
                <Label>{t("CreateOrder.orderType")}</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("type", value as "income" | "expense")
                  }
                  defaultValue="expense"
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("CreateOrder.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t("Common.income")}</SelectItem>
                    <SelectItem value="expense">
                      {t("Common.expense")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.type.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label>{t("CreateOrder.description")}</Label>
                <Input
                  {...register("description")}
                  placeholder={t("CreateOrder.descriptionPlaceholder")}
                />
              </div>

              {/* Items */}
              <div>
                <Label className="text-lg font-semibold">
                  {t("CreateOrder.items")}
                </Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 mt-2 items-end">
                    <div className="flex-1">
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder={t(
                          "CreateOrder.descriptionPlaceholderItem",
                        )}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-sm text-red-500">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-20">
                      <Input
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        placeholder={t("CreateOrder.quantity")}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-sm text-red-500">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-28">
                      <Input
                        {...register(`items.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.01"
                        placeholder={t("CreateOrder.price")}
                      />
                      {errors.items?.[index]?.unitPrice && (
                        <p className="text-sm text-red-500">
                          {errors.items[index]?.unitPrice?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      {t("CreateOrder.remove")}
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    append({ description: "", quantity: 1, unitPrice: 0 })
                  }
                >
                  {t("CreateOrder.addItem")}
                </Button>
              </div>

              {/* 📤 Document Upload Section */}
              <div className="pt-4 border-t">
                <Label className="text-lg font-semibold">
                  {t("Documents.title")}
                </Label>

                {/* Drop Zone */}
                <div
                  className={cn(
                    "mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    "hover:border-primary hover:bg-primary/5",
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("Documents.dragDrop")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Documents.fileTypes")}
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                </div>

                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">
                      {uploadedFiles.length} file(s) selected
                    </p>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted p-2 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <File className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-4 border-t">
                <p className="text-lg font-bold">
                  {t("CreateOrder.total")}: {totalAmount.toLocaleString()}{" "}
                  {t("Common.syp")}
                </p>
                {uploadedFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {uploadedFiles.length} document(s) will be attached
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("CreateOrder.creating") : t("CreateOrder.create")}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
