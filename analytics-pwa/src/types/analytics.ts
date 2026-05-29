import type { DailyReport, ReportCategory, ReportItem } from './report';

export type Trend = {
  value: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export type MonthlyAnalytics = {
  reports: DailyReport[];
  grossSales: number;
  netSales: number;
  checksCount: number;
  averageCheck: number;
  refunds: number;
  discounts: number;
  bestDay: DailyReport | null;
  worstDay: DailyReport | null;
  topProducts: ReportItem[];
  categories: ReportCategory[];
  payments: Record<string, number>;
  dailySales: Array<{ date: string; gross_sales: number; net_sales: number; average_check: number }>;
};

export type DashboardSummary = {
  today: DailyReport | null;
  month: MonthlyAnalytics;
  todayTrend: Trend;
  monthTrend: Trend;
  topProductToday: ReportItem | null;
};
