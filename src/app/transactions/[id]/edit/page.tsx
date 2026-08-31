import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TransactionForm } from "@/components/transaction-form";
import { requireUser } from "@/lib/guards";
import { formatDateInput } from "@/lib/format";
import { getCategories, getCompany, getTransactionById } from "@/lib/queries";

type EditTransactionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTransactionPage({ params }: EditTransactionPageProps) {
  const user = await requireUser(["ADMIN", "MANAGER", "OPERATOR"]);
  const { id } = await params;
  const [company, categories, transaction] = await Promise.all([
    getCompany(user.companyId),
    getCategories(user.companyId),
    getTransactionById(id, user.companyId, user.role === "OPERATOR" ? user.userId : undefined)
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <AppShell
      title="Modifica movimento"
      description="Aggiorna importi, categoria, descrizione o tasso di cambio della registrazione selezionata."
      currentPath="/transactions"
      user={user}
    >
      <section className="card">
        <TransactionForm
          action={`/api/transactions/${transaction.id}/update`}
          baseCurrency={company.baseCurrency}
          categories={categories}
          submitLabel="Aggiorna movimento"
          cancelHref="/transactions"
          initial={{
            type: transaction.type,
            transactionDate: formatDateInput(transaction.transactionDate),
            categoryId: transaction.categoryId,
            currencyCode: transaction.currencyCode,
            amount: (transaction.amountCents / 100).toFixed(2).replace(".", ","),
            exchangeRate: transaction.exchangeRate,
            description: transaction.description ?? "",
            paymentMethod: transaction.paymentMethod,
            reference: transaction.reference ?? "",
            notes: transaction.notes ?? "",
            settlementStatus: transaction.settlementStatus,
            dueDate: transaction.dueDate ? formatDateInput(transaction.dueDate) : ""
          }}
        />
      </section>
    </AppShell>
  );
}
