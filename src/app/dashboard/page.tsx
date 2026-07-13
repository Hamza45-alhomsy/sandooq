// src/app/dashboard/page.tsx
"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR("/api/dashboard/stats", fetcher);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          جاري تحميل البيانات...
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-red-500">خطأ: {error.message}</div>
      </MainLayout>
    );
  }

  const stats = data?.stats || {};

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-bold">لوحة التحكم</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              إجمالي الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalOrders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendingOrders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">رصيد الصندوق</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.fundBalance || 0} SYP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">شهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.monthlyTotal || 0} SYP</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
