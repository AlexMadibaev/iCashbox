import { useState } from 'react';

const sessionKey = 'icashbox.analytics.auth';
const customHashKey = 'icashbox.analytics.passwordHash';
const defaultPasswordHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function expectedHash() {
  return localStorage.getItem(customHashKey) || import.meta.env.VITE_ANALYTICS_PASSWORD_HASH || defaultPasswordHash;
}

export function isAuthenticated() {
  return localStorage.getItem(sessionKey) === expectedHash();
}

export async function changeAnalyticsPassword(currentPassword: string, nextPassword: string) {
  const currentHash = await sha256(currentPassword);
  if (currentHash !== expectedHash()) throw new Error('Старый пароль неверный');
  if (nextPassword.trim().length < 4) throw new Error('Новый пароль минимум 4 символа');
  const nextHash = await sha256(nextPassword);
  localStorage.setItem(customHashKey, nextHash);
  localStorage.setItem(sessionKey, nextHash);
}

export function logoutAnalytics() {
  localStorage.removeItem(sessionKey);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(isAuthenticated);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const hash = await sha256(password);
    if (hash !== expectedHash()) {
      setError('Неверный пароль');
      setPassword('');
      return;
    }
    localStorage.setItem(sessionKey, hash);
    setAllowed(true);
  };

  if (allowed) return <>{children}</>;

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <span>iCashbox</span>
        <h1>Статистика кафе</h1>
        <label>
          Пароль
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
          />
        </label>
        {error && <p>{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </main>
  );
}
