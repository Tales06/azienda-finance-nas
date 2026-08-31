import { cleanOptional } from "@/lib/format";
import { isPaymentMethod } from "@/lib/constants";

export type ParsedTransactionDetails = {
  categoryId: string;
  type: "INCOME" | "EXPENSE";
  paymentMethod: string | null;
  settlementStatus: "PENDING" | "SETTLED";
  dueDate: Date | null;
};

function parseDate(value: FormDataEntryValue | null, fieldName: string) {
  const dateValue = cleanOptional(value);
  if (!dateValue) {
    throw new Error(`${fieldName} obbligatoria`);
  }
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} non valida`);
  }
  return parsed;
}

function parseOptionalDate(value: FormDataEntryValue | null, fieldName: string) {
  const dateValue = cleanOptional(value);
  if (!dateValue) {
    return null;
  }
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} non valida`);
  }
  return parsed;
}

export function parseTransactionDetails(formData: FormData, previousPaymentMethod?: string | null): ParsedTransactionDetails {
  const type = String(formData.get("type") ?? "");
  if (type !== "INCOME" && type !== "EXPENSE") {
    throw new Error("Tipo di movimento non valido");
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    throw new Error("Categoria obbligatoria");
  }

  const settlementStatus = String(formData.get("settlementStatus") ?? "SETTLED");
  if (settlementStatus !== "PENDING" && settlementStatus !== "SETTLED") {
    throw new Error("Stato pagamento non valido");
  }

  const paymentMethod = cleanOptional(formData.get("paymentMethod"));
  if (paymentMethod && !isPaymentMethod(paymentMethod) && paymentMethod !== previousPaymentMethod) {
    throw new Error("Metodo di pagamento non valido");
  }

  return {
    categoryId,
    type,
    paymentMethod,
    settlementStatus,
    dueDate: settlementStatus === "PENDING" ? parseOptionalDate(formData.get("dueDate"), "Data prevista") : null
  };
}

export function parseTransactionDate(formData: FormData) {
  return parseDate(formData.get("transactionDate"), "Data del movimento");
}
