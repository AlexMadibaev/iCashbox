declare const Buffer: any;

type DailyReport = any;
type ReportCategory = any;
type ReportItem = any;

const token = process.env.GITHUB_TOKEN || '';
const owner = process.env.GITHUB_OWNER || '';
const repo = process.env.GITHUB_REPO || '';
const branch = process.env.GITHUB_BRANCH || 'main';
const basePath = process.env.REPORTS_BASE_PATH || 'reports';

export function sendJson(response: any, data: unknown, status = 200) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-live-token');
  response.end(JSON.stringify(data));
}

export function handleOptions(request: any, response: any) {
  if (request.method !== 'OPTIONS') return false;
  sendJson(response, {});
  return true;
}

export function queryValue(request: any, key: string) {
  const fromQuery = request.query?.[key];
  if (Array.isArray(fromQuery)) return fromQuery[0] || '';
  if (fromQuery) return String(fromQuery);
  const host = request.headers?.host || 'localhost';
  const url = new URL(request.url || '/', `https://${host}`);
  return url.searchParams.get(key) || '';
}

export function requestBody(request: any) {
  if (!request.body) return {};
  if (typeof request.body === 'string') return JSON.parse(request.body);
  return request.body;
}

function assertConfig() {
  if (!token || !owner || !repo) throw new Error('GitHub storage is not configured');
}

async function githubRequest(path: string, init: RequestInit = {}) {
  assertConfig();
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {})
    }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response.json();
}

function encodeBase64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeBase64(value: string) {
  return Buffer.from(value.replace(/\s/g, ''), 'base64').toString('utf8');
}

function reportPath(report: DailyReport) {
  const [year, month] = report.date.split('-');
  const suffix = report.report_id ? `-${report.report_id.replace(/[^a-z0-9-]+/gi, '-')}` : '';
  return `${basePath}/${year}/${month}/${report.date}${suffix}.json`;
}

export async function writeJsonToGithub(path: string, data: unknown, message = `Update ${path}`) {
  const current = await githubRequest(`${path}?ref=${branch}`);
  const payload: Record<string, unknown> = {
    branch,
    content: encodeBase64(JSON.stringify(data, null, 2)),
    message
  };
  if (current?.sha) payload.sha = current.sha;
  await githubRequest(path, {
    body: JSON.stringify(payload),
    method: 'PUT'
  });
  return { path, updated: Boolean(current?.sha) };
}

export async function readJsonFromGithub<T>(path: string): Promise<T | null> {
  const file = await githubRequest(`${path}?ref=${branch}`);
  if (!file?.content) return null;
  return JSON.parse(decodeBase64(file.content)) as T;
}

export async function saveReportToGithub(report: DailyReport) {
  return writeJsonToGithub(reportPath(report), report, `Save cashbox report ${report.date}`);
}

async function readReportFromGithub(path: string): Promise<DailyReport | null> {
  return readJsonFromGithub<DailyReport>(path);
}

export async function readMonthFromGithub(year: string, month: string): Promise<DailyReport[]> {
  const dir = `${basePath}/${year}/${month}`;
  const files = await githubRequest(`${dir}?ref=${branch}`);
  if (!Array.isArray(files)) return [];
  const reports = await Promise.all(
    files
      .filter((file) => file.name?.endsWith('.json'))
      .map((file) => readReportFromGithub(file.path))
  );
  return reports.filter(Boolean) as DailyReport[];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export function trend(current: number, previous: number) {
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

function aggregateCategories(reports: DailyReport[]): ReportCategory[] {
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

function aggregatePayments(reports: DailyReport[]) {
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

export function buildMonthlyAnalytics(reports: DailyReport[]) {
  const closedReports = [...reports]
    .filter((report) => report.status === 'closed' || report.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date));
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
    bestDay: closedReports.reduce<DailyReport | null>(
      (best, report) => (!best || report.totals.gross_sales > best.totals.gross_sales ? report : best),
      null
    ),
    worstDay: closedReports.reduce<DailyReport | null>(
      (worst, report) => (!worst || report.totals.gross_sales < worst.totals.gross_sales ? report : worst),
      null
    ),
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
