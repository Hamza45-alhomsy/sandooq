export type TransactionStatus = "pending" | "approved" | "rejected";
export type TransactionType = "income" | "expense";

export interface TransactionItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  categoryId?: number | null;
  category?: {
    id: number;
    name: string;
  };
}

export interface Transaction {
  id: number;
  transactionNumber: string;
  type: TransactionType;
  status: TransactionStatus;
  totalAmount: number;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
  documents?: Array<{
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }>;
  items?: TransactionItem[];
}
