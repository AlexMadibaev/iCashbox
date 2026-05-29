import type { DailyReport } from '../src/types/report';

const token = process.env.GITHUB_TOKEN || '';
const owner = process.env.GITHUB_OWNER || '';
const repo = process.env.GITHUB_REPO || '';
const branch = process.env.GITHUB_BRANCH || 'main';
const basePath = process.env.REPORTS_BASE_PATH || 'reports';

function assertConfig() {
  if (!token || !owner || !repo) {
    throw new Error('GitHub storage is not configured');
  }
}

function reportPath(report: DailyReport) {
  const [year, month] = report.date.split('-');
  const suffix = report.report_id ? `-${report.report_id.replace(/[^a-z0-9-]+/gi, '-')}` : '';
  return `${basePath}/${year}/${month}/${report.date}${suffix}.json`;
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

export async function saveReportToGithub(report: DailyReport) {
  const path = reportPath(report);
  const current = await githubRequest(`${path}?ref=${branch}`);
  const content = JSON.stringify(report, null, 2);
  const payload: Record<string, unknown> = {
    branch,
    content: encodeBase64(content),
    message: `Save cashbox report ${report.date}`
  };
  if (current?.sha) payload.sha = current.sha;
  await githubRequest(path, {
    body: JSON.stringify(payload),
    method: 'PUT'
  });
  return { path, updated: Boolean(current?.sha) };
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

export async function readReportFromGithub(path: string): Promise<DailyReport | null> {
  const file = await githubRequest(`${path}?ref=${branch}`);
  if (!file?.content) return null;
  return JSON.parse(decodeBase64(file.content));
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
