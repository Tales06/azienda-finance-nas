import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getCompany, getTransactions } from "@/lib/queries";
import { parseDateRange } from "@/lib/reporting";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const search = request.nextUrl.searchParams;
  const dateRange = parseDateRange(search.get("from") ?? undefined, search.get("to") ?? undefined);
  const type = search.get("type") ?? undefined;
  const categoryId = search.get("categoryId") ?? undefined;
  const currencyCode = search.get("currencyCode") ?? undefined;
  const [company, transactions] = await Promise.all([
    getCompany(user.companyId),
    getTransactions(user.companyId, {
      ...dateRange,
      type,
      categoryId,
      currencyCode
    })
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Movimenti");

  sheet.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "Categoria", key: "category", width: 20 },
    { header: "Descrizione", key: "description", width: 28 },
    { header: "Valuta", key: "currency", width: 10 },
    { header: "Importo", key: "amount", width: 16 },
    { header: `Importo ${company.baseCurrency}`, key: "baseAmount", width: 18 },
    { header: "Metodo", key: "paymentMethod", width: 18 },
    { header: "Riferimento", key: "reference", width: 18 },
    { header: "Operatore", key: "createdBy", width: 20 }
  ];

  for (const item of transactions) {
    sheet.addRow({
      date: formatDate(item.transactionDate),
      type: item.type,
      category: item.category.name,
      description: item.description ?? "",
      currency: item.currencyCode,
      amount: item.amountCents / 100,
      baseAmount: item.amountBaseCents / 100,
      paymentMethod: item.paymentMethod ?? "",
      reference: item.reference ?? "",
      createdBy: item.createdBy.displayName
    });
  }

  sheet.getRow(1).font = { bold: true };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell("amount").numFmt = '#,##0.00';
      row.getCell("baseAmount").numFmt = '#,##0.00';
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="movimenti.xlsx"'
    }
  });
}
