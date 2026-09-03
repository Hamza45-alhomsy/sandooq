import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TransactionsFiltersProps {
  search: string;
  status: string;
  type: string;
  startDate?: Date;
  endDate?: Date;
  locale: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string | null) => void;
  onTypeChange: (value: string | null) => void;
  onStartDateChange: (date?: Date) => void;
  onEndDateChange: (date?: Date) => void;
  onClear: () => void;
  hasFilters: boolean;
  t: (key: string) => string;
}

export function TransactionsFilters({
  search,
  status,
  type,
  startDate,
  endDate,
  locale,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
  hasFilters,
  t,
}: TransactionsFiltersProps) {
  const dateFormat = locale === "ar" ? "dd/MM/yyyy" : "MM/dd/yyyy";
  const dateLocale = locale === "ar" ? ar : undefined;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-md border p-4 bg-muted/20">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[150px]">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={t("Common.search") || "Search..."}
          />
        </div>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("Transactions.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("Common.all") || "All"}</SelectItem>
            <SelectItem value="pending">{t("Common.pending")}</SelectItem>
            <SelectItem value="approved">{t("Common.approved")}</SelectItem>
            <SelectItem value="rejected">{t("Common.rejected")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t("Transactions.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("Common.all") || "All"}</SelectItem>
            <SelectItem value="income">{t("Common.income")}</SelectItem>
            <SelectItem value="expense">{t("Common.expense")}</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-[150px] justify-start text-left font-normal",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, dateFormat) : t("Common.from")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              locale={dateLocale}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-[150px] justify-start text-left font-normal",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, dateFormat) : t("Common.to")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              locale={dateLocale}
            />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
            <X className="h-4 w-4" />
            {t("Common.clear") || "Clear"}
          </Button>
        )}
      </div>
    </div>
  );
}
