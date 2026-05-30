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
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import type { LiveSnapshot } from '../types/live';

type Tab = 'live' | 'dashboard' | 'days' | 'month' | 'dynamics' | 'products' | 'categories' | 'settings';

const tabs: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'live', icon: '●', label: 'Live' },
  { id: 'dashboard', icon: '⌂', label: 'Главная' },
  { id: 'days', icon: '◷', label: 'Дни' },
  { id: 'month', icon: 'Σ', label: 'Месяц' },
  { id: 'dynamics', icon: '↗', label: 'Графики' },
  { id: 'products', icon: '▣', label: 'Товары' },
  { id: 'categories', icon: '◫', label: 'Категории' },
  { id: 'settings', icon: '⚙', label: 'Настройки' }
];

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
            <span aria-hidden="true">{tab.icon}</span>
            <small>{tab.label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
