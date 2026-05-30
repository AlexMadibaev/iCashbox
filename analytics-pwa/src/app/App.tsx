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

type Tab = 'live' | 'dashboard' | 'days' | 'month' | 'dynamics' | 'products' | 'categories' | 'settings';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'live', label: 'Live' },
  { id: 'dashboard', label: 'Главная' },
  { id: 'days', label: 'Дни' },
  { id: 'month', label: 'Месяц' },
  { id: 'dynamics', label: 'Графики' },
  { id: 'products', label: 'Товары' },
  { id: 'categories', label: 'Категории' },
  { id: 'settings', label: 'Настройки' }
];

function TabIcon({ id }: { id: Tab }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 } as const;
  const paths: Record<Tab, JSX.Element> = {
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
    days: (
      <>
        <rect {...common} height="15" rx="3" width="16" x="4" y="5" />
        <path {...common} d="M8 3v4M16 3v4M4 10h16" />
        <path {...common} d="M8 14h.01M12 14h.01M16 14h.01" />
      </>
    ),
    month: (
      <>
        <path {...common} d="M5 19V5" />
        <path {...common} d="M5 19h14" />
        <rect {...common} height="5" rx="1" width="3" x="8" y="12" />
        <rect {...common} height="9" rx="1" width="3" x="13" y="8" />
      </>
    ),
    dynamics: (
      <>
        <path {...common} d="M4 18 9 12l4 3 7-9" />
        <path {...common} d="M15 6h5v5" />
      </>
    ),
    products: (
      <>
        <path {...common} d="M12 3 4.5 7 12 11l7.5-4L12 3Z" />
        <path {...common} d="M4.5 7v9L12 21l7.5-5V7" />
        <path {...common} d="M12 11v10" />
      </>
    ),
    categories: (
      <>
        <rect {...common} height="6" rx="2" width="6" x="4" y="4" />
        <rect {...common} height="6" rx="2" width="6" x="14" y="4" />
        <rect {...common} height="6" rx="2" width="6" x="4" y="14" />
        <rect {...common} height="6" rx="2" width="6" x="14" y="14" />
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
  const [activeTab, setActiveTab] = useState<Tab>('live');
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

  const content = () => {
    if (loading && !reports.length) return <LoadingState />;
    if (error) return <ErrorState message={error} />;
    if (!reports.length && activeTab !== 'settings' && activeTab !== 'live') {
      return <EmptyState text="Нет отчётов за выбранный месяц" />;
    }

    switch (activeTab) {
      case 'live':
        return <LivePage snapshot={liveSnapshot} />;
      case 'dashboard':
        return <DashboardPage summary={dashboard} />;
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
          {tabs.map((tab) => (
            <button className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}>
              <TabIcon id={tab.id} />
              <small>{tab.label}</small>
            </button>
          ))}
        </nav>
      </main>
    </AuthGate>
  );
}
