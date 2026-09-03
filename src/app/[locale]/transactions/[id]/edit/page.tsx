"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
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
import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

// Zod schema (matches backend)
const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().int().positive("Quantity must be at least 1"),
        unitPrice: z.number().positive("Unit price must be greater than 0"),
      }),
    )
    .min(1, "At least one item is required"),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function EditTransactionPage() {
  const t = useTranslations();
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const {
    data: transaction,
    isLoading,
    mutate,
  } = useSWR(`/api/transactions/${id}`, fetcher);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0); // force re-render on data change

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Load transaction data into form
  useEffect(() => {
    if (transaction) {
      setValue("type", transaction.type);
      setValue("description", transaction.description || "");
      // Clear default items and set from transaction
      if (transaction.items && transaction.items.length > 0) {
        // Remove the default empty item
        remove(0);
        transaction.items.forEach((item: any) => {
          append({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          });
        });
      }
      setFormKey((prev) => prev + 1);
    }
  }, [transaction, setValue, append, remove]);

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      // ✅ Send the current updatedAt timestamp for version check
      const payload = {
        ...data,
        updatedAt: transaction.updatedAt,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      // 🔐 Handle conflict (409)
      if (response.status === 409) {
        const error = await response.json();
        toast.error(error.error || t("TransactionDetail.updateConflict"));
        // Refresh transaction data and re-populate form
        await mutate();
        return;
      }

      if (response.ok) {
        toast.success(t("TransactionDetail.updateSuccess"));
        router.push(`/transactions/${id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || t("TransactionDetail.updateFailed"));
      }
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

  if (isLoading) {
    return (
      <MainLayout>
        <div>{t("Common.loading")}</div>
      </MainLayout>
    );
  }

  if (!transaction) {
    return (
      <MainLayout>
        <div>{t("TransactionDetail.notFound")}</div>
      </MainLayout>
    );
  }

  // Only pending transactions can be edited
  if (transaction.status !== "pending") {
    return (
      <MainLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {t("TransactionDetail.noLongerPending")}
          </p>
          <Button className="mt-4" onClick={() => router.push(`/transactions/${id}`)}>
            {t("TransactionDetail.view")}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {t("TransactionDetail.editTransaction")} {transaction.transactionNumber}
          </h1>
          <Button variant="outline" onClick={() => router.back()}>
            {t("Common.back")}
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} key={formKey}>
          <Card>
            <CardHeader>
              <CardTitle>{t("CreateTransaction.transactionInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type */}
              <div>
                <Label>{t("CreateTransaction.transactionType")}</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("type", value as "income" | "expense")
                  }
                  defaultValue={transaction.type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("CreateTransaction.selectType")} />
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
                <Label>{t("CreateTransaction.description")}</Label>
                <Input
                  {...register("description")}
                  placeholder={t("CreateTransaction.descriptionPlaceholder")}
                />
              </div>

              {/* Items */}
              <div>
                <Label className="text-lg font-semibold">Items</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 mt-2 items-end">
                    <div className="flex-1">
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder="Description"
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
                        placeholder="Qty"
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
                        placeholder="Price"
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
                      Remove
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
                  Add Item
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-lg font-bold">
                  Total: {totalAmount.toLocaleString()} SYP
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
