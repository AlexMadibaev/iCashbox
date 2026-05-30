import type { DashboardSummary, MonthlyAnalytics, Trend } from '../types/analytics';
import type { DailyReport, ReportCategory, ReportItem } from '../types/report';
import { dayKey, previousMonthKey } from './date';

function sum(values: number[]) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export function trend(current: number, previous: number): Trend {
  const value = current - previous;
  return {
    value,
    percent: previous > 0 ? (value / previous) * 100 : current > 0 ? null : 0,
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  };
}

export function aggregateProducts(reports: DailyReport[]): ReportItem[] {
  const map = new Map<string, ReportItem>();
  reports.flatMap((report) => report.items || []).forEach((item) => {
    const key = item.id || item.name;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item });
      return;
    }
    existing.quantity += item.quantity;
    existing.total += item.total;
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function aggregateCategories(reports: DailyReport[]): ReportCategory[] {
  const map = new Map<string, ReportCategory>();
  reports.flatMap((report) => report.categories || []).forEach((category) => {
    const existing = map.get(category.name);
    if (!existing) {
      map.set(category.name, { ...category });
      return;
    }
    existing.quantity += category.quantity;
    existing.total += category.total;
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function aggregatePayments(reports: DailyReport[]) {
  const payments: Record<string, number> = {};
  reports.forEach((report) => {
    const fallback = {
      Наличные: report.totals.cash,
      Карта: report.totals.card,
      Онлайн: report.totals.online
    };
    Object.entries(report.totals.payments || fallback).forEach(([method, value]) => {
      payments[method] = (payments[method] || 0) + Number(value || 0);
    });
  });
  return payments;
}

export function buildMonthlyAnalytics(reports: DailyReport[]): MonthlyAnalytics {
  const closedReports = [...reports].filter((report) => report.status === 'closed' || report.status === 'pending').sort((a, b) => a.date.localeCompare(b.date));
  const netSales = sum(closedReports.map((report) => report.totals.net_sales));
  const checksCount = sum(closedReports.map((report) => report.totals.checks_count));
  return {
    reports: closedReports,
    grossSales: sum(closedReports.map((report) => report.totals.gross_sales)),
    netSales,
    checksCount,
    averageCheck: checksCount > 0 ? netSales / checksCount : 0,
    refunds: sum(closedReports.map((report) => report.totals.refunds)),
    discounts: sum(closedReports.map((report) => report.totals.discounts)),
    bestDay: closedReports.reduce<DailyReport | null>((best, report) => (!best || report.totals.gross_sales > best.totals.gross_sales ? report : best), null),
    worstDay: closedReports.reduce<DailyReport | null>((worst, report) => (!worst || report.totals.gross_sales < worst.totals.gross_sales ? report : worst), null),
    topProducts: aggregateProducts(closedReports),
    categories: aggregateCategories(closedReports),
    payments: aggregatePayments(closedReports),
    dailySales: closedReports.map((report) => ({
      date: report.date,
      gross_sales: report.totals.gross_sales,
      net_sales: report.totals.net_sales,
      average_check: report.totals.average_check
    }))
  };
}

export function buildDashboardSummary(allReports: DailyReport[], selectedMonth: string, today = dayKey()): DashboardSummary {
  const monthReports = allReports.filter((report) => report.date.startsWith(selectedMonth));
  const previousReports = allReports.filter((report) => report.date.startsWith(previousMonthKey(selectedMonth)));
  const todayReport = allReports.find((report) => report.date === today) || monthReports.at(-1) || null;
  const yesterdayReport = todayReport
    ? monthReports[monthReports.findIndex((report) => report.date === todayReport.date) - 1]
    : null;
  const month = buildMonthlyAnalytics(monthReports);
  const previousMonth = buildMonthlyAnalytics(previousReports);
  return {
    today: todayReport,
    month,
    todayTrend: trend(todayReport?.totals.net_sales || 0, yesterdayReport?.totals.net_sales || 0),
    monthTrend: trend(month.netSales, previousMonth.netSales),
    topProductToday: todayReport ? aggregateProducts([todayReport])[0] || null : null
  };
}
