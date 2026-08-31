export const CURRENCIES = [
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "US Dollar" },
  { code: "GBP", label: "British Pound" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CNY", label: "Chinese Yuan" }
] as const;

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  OPERATOR: "Inserimento",
  VIEWER: "Lettura"
};

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Contanti" },
  { value: "ELECTRONIC", label: "Elettronico" },
  { value: "CHECK", label: "Assegno" }
] as const;

export function isPaymentMethod(value: string | null | undefined) {
  return PAYMENT_METHODS.some((method) => method.value === value);
}

export function paymentMethodLabel(value: string | null | undefined) {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value ?? "—";
}

export function settlementStatusLabel(type: "INCOME" | "EXPENSE", status: "PENDING" | "SETTLED") {
  if (type === "INCOME") {
    return status === "SETTLED" ? "Pagamento ricevuto" : "Da pagare";
  }
  return status === "SETTLED" ? "Pagata" : "Da pagare";
}
