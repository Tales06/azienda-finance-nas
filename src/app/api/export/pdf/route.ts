import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionUser } from "@/lib/auth";
import { paymentMethodLabel, settlementStatusLabel } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCompany, getTransactions } from "@/lib/queries";
import { buildSummary, parseDateRange } from "@/lib/reporting";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (user.role === "OPERATOR") {
    return new Response("Forbidden", { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const showAll = search.get("all") === "1";
  const dateRange = parseDateRange(search.get("from") ?? undefined, search.get("to") ?? undefined);
  const type = search.get("type") ?? undefined;
  const categoryId = search.get("categoryId") ?? undefined;
  const currencyCode = search.get("currencyCode") ?? undefined;
  const settlementStatus = search.get("settlementStatus") ?? undefined;
  const [company, transactions] = await Promise.all([
    getCompany(user.companyId),
    getTransactions(user.companyId, {
      ...(showAll ? {} : dateRange),
      type,
      categoryId,
      currencyCode,
      settlementStatus
    })
  ]);
  const summary = buildSummary(transactions);

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const drawLine = (text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    if (y < 72) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
    }
    page.drawText(text, {
      x: 48,
      y,
      size: opts?.size ?? 11,
      font: opts?.bold ? boldFont : font,
      color: rgb(...(opts?.color ?? [0.06, 0.09, 0.16]))
    });
    y -= (opts?.size ?? 11) + 8;
  };
  const drawWrappedLine = (text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    const maxChars = 92;
    const words = text.split(/\s+/);
    let line = "";
    for (const word of words) {
      const nextLine = line ? `${line} ${word}` : word;
      if (nextLine.length > maxChars && line) {
        drawLine(line, opts);
        line = word;
      } else {
        line = nextLine;
      }
    }
    if (line) drawLine(line, opts);
  };

  drawLine(company.name, { bold: true, size: 18 });
  drawLine(showAll ? "Report di tutti i movimenti" : `Report movimenti dal ${formatDate(dateRange.from)} al ${formatDate(dateRange.to)}`);
  drawLine(`Entrate reali: ${formatCurrency(summary.incomeBaseCents, company.baseCurrency)}`, { color: [0.08, 0.5, 0.24] });
  drawLine(`Uscite reali: ${formatCurrency(summary.expenseBaseCents, company.baseCurrency)}`, { color: [0.8, 0.15, 0.15] });
  drawLine(`Saldo reale: ${formatCurrency(summary.balanceBaseCents, company.baseCurrency)}`, { bold: true });
  drawLine(`Entrate da pagare: ${formatCurrency(summary.pendingIncomeBaseCents, company.baseCurrency)}`, { color: [0.08, 0.5, 0.24] });
  drawLine(`Uscite da pagare: ${formatCurrency(summary.pendingExpenseBaseCents, company.baseCurrency)}`, { color: [0.8, 0.15, 0.15] });

  y -= 12;
  drawLine(`Movimenti inclusi: ${transactions.length}`, { bold: true });

  const drawTransaction = (item: (typeof transactions)[number]) => {
    const dueDate = item.dueDate ? ` · prevista ${formatDate(item.dueDate)}` : "";
    drawWrappedLine(
      `${formatDate(item.transactionDate)} · ${item.type === "INCOME" ? "Entrata" : "Uscita"} · ${settlementStatusLabel(item.type, item.settlementStatus)}${dueDate}`,
      { bold: true, size: 9 }
    );
    drawWrappedLine(
      `${item.category.name} · ${formatCurrency(item.amountCents, item.currencyCode)}${
        item.currencyCode !== company.baseCurrency ? ` · base ${formatCurrency(item.amountBaseCents, company.baseCurrency)}` : ""
      } · ${paymentMethodLabel(item.paymentMethod)}`,
      { size: 9 }
    );
    if (item.description || item.reference) {
      drawWrappedLine(`${item.description ?? ""}${item.reference ? ` · Rif. ${item.reference}` : ""}`, { size: 9 });
    }
    y -= 4;
  };

  const settledTransactions = transactions.filter((item) => item.settlementStatus === "SETTLED");
  const pendingTransactions = transactions.filter((item) => item.settlementStatus === "PENDING");

  y -= 8;
  drawLine(`Movimenti effettuati (${settledTransactions.length})`, { bold: true, size: 13 });
  if (settledTransactions.length === 0) {
    drawLine("Nessun movimento effettuato nel periodo.", { size: 9 });
  }
  for (const item of settledTransactions) {
    drawTransaction(item);
  }

  y -= 8;
  drawLine(`Movimenti da pagare (${pendingTransactions.length})`, { bold: true, size: 13 });
  if (pendingTransactions.length === 0) {
    drawLine("Nessun movimento da pagare nel periodo.", { size: 9 });
  }
  for (const item of pendingTransactions) {
    drawTransaction(item);
  }

  const bytes = await pdf.save();
  const buffer = Buffer.from(bytes);
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="report-movimenti.pdf"'
    }
  });
}
