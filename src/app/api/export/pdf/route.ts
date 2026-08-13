import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCompany, getTransactions } from "@/lib/queries";
import { buildSummary, parseDateRange } from "@/lib/reporting";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const search = request.nextUrl.searchParams;
  const dateRange = parseDateRange(search.get("from") ?? undefined, search.get("to") ?? undefined);
  const [company, transactions] = await Promise.all([
    getCompany(user.companyId),
    getTransactions(user.companyId, dateRange)
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

  drawLine(company.name, { bold: true, size: 18 });
  drawLine(`Report movimenti dal ${formatDate(dateRange.from)} al ${formatDate(dateRange.to)}`);
  drawLine(`Entrate: ${formatCurrency(summary.incomeBaseCents, company.baseCurrency)}`, { color: [0.08, 0.5, 0.24] });
  drawLine(`Uscite: ${formatCurrency(summary.expenseBaseCents, company.baseCurrency)}`, { color: [0.8, 0.15, 0.15] });
  drawLine(`Saldo: ${formatCurrency(summary.balanceBaseCents, company.baseCurrency)}`, { bold: true });

  y -= 12;
  drawLine("Ultimi movimenti inclusi:", { bold: true });

  for (const item of transactions.slice(0, 20)) {
    drawLine(
      `${formatDate(item.transactionDate)} · ${item.type} · ${item.category.name} · ${formatCurrency(item.amountCents, item.currencyCode)}${
        item.currencyCode !== company.baseCurrency ? ` · base ${formatCurrency(item.amountBaseCents, company.baseCurrency)}` : ""
      }`
    );
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
