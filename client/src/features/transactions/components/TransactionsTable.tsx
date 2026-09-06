import type { Transaction } from "@/features/transactions/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { File } from "lucide-react";

interface TransactionsTableProps {
  transactions: Transaction[];
  currency?: string;
  t: (key: string) => string;
}

export function TransactionsTable({
  transactions,
  currency,
  t,
}: TransactionsTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Transactions.transactionNumber")}</TableHead>
            <TableHead className="hidden sm:table-cell">
              {t("Transactions.transactionTitle")}
            </TableHead>
            <TableHead>{t("Transactions.type")}</TableHead>
            <TableHead>{t("Transactions.amount")}</TableHead>
            <TableHead className="hidden md:table-cell">
              {t("Transactions.date")}
            </TableHead>
            <TableHead>{t("Documents.title")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions?.map((transaction) => (
            <TableRow
              key={transaction.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                (window.location.href = `/transactions/${transaction.id}`)
              }
            >
              <TableCell className="font-medium">
                {transaction.transactionNumber}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {transaction.description || "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    transaction.type === "income" ? "default" : "destructive"
                  }
                >
                  {transaction.type === "income"
                    ? t("Common.income")
                    : t("Common.expense")}
                </Badge>
              </TableCell>
              <TableCell>
                {transaction.totalAmount.toLocaleString()} {currency || "SYP"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {new Date(transaction.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {transaction.documents?.length ? (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 w-fit"
                  >
                    <File className="h-3 w-3" />
                    {transaction.documents.length}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}

          {!transactions?.length && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                {t("Common.noTransactions")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
