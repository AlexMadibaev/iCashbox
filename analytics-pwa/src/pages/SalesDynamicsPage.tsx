import type { MonthlyAnalytics } from '../types/analytics';
import { BarChart, PaymentPieChart, SalesLineChart } from '../components/Charts';
import { PageHeader } from '../components/PageHeader';

export function SalesDynamicsPage({ analytics }: { analytics: MonthlyAnalytics }) {
  return (
    <div className="page">
      <PageHeader
        kicker="Динамика"
        title="Графики продаж"
        subtitle="Выручка по дням, категории, оплаты и средний чек."
      />
      <SalesLineChart points={analytics.dailySales.map((day) => ({ label: day.date, value: day.net_sales }))} />
      <BarChart title="Категории" points={analytics.categories.map((category) => ({ label: category.name, value: category.total }))} />
      <PaymentPieChart payments={analytics.payments} />
      <BarChart title="Средний чек" points={analytics.dailySales.map((day) => ({ label: day.date.slice(8), value: day.average_check }))} />
      <BarChart title="Топ-10 товаров" points={analytics.topProducts.slice(0, 10).map((item) => ({ label: item.name, value: item.total }))} />
    </div>
  );
}
