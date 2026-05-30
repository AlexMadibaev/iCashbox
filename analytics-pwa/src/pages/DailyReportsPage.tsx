import { useMemo, useState } from 'react';
import { DailyReportCard } from '../components/Lists';
import { PageHeader } from '../components/PageHeader';
import type { DailyReport } from '../types/report';
import { humanDate } from '../utils/date';
import { formatMoney } from '../utils/money';

export function DailyReportsPage({ reports }: { reports: DailyReport[] }) {
  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.date.localeCompare(a.date)),
    [reports]
  );
  const [selectedReportId, setSelectedReportId] = useState(sortedReports[0]?.report_id || '');
  const selectedReport = sortedReports.find((report) => report.report_id === selectedReportId) || sortedReports[0];

  return (
    <div className="page">
      <PageHeader
        kicker="Дни"
        title="Отчёты по дням"
        subtitle="Нажмите на день, чтобы посмотреть оплаты, товары и категории."
      />
      <div className="section-title">
        <h2>Дни месяца</h2>
        <span>{reports.length} отчётов</span>
      </div>
      {selectedReport && <DailyReportDetail report={selectedReport} />}
      <div className="daily-list day-list">
        {sortedReports.map((report) => (
          <DailyReportCard
            key={report.report_id}
            report={report}
            onOpen={(openedReport) => setSelectedReportId(openedReport.report_id)}
          />
        ))}
      </div>
    </div>
  );
}

function DailyReportDetail({ report }: { report: DailyReport }) {
  const payments = Object.entries(
    report.totals.payments || {
      Cash: report.totals.cash,
      Card: report.totals.card,
      Online: report.totals.online
    }
  );
  const topItems = [...report.items].sort((a, b) => b.total - a.total);
  const categories = [...report.categories].sort((a, b) => b.total - a.total);

  return (
    <section className="panel daily-detail">
      <div className="section-title">
        <h2>{humanDate(report.date)}</h2>
        <span>{report.status}</span>
      </div>

      <div className="detail-grid">
        <div><span>Чистая выручка</span><strong>{formatMoney(report.totals.net_sales)}</strong></div>
        <div><span>Выручка всего</span><strong>{formatMoney(report.totals.gross_sales)}</strong></div>
        <div><span>Чеков</span><strong>{report.totals.checks_count}</strong></div>
        <div><span>Средний чек</span><strong>{formatMoney(report.totals.average_check)}</strong></div>
        <div><span>Скидки</span><strong>{formatMoney(report.totals.discounts)}</strong></div>
        <div><span>Возвраты</span><strong>{formatMoney(report.totals.refunds)}</strong></div>
      </div>

      <div className="detail-meta">
        <span>Смена: {report.shift_id || report.report_id}</span>
        <span>Кассир: {report.cashier_name || 'не указан'}</span>
        <span>Открытие: {formatTime(report.shift_opened_at)}</span>
        <span>Закрытие: {formatTime(report.shift_closed_at)}</span>
      </div>

      <DetailList
        title="Оплаты"
        rows={payments.map(([name, total]) => ({
          key: name,
          title: name,
          subtitle: 'за день',
          value: formatMoney(Number(total || 0))
        }))}
      />

      <DetailList
        title="Товары"
        rows={topItems.map((item) => ({
          key: item.id || item.name,
          title: item.name,
          subtitle: `${item.category} · ${item.quantity} шт · ${formatMoney(item.unit_price)}`,
          value: formatMoney(item.total)
        }))}
      />

      <DetailList
        title="Категории"
        rows={categories.map((category) => ({
          key: category.name,
          title: category.name,
          subtitle: `${category.quantity} продаж`,
          value: formatMoney(category.total)
        }))}
      />
    </section>
  );
}

function DetailList({
  rows,
  title
}: {
  rows: Array<{ key: string; title: string; subtitle: string; value: string }>;
  title: string;
}) {
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      <div className="detail-list">
        {rows.map((row) => (
          <article key={row.key}>
            <div>
              <strong>{row.title}</strong>
              <span>{row.subtitle}</span>
            </div>
            <em>{row.value}</em>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
