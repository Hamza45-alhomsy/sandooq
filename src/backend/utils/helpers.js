// utils/helpers.js — Helper utility functions
import { randomBytes } from "crypto";

export function generateTransactionNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${y}${m}${d}-${rand}`;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
