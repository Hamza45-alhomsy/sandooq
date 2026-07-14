// src/app/orders/create/page.tsx
"use client";

import { useState } from "react";
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

export default function CreateOrderPage() {
  const t = useTranslations();
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const orderSchema = z.object({
    type: z.enum(["income", "expense"], {
      required_error: t("CreateOrder.orderType"),
    }),
    description: z.string().optional(),
    items: z
      .array(
        z.object({
          description: z.string().min(1, t("CreateOrder.description")),
          quantity: z.number().min(1, t("CreateOrder.quantity")),
          unitPrice: z.number().min(0.01, t("CreateOrder.price")),
        }),
      )
      .min(1, t("CreateOrder.items")),
  });

  type OrderFormData = z.infer<typeof orderSchema>;

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

  const onSubmit = async (data: OrderFormData) => {
    setLoading(true);
    try {
      const response = await fetch(
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

      if (response.ok) {
        toast.success(t("Common.createSuccess"));
        router.push("/orders");
      } else {
        const error = await response.json();
        toast.error(error.error || t("Common.createFailed"));
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

              <div>
                <Label>{t("CreateOrder.description")}</Label>
                <Input
                  {...register("description")}
                  placeholder={t("CreateOrder.descriptionPlaceholder")}
                />
              </div>

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
                {errors.items &&
                  typeof errors.items === "object" &&
                  !Array.isArray(errors.items) && (
                    <p className="text-sm text-red-500 mt-1">
                      {(errors.items as any)?.message}
                    </p>
                  )}
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

              <div className="pt-4 border-t">
                <p className="text-lg font-bold">
                  {t("CreateOrder.total")}: {totalAmount.toLocaleString()}{" "}
                  {t("Common.syp")}
                </p>
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
