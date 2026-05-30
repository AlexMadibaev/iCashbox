import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SyncStatus } from '../components/States';
import { changeAnalyticsPassword, logoutAnalytics } from '../components/AuthGate';

type Props = {
  lastSync: string;
  month: string;
  onClearCache: () => void;
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
};

export function SettingsPage({ lastSync, month, onClearCache, onMonthChange, onRefresh }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const savePassword = async () => {
    try {
      await changeAnalyticsPassword(currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setPasswordMessage('Пароль обновлён');
    } catch (caught) {
      setPasswordMessage(caught instanceof Error ? caught.message : 'Не удалось обновить пароль');
    }
  };

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
        <button
          className="ghost-button"
          onClick={() => {
            logoutAnalytics();
            window.location.reload();
          }}
        >
          Выйти
        </button>
      </section>
      <section className="panel settings-list">
        <div className="section-title">
          <h2>Пароль</h2>
          <span>доступ к статистике</span>
        </div>
        <label>
          <span>Старый пароль</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setPasswordMessage('');
            }}
          />
        </label>
        <label>
          <span>Новый пароль</span>
          <input
            type="password"
            value={nextPassword}
            onChange={(event) => {
              setNextPassword(event.target.value);
              setPasswordMessage('');
            }}
          />
        </label>
        {passwordMessage && <p className="settings-message">{passwordMessage}</p>}
        <button onClick={savePassword}>Сохранить пароль</button>
      </section>
      <SyncStatus lastSync={lastSync} />
    </div>
  );
}
