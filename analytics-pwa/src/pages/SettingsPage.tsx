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
      <section className="panel settings-list">
        <label>
          <span>Месяц</span>
          <input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
        </label>
        <button onClick={onRefresh}>Обновить данные</button>
        <button onClick={onClearCache}>Очистить кэш</button>
      </section>
      <SyncStatus lastSync={lastSync} />
    </div>
  );
}
