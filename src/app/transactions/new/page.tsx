import { AppShell } from "@/components/app-shell";
import { TransactionForm } from "@/components/transaction-form";
import { requireUser } from "@/lib/guards";
import { formatDateInput } from "@/lib/format";
import { getCategories, getCompany } from "@/lib/queries";

export default async function NewTransactionPage() {
  const user = await requireUser(["ADMIN", "MANAGER", "OPERATOR"]);
  const [company, categories] = await Promise.all([
    getCompany(user.companyId),
    getCategories(user.companyId)
  ]);

  return (
    <AppShell
      title="Nuovo movimento"
      description="Registra una nuova entrata o uscita e, se serve, un tasso di cambio dedicato."
      currentPath="/transactions"
      user={user}
    >
      <section className="card">
        <TransactionForm
          action="/api/transactions"
          baseCurrency={company.baseCurrency}
          categories={categories}
          submitLabel="Salva movimento"
          cancelHref="/transactions"
          initial={{
            type: "EXPENSE",
            transactionDate: formatDateInput(new Date()),
            categoryId: "",
            currencyCode: company.baseCurrency,
            amount: "",
            exchangeRate: null,
            description: "",
            paymentMethod: null,
            reference: "",
            notes: "",
            settlementStatus: "SETTLED",
            dueDate: ""
          }}
        />
      </section>
    </AppShell>
  );
}
