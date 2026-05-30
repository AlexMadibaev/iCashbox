import { PageHeader } from '../components/PageHeader';
import { SyncStatus } from '../components/States';

type Props = {
  lastSync: string;
  month: string;
  onClearCache: () => void;
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
};

export function SettingsPage({ lastSync, month, onClearCache, onMonthChange, onRefresh }: Props) {
  return (
    <div className="page">
      <PageHeader
        kicker="Настройки"
        title="Данные и синхронизация"
        subtitle="Выберите месяц, обновите отчёты или очистите локальный кэш телефона."
      />
      <section className="panel settings-list">
        <label>
          <span>Месяц отчёта</span>
          <input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
        </label>
        <div className="settings-actions">
          <button onClick={onRefresh}>Обновить данные</button>
          <button className="ghost-button" onClick={onClearCache}>Очистить кэш</button>
        </div>
      </section>
      <SyncStatus lastSync={lastSync} />
    </div>
  );
}
