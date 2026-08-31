"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CURRENCIES, PAYMENT_METHODS, isPaymentMethod } from "@/lib/constants";

type TransactionType = "INCOME" | "EXPENSE";
type SettlementStatus = "PENDING" | "SETTLED";

type CategoryOption = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "BOTH";
  isActive: boolean;
};

export type TransactionFormInitialValues = {
  type: TransactionType;
  transactionDate: string;
  categoryId: string;
  currencyCode: string;
  amount: string;
  exchangeRate: number | null;
  description: string;
  paymentMethod: string | null;
  reference: string;
  notes: string;
  settlementStatus: SettlementStatus;
  dueDate: string;
};

type TransactionFormProps = {
  action: string;
  baseCurrency: string;
  categories: CategoryOption[];
  submitLabel: string;
  cancelHref: string;
  initial?: TransactionFormInitialValues;
};

function isCategoryAvailable(category: CategoryOption, type: TransactionType, selectedCategoryId: string) {
  return (category.isActive || category.id === selectedCategoryId) && (category.type === type || category.type === "BOTH");
}

export function TransactionForm({ action, baseCurrency, categories, submitLabel, cancelHref, initial }: TransactionFormProps) {
  const initialType = initial?.type ?? "EXPENSE";
  const initialCategoryId = initial?.categoryId || categories.find((category) => isCategoryAvailable(category, initialType, ""))?.id || "";
  const [type, setType] = useState<TransactionType>(initialType);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [isSettled, setIsSettled] = useState(initial?.settlementStatus !== "PENDING");
  const availableCategories = useMemo(
    () => categories.filter((category) => isCategoryAvailable(category, type, categoryId)),
    [categories, categoryId, type]
  );
  const legacyPaymentMethod = initial?.paymentMethod && !isPaymentMethod(initial.paymentMethod) ? initial.paymentMethod : null;
  const statusLabel = type === "INCOME" ? (isSettled ? "Pagamento ricevuto" : "Da pagare") : isSettled ? "Pagata" : "Promemoria: da pagare";
  const statusDescription = type === "INCOME"
    ? (isSettled ? "L'importo è incluso nelle entrate effettuate." : "Il cliente deve ancora pagare: l'importo resta fuori dalle entrate effettuate.")
    : (isSettled ? "L'uscita è inclusa nei dati effettuati." : "Promemoria di un pagamento da effettuare: l'uscita resta fuori dai dati effettuati.");
  const dueDateLabel = type === "INCOME" ? "Data prevista di pagamento" : "Data promemoria (facoltativa)";

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    const selectedIsValid = categories.some((category) => isCategoryAvailable(category, nextType, categoryId));
    if (!selectedIsValid) {
      const firstAvailable = categories.find((category) => isCategoryAvailable(category, nextType, ""));
      setCategoryId(firstAvailable?.id ?? "");
    }
  }

  return (
    <form action={action} method="post" className="stack">
      <input type="hidden" name="settlementStatus" value={isSettled ? "SETTLED" : "PENDING"} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="type">Tipo</label>
          <select className="select" id="type" name="type" value={type} onChange={(event) => handleTypeChange(event.target.value as TransactionType)}>
            <option value="INCOME">Entrata</option>
            <option value="EXPENSE">Uscita</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="transactionDate">Data del movimento</label>
          <input className="input" id="transactionDate" type="date" name="transactionDate" defaultValue={initial?.transactionDate} required />
        </div>
        <div className="field">
          <label htmlFor="categoryId">Categoria</label>
          <select className="select" id="categoryId" name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            {availableCategories.length === 0 ? <option value="">Nessuna categoria disponibile</option> : null}
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}{category.type === "BOTH" ? " (entrate e uscite)" : ""}
              </option>
            ))}
          </select>
          <span className="helper-text">Sono mostrate solo le categorie adatte al tipo selezionato.</span>
        </div>
        <div className="field">
          <label htmlFor="currencyCode">Valuta</label>
          <select className="select" id="currencyCode" name="currencyCode" defaultValue={initial?.currencyCode ?? baseCurrency}>
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} · {currency.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="amount">Importo</label>
          <input className="input" id="amount" name="amount" placeholder="1234,56" defaultValue={initial?.amount} required />
        </div>
        <div className="field">
          <label htmlFor="exchangeRate">Tasso verso {baseCurrency}</label>
          <input className="input" id="exchangeRate" name="exchangeRate" type="number" step="0.000001" defaultValue={initial?.exchangeRate ?? undefined} placeholder="Lascia vuoto se stessa valuta o cambio salvato" />
        </div>
        <div className="field full-width">
          <label htmlFor="description">Descrizione</label>
          <input className="input" id="description" name="description" defaultValue={initial?.description} placeholder="Fattura marzo, canone affitto, incasso POS..." />
        </div>
        <div className="field">
          <label htmlFor="paymentMethod">Metodo di pagamento</label>
          <select className="select" id="paymentMethod" name="paymentMethod" defaultValue={initial?.paymentMethod ?? ""}>
            <option value="">Non specificato</option>
            {legacyPaymentMethod ? <option value={legacyPaymentMethod}>{legacyPaymentMethod} (valore precedente)</option> : null}
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="reference">Riferimento</label>
          <input className="input" id="reference" name="reference" defaultValue={initial?.reference} placeholder="Numero fattura, ordine, ecc." />
        </div>
        <div className="field full-width">
          <span className="field-label">Stato del pagamento</span>
          <label className="checkbox-row" htmlFor="isSettled">
            <input id="isSettled" type="checkbox" checked={isSettled} onChange={(event) => setIsSettled(event.target.checked)} />
            <span>
              <strong>{statusLabel}</strong>
              <span className="helper-text">{statusDescription}</span>
            </span>
          </label>
        </div>
        {!isSettled ? (
          <div className="field">
            <label htmlFor="dueDate">{dueDateLabel}</label>
            <input className="input" id="dueDate" type="date" name="dueDate" defaultValue={initial?.dueDate} />
            <span className="helper-text">Puoi lasciarla vuota.</span>
          </div>
        ) : null}
        <div className="field full-width">
          <label htmlFor="notes">Note</label>
          <textarea className="textarea" id="notes" name="notes" defaultValue={initial?.notes} placeholder="Informazioni aggiuntive opzionali" />
        </div>
      </div>
      <div className="form-actions">
        <button className="button button-primary" type="submit">{submitLabel}</button>
        <Link className="button button-ghost" href={cancelHref}>Annulla</Link>
      </div>
    </form>
  );
}
