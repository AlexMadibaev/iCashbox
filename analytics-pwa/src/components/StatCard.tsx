import type { Trend } from '../types/analytics';

type Props = {
  accent?: 'green' | 'blue' | 'amber' | 'rose';
  label: string;
  value: string;
  helper?: string;
  trend?: Trend;
};

export function StatCard({ accent = 'green', helper, label, trend, value }: Props) {
  const trendText = trend
    ? trend.percent == null
      ? `${trend.value > 0 ? '+' : ''}${trend.value.toFixed(0)}`
      : `${trend.percent > 0 ? '+' : ''}${trend.percent.toFixed(1)}%`
    : '';

  return (
    <article className={`stat-card accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {(helper || trendText) && (
        <small className={trend ? `trend ${trend.direction}` : ''}>{trendText || helper}</small>
      )}
    </article>
  );
}
