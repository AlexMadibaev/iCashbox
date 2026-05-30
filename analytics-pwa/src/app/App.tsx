import { useEffect, useMemo, useState } from 'react';
import type { DailyReport } from '../types/report';
import { fetchMonthReports, cachedReports } from '../api/reportsApi';
import { fetchLiveSnapshot } from '../api/liveApi';
import { buildDashboardSummary, buildMonthlyAnalytics } from '../utils/calculations';
import { clearCache, lastSyncAt } from '../services/cacheService';
import { currentMonthKey, dayKey } from '../utils/date';
import { DashboardPage } from '../pages/DashboardPage';
import { DailyReportsPage } from '../pages/DailyReportsPage';
import { MonthlyAnalyticsPage } from '../pages/MonthlyAnalyticsPage';
import { SalesDynamicsPage } from '../pages/SalesDynamicsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LivePage } from '../pages/LivePage';
import { AuthGate } from '../components/AuthGate';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import type { LiveSnapshot } from '../types/live';

type MainTab = 'live' | 'dashboard' | 'reports' | 'settings';
type ReportView = 'days' | 'month' | 'dynamics' | 'products' | 'categories';

const mainTabs: Array<{ id: MainTab; label: string }> = [
  { id: 'live', label: 'Live' },
  { id: 'dashboard', label: 'Главная' },
  { id: 'reports', label: 'Отчёты' },
  { id: 'settings', label: 'Настройки' }
];

const reportViews: Array<{ id: ReportView; label: string }> = [
  { id: 'days', label: 'Дни' },
  { id: 'month', label: 'Месяц' },
  { id: 'dynamics', label: 'Графики' },
  { id: 'products', label: 'Товары' },
  { id: 'categories', label: 'Категории' }
];

function TabIcon({ id }: { id: MainTab }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 } as const;
  const paths: Record<MainTab, JSX.Element> = {
    live: (
      <>
        <path {...common} d="M6.3 18.7a8 8 0 0 1 0-13.4" />
        <path {...common} d="M17.7 5.3a8 8 0 0 1 0 13.4" />
        <circle {...common} cx="12" cy="12" r="3" />
      </>
    ),
    dashboard: (
      <>
        <path {...common} d="M4 10.5 12 4l8 6.5" />
        <path {...common} d="M6.5 10v9h11v-9" />
        <path {...common} d="M10 19v-5h4v5" />
      </>
    ),
    reports: (
      <>
        <rect {...common} height="15" rx="3" width="16" x="4" y="5" />
        <path {...common} d="M8 3v4M16 3v4M4 10h16" />
        <path {...common} d="M8 14h8M8 17h5" />
      </>
    ),
    settings: (
      <>
        <circle {...common} cx="12" cy="12" r="3" />
        <path {...common} d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.1L14.2 3h-4.4l-.4 2.8a7 7 0 0 0-2 1.1l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.1l.4 2.8h4.4l.4-2.8a7 7 0 0 0 2-1.1l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
      </>
    )
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {paths[id]}
    </svg>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('live');
  const [reportView, setReportView] = useState<ReportView>('days');
  const [month, setMonth] = useState(currentMonthKey());
  const [reports, setReports] = useState<DailyReport[]>(() => cachedReports());
  const [liveSnapshot, setLiveSnapshot] = useState<LiveSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncAt, setSyncAt] = useState(lastSyncAt());

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMonthReports(month);
      setReports(data);
      setSyncAt(lastSyncAt());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить отчёты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [month]);

  useEffect(() => {
    const loadLive = () => {
      fetchLiveSnapshot()
        .then(setLiveSnapshot)
        .catch(() => {});
    };
    loadLive();
    const timer = window.setInterval(loadLive, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const analytics = useMemo(() => buildMonthlyAnalytics(reports), [reports]);
  const dashboard = useMemo(() => buildDashboardSummary(reports, month, dayKey()), [month, reports]);

  const clearLocalCache = () => {
    clearCache();
    setReports([]);
    setSyncAt('');
  };

  const reportContent = () => {
    if (!reports.length) return <EmptyState text="Нет отчётов за выбранный месяц" />;
    switch (reportView) {
      case 'days':
        return <DailyReportsPage reports={reports} />;
      case 'month':
        return <MonthlyAnalyticsPage analytics={analytics} />;
      case 'dynamics':
        return <SalesDynamicsPage analytics={analytics} />;
      case 'products':
        return <ProductsPage analytics={analytics} />;
      case 'categories':
        return <CategoriesPage analytics={analytics} />;
      default:
        return null;
    }
  };

  const content = () => {
    if (loading && !reports.length) return <LoadingState />;
    if (error) return <ErrorState message={error} />;

    switch (activeTab) {
      case 'live':
        return <LivePage snapshot={liveSnapshot} />;
      case 'dashboard':
        return reports.length ? <DashboardPage summary={dashboard} /> : <EmptyState text="Нет отчётов за выбранный месяц" />;
      case 'reports':
        return (
          <div className="page">
            <section className="report-switch" aria-label="Разделы отчётов">
              {reportViews.map((view) => (
                <button
                  className={reportView === view.id ? 'active' : ''}
                  key={view.id}
                  type="button"
                  onClick={() => setReportView(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </section>
            {reportContent()}
          </div>
        );
      case 'settings':
        return (
          <SettingsPage
            lastSync={syncAt}
            month={month || currentMonthKey()}
            onClearCache={clearLocalCache}
            onMonthChange={setMonth}
            onRefresh={loadReports}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <main className="desktop-blocker">
        <section>
          <div className="desktop-mascot" aria-hidden="true">
            <svg viewBox="0 0 220 180">
              <circle className="signal signal-one" cx="110" cy="82" r="58" />
              <circle className="signal signal-two" cx="110" cy="82" r="76" />
              <rect className="phone-body" height="116" rx="22" width="72" x="74" y="34" />
              <rect className="phone-screen" height="86" rx="14" width="54" x="83" y="48" />
              <circle className="phone-home" cx="110" cy="141" r="4" />
              <circle className="face-eye" cx="101" cy="82" r="4" />
              <circle className="face-eye" cx="119" cy="82" r="4" />
              <path className="face-smile" d="M99 98c7 8 15 8 22 0" />
              <path className="arm arm-left" d="M76 103c-18 2-29 12-34 28" />
              <path className="arm arm-right" d="M144 103c18 2 29 12 34 28" />
              <path className="spark spark-one" d="M43 49l5 10 10 5-10 5-5 10-5-10-10-5 10-5 5-10Z" />
              <path className="spark spark-two" d="M174 31l4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" />
            </svg>
          </div>
          <span>iCashbox</span>
          <h1>Пока доступна только мобильная версия</h1>
          <p>Откройте этот адрес с телефона. Там интерфейс легче, быстрее и сделан специально под просмотр кассы на ходу.</p>
        </section>
      </main>
      <AuthGate>
        <main className="app-shell">
          <header className="app-header">
            <div>
              <span>iCashbox · {month}</span>
              <h1>Статистика кафе</h1>
            </div>
            <button onClick={loadReports}>{loading ? '...' : 'Обновить'}</button>
          </header>

          {content()}

          <nav className="bottom-tabs">
            {mainTabs.map((tab) => (
              <button className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}>
                <TabIcon id={tab.id} />
                <small>{tab.label}</small>
              </button>
            ))}
          </nav>
        </main>
      </AuthGate>
    </>
  );
}
