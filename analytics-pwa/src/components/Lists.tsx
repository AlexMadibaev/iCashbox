import type { DailyReport, ReportCategory, ReportItem } from '../types/report';
import { humanDate } from '../utils/date';
import { formatMoney } from '../utils/money';

export function TopProductsList({ items }: { items: ReportItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.total));

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Топ товаров</h2>
        <span>{items.length} позиций</span>
      </div>
      <div className="rank-list">
        {items.slice(0, 10).map((item, index) => (
          <article key={item.id || item.name}>
            <b>{index + 1}</b>
            <div>
              <strong>{item.name}</strong>
              <span>{item.category} · {item.quantity} шт</span>
              <i style={{ width: `${Math.max(6, (item.total / max) * 100)}%` }} />
            </div>
            <em>{formatMoney(item.total)}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CategoryList({ categories }: { categories: ReportCategory[] }) {
  const total = categories.reduce((sum, category) => sum + category.total, 0) || 1;

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Категории</h2>
        <span>{categories.length} групп</span>
      </div>
      <div className="category-list">
        {categories.map((category) => (
          <article key={category.name}>
            <div><strong>{category.name}</strong><span>{category.quantity} продаж</span></div>
            <b>{((category.total / total) * 100).toFixed(0)}%</b>
            <em>{formatMoney(category.total)}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DailyReportCard({ report, onOpen }: { report: DailyReport; onOpen?: (report: DailyReport) => void }) {
  return (
    <button className="daily-card" onClick={() => onOpen?.(report)} type="button">
      <div>
        <strong>{humanDate(report.date)}</strong>
        <span>{report.totals.checks_count} чеков · {report.status}</span>
      </div>
      <div>
        <b>{formatMoney(report.totals.net_sales)}</b>
        <span>средний {formatMoney(report.totals.average_check)}</span>
      </div>
    </button>
  );
}
