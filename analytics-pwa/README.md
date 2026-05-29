# iCashbox Analytics PWA

Мобильная PWA-панель аналитики кассы кафе.

## Что уже есть в MVP

- mock-отчёты за месяц;
- dashboard для телефона;
- ежедневные отчёты;
- месячная аналитика;
- графики выручки, категорий, способов оплаты и среднего чека;
- топ товаров;
- категории;
- PWA manifest и service worker;
- API handlers для Vercel/совместимого serverless;
- GitHub storage service, изолированный от бизнес-логики.

## Запуск локально

```bash
npm install
npm run dev
```

По умолчанию фронт работает в mock-режиме: `VITE_USE_MOCK=true`.

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```txt
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
REPORTS_BASE_PATH=reports
LIVE_SNAPSHOT_PATH=live/latest.json
LIVE_PUSH_TOKEN=
VITE_USE_MOCK=false
```

GitHub Token должен храниться только на backend/serverless стороне.

## API

- `POST /api/reports/create`
- `GET /api/reports/day?date=2026-05-29`
- `GET /api/reports/month?year=2026&month=05`
- `GET /api/analytics/month?year=2026&month=05`
- `GET /api/analytics/compare?from=2026-05-01&to=2026-05-29`
- `GET /api/products/top?year=2026&month=05`
- `POST /api/live/update`
- `GET /api/live/latest`

## Следующий шаг

Подключить текущую кассу: при закрытии смены формировать `DailyReport` и отправлять его в `POST /api/reports/create`.
Для live-доступа через интернет касса отправляет текущий снимок в `POST /api/live/update`, а телефон читает `GET /api/live/latest`.
