"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type CategoryDatum = {
  name: string;
  value: number;
  color: string;
};

type MonthlyDatum = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

type DashboardChartsProps = {
  monthlySeries: MonthlyDatum[];
  expensesByCategory: CategoryDatum[];
  incomesByCategory: CategoryDatum[];
  baseCurrency: string;
};

export function DashboardCharts({
  monthlySeries,
  expensesByCategory,
  incomesByCategory,
  baseCurrency
}: DashboardChartsProps) {
  const moneyFormatter = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: baseCurrency,
    maximumFractionDigits: 0
  });

  return (
    <div className="grid two-columns charts-grid">
      <section className="card chart-card">
        <div className="section-heading">
          <div>
            <h3>Andamento mensile</h3>
            <p>Entrate, uscite e saldo nella valuta base.</p>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => moneyFormatter.format(Number(value))} />
              <Tooltip formatter={(value) => moneyFormatter.format(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="income" name="Entrate" stroke="#16a34a" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" name="Uscite" stroke="#dc2626" strokeWidth={2} />
              <Line type="monotone" dataKey="balance" name="Saldo" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card chart-card">
        <div className="section-heading">
          <div>
            <h3>Uscite per categoria</h3>
            <p>Distribuzione totale delle uscite filtrate.</p>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius={72} outerRadius={110} paddingAngle={3}>
                {expensesByCategory.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => moneyFormatter.format(Number(value) / 100)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card chart-card full-width">
        <div className="section-heading">
          <div>
            <h3>Entrate per categoria</h3>
            <p>Classifica delle fonti di incasso.</p>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={incomesByCategory.map((entry) => ({ ...entry, value: entry.value / 100 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => moneyFormatter.format(Number(value))} />
              <Tooltip formatter={(value) => moneyFormatter.format(Number(value))} />
              <Bar dataKey="value" name="Entrate">
                {incomesByCategory.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
