import type { MonthlyAnalytics } from '../types/analytics';
import { StatCard } from '../components/StatCard';
import { formatMoney } from '../utils/money';
import { humanDate } from '../utils/date';

export function MonthlyAnalyticsPage({ analytics }: { analytics: MonthlyAnalytics }) {
  return (
    <div className="page">
      <div className="stat-grid">
        <StatCard label="Общая выручка" value={formatMoney(analytics.grossSales)} />
        <StatCard label="Чистая выручка" value={formatMoney(analytics.netSales)} />
        <StatCard label="Чеки" value={String(analytics.checksCount)} />
        <StatCard label="Средний чек" value={formatMoney(analytics.averageCheck)} />
        <StatCard label="Возвраты" value={formatMoney(analytics.refunds)} />
        <StatCard label="Скидки" value={formatMoney(analytics.discounts)} />
      </div>
      <section className="panel">
        <div className="split-row"><span>Лучший день</span><strong>{analytics.bestDay ? `${humanDate(analytics.bestDay.date)} · ${formatMoney(analytics.bestDay.totals.net_sales)}` : '-'}</strong></div>
        <div className="split-row"><span>Слабый день</span><strong>{analytics.worstDay ? `${humanDate(analytics.worstDay.date)} · ${formatMoney(analytics.worstDay.totals.net_sales)}` : '-'}</strong></div>
      </section>
    </div>
  );
}
