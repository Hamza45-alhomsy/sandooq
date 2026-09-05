// src/app/[locale]/transactions/create/page.tsx
"use client";

import { useSettings } from "@/hooks/useSettings";
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
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

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const transactionSchema = z.object({
  type: z.enum(["income", "expense"], {
    required_error: "نوع الطلب مطلوب",
  }),
  description: z.string().trim().min(1, "عنوان المعاملة مطلوب"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "الوصف مطلوب"),
        quantity: z.number().min(0.01, "الكمية مطلوبة"),
        unitPrice: z.number().min(0.01, "السعر مطلوب"),
        categoryId: z.number().int().nullable().optional(),
      }),
    )
    .min(1, "يجب إضافة عنصر واحد على الأقل"),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface UploadFile {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

interface PersistedUploadFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

const TRANSACTION_FILE_STORAGE_KEY = "transaction-create-uploaded-files";

const sanitizeDecimalInput = (value: string) => {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalized = trimmed.replace(/,/g, ".");
  const decimalCount = (normalized.match(/\./g) || []).length;

  if (decimalCount > 1) {
    const firstDot = normalized.indexOf(".");
    const lastDot = normalized.lastIndexOf(".");
    return normalized.slice(0, firstDot + 1) + normalized.slice(lastDot + 1);
  }

  return normalized.replace(/[^0-9.]/g, "");
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const dataUrlToFile = async (item: PersistedUploadFile) => {
  const response = await fetch(item.dataUrl);
  const blob = await response.blob();

  const file = new Blob([blob], { type: item.type }) as File;
  Object.defineProperty(file, "name", {
    value: item.name,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(file, "lastModified", {
    value: Date.now(),
    writable: false,
    configurable: true,
  });

  return file;
};

export default function CreateTransactionPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [decimalInputs, setDecimalInputs] = useState<Record<string, string>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currency } = useSettings();
  const { data: categories = [] } = useSWR("/api/categories", fetcher, {
    revalidateOnMount: true,
    revalidateIfStale: true,
    revalidateOnFocus: true,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      items: [{ description: "", quantity: 1, unitPrice: 0, categoryId: null }],
    },
  });

  const watchedItems = watch("items");
  const watchedType = watch("type");
  const filteredCategories =
    categories.filter((category: any) => category.type === watchedType) || [];
  const getCategoryName = (category: any) =>
    category
      ? locale === "ar"
        ? category.nameAr || category.name
        : category.name
      : t("Settings.category");

  useEffect(() => {
    watchedItems.forEach((item, index) => {
      if (!item || item.categoryId === undefined || item.categoryId === null)
        return;

      const matchesCurrentType = (categories as any[]).some(
        (category) =>
          category.id === item.categoryId && category.type === watchedType,
      );

      if (!matchesCurrentType) {
        setValue(`items.${index}.categoryId`, null, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
  }, [categories, watchedItems, watchedType, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  useEffect(() => {
    const restoreUploadedFiles = async () => {
      try {
        const saved = sessionStorage.getItem(TRANSACTION_FILE_STORAGE_KEY);
        if (!saved) return;

        const parsed: PersistedUploadFile[] = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length === 0) return;

        const restoredFiles = await Promise.all(
          parsed.map(async (item) => {
            const file = await dataUrlToFile(item);
            return {
              file,
              preview: item.dataUrl,
              name: item.name,
              size: item.size,
              type: item.type,
            } satisfies UploadFile;
          }),
        );

        setUploadedFiles(restoredFiles);
      } catch (error) {
        console.error("Failed to restore uploaded files:", error);
        sessionStorage.removeItem(TRANSACTION_FILE_STORAGE_KEY);
      }
    };

    restoreUploadedFiles();
  }, []);

  useEffect(() => {
    if (uploadedFiles.length === 0) {
      sessionStorage.removeItem(TRANSACTION_FILE_STORAGE_KEY);
      return;
    }

    const persistUploadedFiles = async () => {
      try {
        const persisted = await Promise.all(
          uploadedFiles.map(async (file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: await fileToDataUrl(file.file),
          })),
        );
        sessionStorage.setItem(
          TRANSACTION_FILE_STORAGE_KEY,
          JSON.stringify(persisted),
        );
      } catch (error) {
        console.error("Failed to persist uploaded files:", error);
      }
    };

    persistUploadedFiles();
  }, [uploadedFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

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
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      const transactionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!transactionResponse.ok) {
        const error = await transactionResponse.json();
        toast.error(error.error || t("Common.createFailed"));
        setLoading(false);
        return;
      }

      const transaction = await transactionResponse.json();

      if (uploadedFiles.length > 0) {
        let uploadErrors = 0;
        for (const uploadedFile of uploadedFiles) {
          const formData = new FormData();
          formData.append("file", uploadedFile.file);
          formData.append("transactionId", String(transaction.id));

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
          toast.warning(t("Common.uploadWarning", { count: uploadErrors }));
        } else {
          toast.success(t("Documents.uploadSuccess"));
        }
      }

      sessionStorage.removeItem(TRANSACTION_FILE_STORAGE_KEY);
      toast.success(t("Common.createSuccess"));
      router.push("/transactions");
    } catch (error) {
      toast.error(t("Common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const sanitized = sanitizeDecimalInput(event.target.value);
    const numericValue = sanitized === "" ? 0 : Number(sanitized);

    setDecimalInputs((prev) => ({
      ...prev,
      [`items.${index}.quantity`]: sanitized,
    }));

    setValue(`items.${index}.quantity`, numericValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleUnitPriceChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const sanitized = sanitizeDecimalInput(event.target.value);
    const numericValue = sanitized === "" ? 0 : Number(sanitized);

    setDecimalInputs((prev) => ({
      ...prev,
      [`items.${index}.unitPrice`]: sanitized,
    }));

    setValue(`items.${index}.unitPrice`, numericValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const totalAmount = watchedItems.reduce(
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{t("CreateTransaction.transactionInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("CreateTransaction.transactionType")}</Label>
                <Select
                  value={watchedType}
                  onValueChange={(value) =>
                    setValue("type", value as "income" | "expense")
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("CreateTransaction.selectType")}
                    >
                      {watchedType === "income"
                        ? t("Common.income")
                        : watchedType === "expense"
                          ? t("Common.expense")
                          : t("CreateTransaction.selectType")}
                    </SelectValue>
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

              <div>
                <Label>{t("CreateTransaction.transactionTitle")}</Label>
                <Input
                  {...register("description")}
                  placeholder={t(
                    "CreateTransaction.transactionTitlePlaceholder",
                  )}
                  required
                />
                {errors.description && (
                  <p className="text-sm text-red-500">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-lg font-semibold">
                  {t("CreateTransaction.items")}
                </Label>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="mt-4 border-t pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <Label
                          htmlFor={`items.${index}.description`}
                          className="text-sm"
                        >
                          {t("CreateTransaction.description")}
                        </Label>
                        <Input
                          id={`items.${index}.description`}
                          {...register(`items.${index}.description`)}
                          placeholder={t(
                            "CreateTransaction.descriptionPlaceholderItem",
                          )}
                        />
                        {errors.items?.[index]?.description && (
                          <p className="text-sm text-red-500">
                            {errors.items[index]?.description?.message}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label
                            htmlFor={`items.${index}.categoryId`}
                            className="text-sm"
                          >
                            {t("Settings.category")}
                          </Label>
                          <Select
                            value={
                              watchedItems[index]?.categoryId !== undefined &&
                              watchedItems[index]?.categoryId !== null
                                ? String(watchedItems[index]?.categoryId)
                                : ""
                            }
                            onValueChange={(value) =>
                              setValue(
                                `items.${index}.categoryId`,
                                value ? Number(value) : null,
                                {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                },
                              )
                            }
                          >
                            <SelectTrigger id={`items.${index}.categoryId`}>
                              <SelectValue
                                placeholder={
                                  t("Settings.selectCategory") ||
                                  "Select category"
                                }
                              >
                                {getCategoryName(
                                  categories.find(
                                    (category: any) =>
                                      category.id ===
                                      watchedItems[index]?.categoryId,
                                  ),
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {filteredCategories.length === 0 ? (
                                <div className="px-2 py-2 text-sm text-muted-foreground">
                                  {t("Settings.noCategories") ||
                                    "No categories available"}
                                </div>
                              ) : (
                                filteredCategories.map((category: any) => (
                                  <SelectItem
                                    key={category.id}
                                    value={String(category.id)}
                                  >
                                    {getCategoryName(category)}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor={`items.${index}.quantity`}
                            className="text-sm"
                          >
                            {t("CreateTransaction.quantity")}
                          </Label>
                          <Input
                            id={`items.${index}.quantity`}
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            placeholder={t("CreateTransaction.quantity")}
                            value={
                              decimalInputs[`items.${index}.quantity`] ??
                              String(watchedItems[index]?.quantity ?? 1)
                            }
                            onChange={(event) =>
                              handleQuantityChange(index, event)
                            }
                            onKeyDown={(event) => {
                              if (["e", "E", "+", "-"].includes(event.key)) {
                                event.preventDefault();
                              }
                            }}
                          />
                          {errors.items?.[index]?.quantity && (
                            <p className="text-sm text-red-500">
                              {errors.items[index]?.quantity?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label
                            htmlFor={`items.${index}.unitPrice`}
                            className="text-sm"
                          >
                            {t("CreateTransaction.price")} ({currency})
                          </Label>
                          <Input
                            id={`items.${index}.unitPrice`}
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            placeholder={t("CreateTransaction.price")}
                            value={
                              decimalInputs[`items.${index}.unitPrice`] ??
                              String(watchedItems[index]?.unitPrice ?? 0)
                            }
                            onChange={(event) =>
                              handleUnitPriceChange(index, event)
                            }
                            onKeyDown={(event) => {
                              if (["e", "E", "+", "-"].includes(event.key)) {
                                event.preventDefault();
                              }
                            }}
                          />
                          {errors.items?.[index]?.unitPrice && (
                            <p className="text-sm text-red-500">
                              {errors.items[index]?.unitPrice?.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            {t("CreateTransaction.remove")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    append({
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      categoryId: null,
                    })
                  }
                >
                  {t("CreateTransaction.addItem")}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-lg font-semibold">
                  {t("Documents.title")}
                </Label>

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
                        <div className="flex items-center gap-2">
                          <a
                            href={file.preview}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button type="button" variant="outline" size="sm">
                              {t("Common.view") || "View"}
                            </Button>
                          </a>
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-lg font-bold">
                  {t("CreateTransaction.total")}: {totalAmount.toLocaleString()}{" "}
                  {currency}
                </p>
                {uploadedFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {uploadedFiles.length} document(s) will be attached
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? t("CreateTransaction.creating")
                  : t("CreateTransaction.create")}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
