import type { DashboardSummary } from '../types/analytics';
import { StatCard } from '../components/StatCard';
import { SalesLineChart, PaymentPieChart } from '../components/Charts';
import { TopProductsList } from '../components/Lists';
import { PageHeader } from '../components/PageHeader';
import { formatMoney } from '../utils/money';
import { humanDate } from '../utils/date';

export function DashboardPage({ summary }: { summary: DashboardSummary }) {
  const today = summary.today;

  return (
    <div className="page">
      <PageHeader
        kicker="Обзор"
        title="Главные показатели"
        subtitle="День, месяц, динамика и самые сильные позиции."
      />
      <section className="hero-panel">
        <span>{today ? humanDate(today.date) : 'Сегодня'}</span>
        <h1>{formatMoney(today?.totals.net_sales || 0)}</h1>
        <p>{summary.topProductToday ? `Топ дня: ${summary.topProductToday.name}` : 'Нет отчёта за день'}</p>
      </section>
      <div className="stat-grid">
        <StatCard accent="green" label="Месяц" value={formatMoney(summary.month.netSales)} trend={summary.monthTrend} />
        <StatCard accent="blue" label="Чеки" value={String(today?.totals.checks_count || 0)} helper="сегодня" />
        <StatCard accent="amber" label="Средний чек" value={formatMoney(today?.totals.average_check || 0)} trend={summary.todayTrend} />
        <StatCard
          accent="rose"
          label="Лучший день"
          value={summary.month.bestDay ? humanDate(summary.month.bestDay.date) : '-'}
          helper={formatMoney(summary.month.bestDay?.totals.net_sales || 0)}
        />
      </div>
      <SalesLineChart points={summary.month.dailySales.map((day) => ({ label: day.date, value: day.net_sales }))} />
      <PaymentPieChart payments={summary.month.payments} />
      <TopProductsList items={summary.month.topProducts.slice(0, 5)} />
    </div>
  );
}
