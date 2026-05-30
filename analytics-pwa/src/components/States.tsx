export function LoadingState() {
  return <div className="state">Загружаем аналитику...</div>;
}

export function EmptyState({ text = 'Данных пока нет' }: { text?: string }) {
  return <div className="state">{text}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="state error">{message}</div>;
}

export function SyncStatus({ lastSync }: { lastSync: string }) {
  return (
    <div className="sync-status">
      <span>GitHub/API</span>
      <strong>{lastSync ? `Синхронизировано ${new Date(lastSync).toLocaleString('ru-RU')}` : 'Данных ещё нет'}</strong>
    </div>
  );
}
