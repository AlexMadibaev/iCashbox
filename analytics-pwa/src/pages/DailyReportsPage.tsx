import { DailyReportCard } from '../components/Lists';
import type { DailyReport } from '../types/report';

export function DailyReportsPage({ reports }: { reports: DailyReport[] }) {
  return (
    <div className="page">
      <div className="section-title">
        <h2>Дни месяца</h2>
        <span>{reports.length} отчётов</span>
      </div>
      <div className="daily-list">
        {reports.map((report) => <DailyReportCard key={report.report_id} report={report} />)}
      </div>
    </div>
  );
}
