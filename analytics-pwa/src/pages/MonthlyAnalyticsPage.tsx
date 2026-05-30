import type { MonthlyAnalytics } from '../types/analytics';
import { StatCard } from '../components/StatCard';
import { PageHeader } from '../components/PageHeader';
import { formatMoney } from '../utils/money';
import { humanDate } from '../utils/date';

export function MonthlyAnalyticsPage({ analytics }: { analytics: MonthlyAnalytics }) {
  return (
    <div className="page">
      <PageHeader
        kicker="Месяц"
        title="Итоги периода"
        subtitle="Выручка, чеки, скидки, возвраты и сильные дни."
      />
      <div className="stat-grid">
        <StatCard accent="green" label="Общая выручка" value={formatMoney(analytics.grossSales)} />
        <StatCard accent="blue" label="Чистая выручка" value={formatMoney(analytics.netSales)} />
        <StatCard accent="amber" label="Чеки" value={String(analytics.checksCount)} />
        <StatCard accent="rose" label="Средний чек" value={formatMoney(analytics.averageCheck)} />
        <StatCard label="Возвраты" value={formatMoney(analytics.refunds)} />
        <StatCard label="Скидки" value={formatMoney(analytics.discounts)} />
      </div>
      <section className="panel insight-panel">
        <div className="split-row">
          <span>Лучший день</span>
          <strong>{analytics.bestDay ? `${humanDate(analytics.bestDay.date)} · ${formatMoney(analytics.bestDay.totals.net_sales)}` : '-'}</strong>
        </div>
        <div className="split-row">
          <span>Слабый день</span>
          <strong>{analytics.worstDay ? `${humanDate(analytics.worstDay.date)} · ${formatMoney(analytics.worstDay.totals.net_sales)}` : '-'}</strong>
        </div>
      </section>
    </div>
  );
}
