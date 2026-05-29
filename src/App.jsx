import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  Check,
  ClipboardList,
  CircleDollarSign,
  CreditCard,
  Database,
  Download,
  FolderOpen,
  GitBranch,
  KeyRound,
  LogOut,
  MenuSquare,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  User,
  UserRoundCog,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import {
  createPosterMenuWorkbook,
  menuTemplateProducts,
  parsePosterMenuWorkbook,
  productSeed,
  productSeedVersion
} from './menuExcel.js';
import { createOrdersWorkbook, parseOrdersWorkbook } from './orderExcel.js';
import { STICKER_WISH_BANK_SIZE, pickStickerWish, stickerWishForSeed } from './stickerWishes.js';

const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'TJS',
  maximumFractionDigits: 0
});

const receiptMoney = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const defaultPaymentMethods = ['Наличные', 'Карта', 'Alif', 'Dushanbe City'];
const paymentButtonLabels = {
  Наличные: 'Наличка',
  Карта: 'Карта',
  Alif: 'Alif',
  'Dushanbe City': 'Dushanbe City'
};
const paymentButtonLogos = {
  Alif: {
    alt: 'Alif',
    src: `${import.meta.env.BASE_URL}payment-alif.svg`
  },
  'Dushanbe City': {
    alt: 'Dushanbe City',
    src: `${import.meta.env.BASE_URL}payment-dushanbe-city.svg`
  }
};
const receiptLogoUrl = `${import.meta.env.BASE_URL}pos-logo.png`;

function normalizePaymentMethods(methods = defaultPaymentMethods) {
  const seen = new Set();
  return [...defaultPaymentMethods, ...(Array.isArray(methods) ? methods : [])]
    .map((method) => String(method || '').replace(/\s+/g, ' ').trim())
    .filter((method) => {
      const key = method.toLowerCase();
      if (!method || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function blankPaymentsFor(methods = defaultPaymentMethods) {
  return Object.fromEntries(normalizePaymentMethods(methods).map((method) => [method, 0]));
}

const defaultBlankPayments = blankPaymentsFor(defaultPaymentMethods);

function normalizePaymentValues(payments, methods = defaultPaymentMethods) {
  const source = payments || {};
  return Object.fromEntries(
    normalizePaymentMethods(methods).map((method) => [method, Number(source[method] || 0)])
  );
}

function paymentMethodLabel(method) {
  return paymentButtonLabels[method] || method;
}

function PaymentMethodTitle({ method }) {
  const logo = paymentButtonLogos[method];

  if (!logo) return <span>{paymentMethodLabel(method)}</span>;

  return (
    <span className="report-payment-logo-label">
      <img src={logo.src} alt={logo.alt} />
    </span>
  );
}

function formatOrderTime(value) {
  if (!value) return '-';
  return toDate(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatOrderPayments(order, paymentFilter = null) {
  const entries = Object.entries(order.payments || {}).filter(([, value]) => Number(value) > 0);
  const filteredEntries = paymentFilter ? entries.filter(([method]) => method === paymentFilter) : entries;
  if (!filteredEntries.length) return 'Оплата ожидает';

  return filteredEntries
    .map(([method, value]) => `${paymentMethodLabel(method)}: ${currency.format(value)}`)
    .join(', ');
}

const defaultAccounts = [
  {
    id: 'admin',
    username: 'admin',
    password: '0000',
    name: 'Администратор',
    role: 'admin'
  },
  {
    id: 'cashier',
    username: 'cashier',
    password: '1234',
    name: 'Кассир',
    role: 'cashier'
  }
];

const roleLabels = {
  admin: 'Админ',
  cashier: 'Кассир'
};

const fallbackRolePins = {
  admin: ['0000', 'admin123'],
  cashier: ['1234']
};

function accountPasswordMatches(account, password) {
  const savedPassword = String(account?.password ?? '').trim();
  const enteredPassword = String(password ?? '');

  if (savedPassword) return savedPassword === enteredPassword;
  return (fallbackRolePins[account?.role] || []).includes(enteredPassword);
}

const defaultRoleAccess = {
  admin: ['pos', 'menu', 'orders', 'inventory', 'analytics', 'cloud', 'roles'],
  cashier: ['pos', 'orders', 'analytics']
};

const hiddenViewIds = new Set(['inventory', 'pos']);
const showShiftExpensesSection = false;
const showGithubSyncSection = false;
const menuClearVersion = 'menu-cleared-260521';
const menuClearVersionKey = 'icashbox.menuClearVersion';
const productCategorySeedVersionKey = 'icashbox.productsCategorySeedVersion';
const manualOrderHistoryVersion = 'manual-orders-260522-v1';
const manualOrderHistoryVersionKey = 'icashbox.manualOrderHistoryVersion';
const legacyDemoProductIds = new Set(['capuccino-250', 'capuccino-350', 'burger', 'salad', 'pizza', 'lemonade']);
const previousPosterProductIds = new Set(Array.from({ length: 39 }, (_, index) => `poster-${index + 7}`));
const businessTimeZone = 'Asia/Dushanbe';
let pdfMakeLoader;

function loadPdfMake() {
  if (!pdfMakeLoader) {
    pdfMakeLoader = Promise.all([
      import('pdfmake/build/pdfmake.js'),
      import('pdfmake/build/vfs_fonts.js')
    ]).then(([pdfMakeModule, pdfFontsModule]) => {
      const loadedPdfMake = pdfMakeModule.default;
      loadedPdfMake.addVirtualFileSystem(pdfFontsModule.default);
      return loadedPdfMake;
    });
  }

  return pdfMakeLoader;
}

const stockSeed = [
  { id: 'coffee', name: 'Кофе зерно', unit: 'кг', stock: 8.4, min: 3, cost: 120 },
  { id: 'milk', name: 'Молоко', unit: 'л', stock: 24, min: 12, cost: 9 },
  { id: 'bun', name: 'Булочка', unit: 'шт', stock: 42, min: 20, cost: 3 },
  { id: 'patty', name: 'Котлета', unit: 'шт', stock: 38, min: 18, cost: 11 },
  { id: 'cheese', name: 'Сыр', unit: 'кг', stock: 3.2, min: 2, cost: 70 },
  { id: 'package', name: 'Упаковка', unit: 'шт', stock: 120, min: 40, cost: 1 },
  { id: 'tomato', name: 'Томаты', unit: 'кг', stock: 6.5, min: 2, cost: 14 },
  { id: 'dough', name: 'Тесто', unit: 'шт', stock: 28, min: 12, cost: 5 }
];

const recipes = {
  'capuccino-250': [
    { ingredientId: 'coffee', qty: 0.018 },
    { ingredientId: 'milk', qty: 0.18 }
  ],
  'capuccino-350': [
    { ingredientId: 'coffee', qty: 0.024 },
    { ingredientId: 'milk', qty: 0.26 }
  ],
  burger: [
    { ingredientId: 'bun', qty: 1 },
    { ingredientId: 'patty', qty: 1 },
    { ingredientId: 'cheese', qty: 0.04 },
    { ingredientId: 'package', qty: 1 }
  ],
  salad: [
    { ingredientId: 'tomato', qty: 0.12 },
    { ingredientId: 'cheese', qty: 0.03 },
    { ingredientId: 'package', qty: 1 }
  ],
  pizza: [
    { ingredientId: 'dough', qty: 1 },
    { ingredientId: 'cheese', qty: 0.16 },
    { ingredientId: 'tomato', qty: 0.18 },
    { ingredientId: 'package', qty: 1 }
  ],
  lemonade: [
    { ingredientId: 'package', qty: 1 }
  ]
};

const orderSeed = [
  {
    id: 1042,
    type: 'Продажа',
    table: 'Касса',
    status: 'Оплачен',
    minutes: 12,
    total: 136,
    items: ['Бургер классик x2'],
    paid: true,
    payments: { Наличные: 136 }
  },
  {
    id: 1043,
    type: 'Продажа',
    table: 'Касса',
    status: 'Оплачен',
    minutes: 3,
    total: 104,
    items: ['Пицца Маргарита 30 см x1', 'Лимонад 400 мл x1'],
    paid: true,
    payments: { Наличные: 104 }
  },
  {
    id: 1044,
    type: 'Продажа',
    table: 'Касса',
    status: 'Оплачен',
    minutes: 18,
    total: 57,
    items: ['Капучино 350 мл x1', 'Капучино 250 мл x1'],
    paid: true,
    payments: { Наличные: 57 }
  }
];

const manualOrderHistoryRows = [
  'Пинокалада биг-30 алиф',
  'Капучино-25 нал',
  'Латте 2 шт-50 нал',
  'Милкшейк черника мини-25 нал',
  'Матча биг-40 алиф',
  'Морож рожок-10 алиф',
  'Морож с черн сах 2шт -40алиф',
  'Матча мини-30алиф',
  'Мохито мини-20 нал',
  'Морожн рож-10 нал',
  'Бабл ти мини- 20 нал',
  'Милкшейк черника биг-30дс',
  'Мороженое 3шт- 60алиф',
  'Мохито мини-20 нал',
  'Милкшейк пинаколада биг-30 нал',
  'Манго маракуйя больш + матча мини-56 алиф',
  'Мороженное рожок - нал 10с',
  'Манго-маракуя - 26с нал',
  'Мохито-манго и Баблти - 40с нал',
  'Мороженное клубника и манго маракуя - 40с Алиф',
  'Милкшейк клубника большой - 30с Алиф',
  'Баблти большой , фреш лимон большой 2шт , мороженное клубника 2шт - 106с нал',
  'Фреш лимон большой и мороженное рожок 2шт - 40с Алиф',
  'Мороженное клубника - 20с нал',
  'Милкшейк клубника и Баблти большой - 56с Алиф',
  'Мороженное клубника 2шт - 40с нал',
  'Милкшейк клубника 4шт - 100с нал',
  'Милкшейк клубника - 25с нал',
  'Милкшейк клубника - 25с Алиф',
  'Матча мал - 30с Алиф',
  'Милкшейк Пинаколада маленький - 25с нал',
  'Милкшейк клубника большой - 30с ДС',
  'Мороженное клубника 3шт - 60с ДС',
  'Милкшейк клубника и клубничный жасмин - 45с ДС',
  'Милкшейк клубника большой 3шт - 90с нал',
  'Троп.виноград большой - 26с нал',
  'Милкшейк клубника большой - 30с ДС'
];

const navItems = [
  { id: 'pos', label: 'Касса', icon: ReceiptText },
  { id: 'menu', label: 'Меню', icon: MenuSquare },
  { id: 'orders', label: 'Заказы', icon: ClipboardList },
  { id: 'inventory', label: 'Склад', icon: Boxes },
  { id: 'analytics', label: 'Отчёты', icon: BarChart3 },
  { id: 'cloud', label: 'Настройки', icon: Settings },
  { id: 'roles', label: 'Роли', icon: ShieldCheck }
];

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function isLegacyDemoProductList(items) {
  return (
    Array.isArray(items) &&
    items.length === legacyDemoProductIds.size &&
    items.every((item) => legacyDemoProductIds.has(item.id))
  );
}

function isPreviousPosterSeedProductList(items) {
  return (
    Array.isArray(items) &&
    items.length === previousPosterProductIds.size &&
    items.every((item) => previousPosterProductIds.has(item.id))
  );
}

function isPosterSeedProductList(items) {
  return (
    Array.isArray(items) &&
    items.length === menuTemplateProducts.length &&
    items.every((item, index) => item.id === menuTemplateProducts[index]?.id)
  );
}

function menuSeedKey(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function applySeedCategories(items) {
  const seedByName = new Map(menuTemplateProducts.map((product) => [menuSeedKey(product.name), product]));
  let changed = 0;
  let matched = 0;

  const products = items.map((product) => {
    const seedProduct = seedByName.get(menuSeedKey(product.name));
    if (!seedProduct) return product;

    matched += 1;
    if (product.category === seedProduct.category) return product;

    changed += 1;
    return {
      ...product,
      category: seedProduct.category
    };
  });

  return { changed, matched, products };
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStored(key, fallback));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function canAccessView(account, viewId, accessRules = defaultRoleAccess) {
  if (!account) return false;
  if (viewId === 'roles') return account.role === 'admin';
  return (accessRules[account.role] || []).includes(viewId);
}

function normalizeCopies(value) {
  const copies = Number(value);
  if (!Number.isFinite(copies)) return 1;
  return Math.min(20, Math.max(1, Math.round(copies)));
}

function formatShiftNumber(date = new Date()) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    timeZone: businessTimeZone
  }).format(date);
}

function normalizeShiftNumber(value) {
  const text = String(value ?? '').trim();
  return /^\d{2}\.\d{2}$/.test(text) ? text : formatShiftNumber();
}

function shiftLabel(shift) {
  return `Смена ${normalizeShiftNumber(shift?.number)}`;
}

function formatShiftClosedAt(value) {
  if (!value) return 'закрытие ожидает';
  return `закрыта ${toDate(value).toLocaleString('ru-RU', {
    day: '2-digit',
    hour: '2-digit',
    month: '2-digit',
    minute: '2-digit',
    timeZone: businessTimeZone
  })}`;
}

function shiftTimingLine(report, shift) {
  const openedAt = report?.openedAt || shift?.openedAt || '-';
  const closedAt = report?.closedAt || shift?.closedAt;
  const closeText = report?.open || shift?.open ? 'закрытие ожидает' : formatShiftClosedAt(closedAt);
  return `${report?.label || shiftLabel(shift)} · открыта ${openedAt} · ${closeText}`;
}

function methodSlug(method) {
  return String(method || '')
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function toDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function localDateKey(value = new Date()) {
  const date = toDate(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: businessTimeZone,
    year: 'numeric'
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function previousLocalDateKey(value = new Date()) {
  return localDateKey(new Date(toDate(value).getTime() - 60 * 1000));
}

function formatBusinessTime(value = new Date()) {
  return toDate(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: businessTimeZone
  });
}

function parseNetworkTimePayload(payload) {
  const candidates = [
    payload?.iso,
    payload?.datetime,
    payload?.utc_datetime,
    payload?.dateTime,
    payload?.currentLocalTime,
    payload?.currentDateTime
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;
    const iso = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+05:00`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

async function fetchJsonWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchInternetDate() {
  if (typeof window !== 'undefined' && window.icashboxSystem?.getNetworkTime) {
    try {
      const payload = await window.icashboxSystem.getNetworkTime();
      const date = parseNetworkTimePayload(payload);
      if (date) return { date, source: payload?.source || 'internet' };
    } catch {
      // The desktop bridge can be unavailable while the app is still usable in the browser.
    }
  }

  const sources = [
    {
      source: 'local-print-agent',
      url: 'http://127.0.0.1:8787/time'
    },
    {
      source: 'worldtimeapi',
      url: 'https://worldtimeapi.org/api/timezone/Asia/Dushanbe'
    },
    {
      source: 'timeapi',
      url: 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Dushanbe'
    }
  ];

  for (const item of sources) {
    try {
      const payload = await fetchJsonWithTimeout(item.url);
      const date = parseNetworkTimePayload(payload);
      if (date) return { date, source: payload?.source || item.source };
    } catch {
      // Try the next time source.
    }
  }

  throw new Error('Интернет-время недоступно');
}

async function getShiftClock() {
  try {
    const time = await fetchInternetDate();
    return { ...time, online: true };
  } catch {
    return { date: new Date(), online: false, source: 'local-clock' };
  }
}

function shiftNumberFromKey(key) {
  const [, month, day] = String(key || '').split('-');
  if (!month || !day) return formatShiftNumber();
  return `${day}.${month}`;
}

function shiftKeyFromShift(shift) {
  return shift?.shiftKey || localDateKey(shift?.openedAtIso);
}

function orderShiftKey(order, fallbackShift) {
  return order.shiftKey || localDateKey(order.createdAt || fallbackShift?.openedAtIso);
}

function expenseShiftKey(expense, fallbackShift) {
  return expense.shiftKey || localDateKey(expense.createdAt || fallbackShift?.openedAtIso);
}

function summarizePeriod(orders, expenses = [], methods = defaultPaymentMethods) {
  const paymentMethods = normalizePaymentMethods(methods);
  const activeOrders = orders.filter((order) => !order.refunded);
  const revenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const paid = activeOrders.filter((order) => order.paid).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const average = Math.round(revenue / Math.max(activeOrders.length, 1));
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const refundTotal = orders
    .filter((order) => order.refunded)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const paymentTotals = paymentMethods.map((method) => [
    method,
    activeOrders.reduce((sum, order) => sum + netOrderPayment(order, method, paymentMethods), 0)
  ]);

  return {
    activeOrders,
    average,
    expenseTotal,
    orders,
    paid,
    paymentTotals,
    refundTotal,
    revenue
  };
}

function netOrderPayment(order, targetMethod = null, methods = defaultPaymentMethods) {
  const total = Number(order.total || 0);
  const entries = normalizePaymentMethods(methods)
    .map((method) => [method, Number(order.payments?.[method] || 0)])
    .filter(([, value]) => value > 0);

  if (!targetMethod) {
    return Math.min(total, entries.reduce((sum, [, value]) => sum + value, 0));
  }

  let remaining = total;
  for (const [method, value] of entries) {
    const applied = Math.min(remaining, value);
    if (method === targetMethod) return roundPayment(applied);
    remaining = Math.max(0, remaining - applied);
  }

  return 0;
}

function orderHasNetPayment(order, method, methods = defaultPaymentMethods) {
  return netOrderPayment(order, method, methods) > 0;
}

async function createArchiveReportPdfBase64({ dateKey, orders, paymentMethods = defaultPaymentMethods, report, shift, summary }) {
  const loadedPdfMake = await loadPdfMake();
  const paymentRows = paymentMethods.map((method) => [
    paymentMethodLabel(method),
    currency.format(orders.reduce((sum, order) => sum + netOrderPayment(order, method, paymentMethods), 0))
  ]);
  const orderRows = orders.length
    ? orders.map((order) => [
        `#${order.id}`,
        formatOrderTime(order.createdAt),
        orderDisplayStatus(order),
        (order.items || []).join(', ') || '-',
        { text: currency.format(order.total), alignment: 'right' }
      ])
    : [[{ text: 'Заказов нет', colSpan: 5, alignment: 'center' }, {}, {}, {}, {}]];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [34, 34, 34, 34],
    defaultStyle: { font: 'Roboto', fontSize: 8, lineHeight: 1.12 },
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      meta: { color: '#64736a', fontSize: 8 },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fillColor: '#edf4ea' }
    },
    content: [
      { text: 'iCashbox POS', style: 'meta' },
      { text: `Отчет за ${dateKey}`, style: 'title' },
      { text: `Кассир: ${shift.cashier || '-'} · Сформирован: ${new Date(report.exportedAt).toLocaleString('ru-RU')}`, style: 'meta' },
      {
        table: {
          widths: ['*', 'auto', '*', 'auto'],
          body: [
            ['Чистая прибыль', currency.format(summary.revenue), 'Оплачено', currency.format(summary.paid)],
            ['Возвраты', currency.format(summary.refundTotal), 'Средний чек', currency.format(summary.average)],
            ['Заказы', String(orders.length), 'Дата', dateKey]
          ].map((row) => [
            { text: row[0], color: '#64736a' },
            { text: row[1], bold: true, alignment: 'right' },
            { text: row[2], color: '#64736a' },
            { text: row[3], bold: true, alignment: 'right' }
          ])
        },
        layout: 'lightHorizontalLines',
        margin: [0, 12, 0, 0]
      },
      { text: 'Оплаты', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Способ', style: 'tableHeader' }, { text: 'Сумма', style: 'tableHeader', alignment: 'right' }],
            ...paymentRows.map(([method, value]) => [method, { text: value, bold: true, alignment: 'right' }])
          ]
        },
        layout: 'lightHorizontalLines'
      },
      { text: 'Заказы', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [34, 42, 54, '*', 62],
          body: [
            [
              { text: '№', style: 'tableHeader' },
              { text: 'Время', style: 'tableHeader' },
              { text: 'Статус', style: 'tableHeader' },
              { text: 'Позиции', style: 'tableHeader' },
              { text: 'Сумма', style: 'tableHeader', alignment: 'right' }
            ],
            ...orderRows
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ]
  };

  const buffer = await new Promise((resolve) => {
    loadedPdfMake.createPdf(docDefinition).getBuffer(resolve);
  });
  return bytesToBase64(buffer);
}

function buildShiftReports(orders, expenses, shiftHistory, shift, paymentMethods = defaultPaymentMethods) {
  const currentKey = shiftKeyFromShift(shift);
  const keys = new Set([currentKey]);

  orders.forEach((order) => keys.add(orderShiftKey(order, shift)));
  expenses.forEach((expense) => keys.add(expenseShiftKey(expense, shift)));
  shiftHistory.forEach((item) => item.key && keys.add(item.key));

  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const historyItem = shiftHistory.find((item) => item.key === key);
      const periodOrders = orders.filter((order) => orderShiftKey(order, shift) === key);
      const periodExpenses = expenses.filter((expense) => expenseShiftKey(expense, shift) === key);
      const summary = summarizePeriod(periodOrders, periodExpenses, paymentMethods);
      const number = historyItem?.number || (key === currentKey ? normalizeShiftNumber(shift.number) : shiftNumberFromKey(key));

      return {
        ...historyItem,
        key,
        label: `Смена ${number}`,
        number,
        cashier: historyItem?.cashier || (key === currentKey ? shift.cashier : '-'),
        openedAt: historyItem?.openedAt || (key === currentKey ? shift.openedAt : '-'),
        openingCashBalance:
          historyItem?.openingCashBalance ?? (key === currentKey ? shift.openingCashBalance : 0),
        closingCashBalance:
          historyItem?.closingCashBalance ?? (key === currentKey ? shift.closingCashBalance : null),
        open: key === currentKey && shift.open,
        summary
      };
    });
}

function buildLiveSnapshot({ orders, paymentMethods, shift }) {
  const currentKey = shiftKeyFromShift(shift);
  const dayOrders = orders.filter((order) => orderShiftKey(order, shift) === currentKey).map(normalizeOrderStatus);
  const activeOrders = dayOrders.filter((order) => !order.refunded);
  const revenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const checks = activeOrders.length;
  const productMap = new Map();

  activeOrders.forEach((order) => {
    const lines = Array.isArray(order.lines) && order.lines.length
      ? order.lines
      : (order.items || []).map((item) => ({ name: item, qty: 1, total: Number(order.total || 0) / Math.max(1, (order.items || []).length) }));
    lines.forEach((line) => {
      const name = line.name || 'Позиция';
      const current = productMap.get(name) || { name, qty: 0, total: 0 };
      current.qty += Number(line.qty || 1);
      current.total += Number(line.total || line.price || 0);
      productMap.set(name, current);
    });
  });

  return {
    shift: {
      cashier: shift.cashier,
      label: shiftLabel(shift),
      openedAt: shift.openedAt,
      open: shift.open
    },
    summary: {
      average: checks ? revenue / checks : 0,
      checks,
      revenue
    },
    payments: paymentMethods.map((method) => ({
      method: paymentMethodLabel(method),
      total: activeOrders.reduce((sum, order) => sum + netOrderPayment(order, method, paymentMethods), 0)
    })),
    recentOrders: activeOrders.slice(0, 8).map((order) => ({
      id: order.id,
      items: order.items || [],
      status: orderDisplayStatus(order),
      total: Number(order.total || 0)
    })),
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  };
}

function productLineLabel(product) {
  return [product.name, product.size].filter(Boolean).join(' ');
}

function productVariantKey(product) {
  return [product.category, productBaseName(product.name)]
    .map((part) => String(part || '').trim().toLowerCase())
    .join('::');
}

function productBaseName(name) {
  return String(name || '')
    .replace(/\b(mini|small|big|large|xl)\b/gi, '')
    .replace(/\b(мини|маленьк(?:ий|ая|ое)?|мал|биг|больш(?:ой|ая|ое)?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function productNameVolume(name) {
  const text = String(name || '').toLowerCase();
  if (/\b(mini|small)\b/.test(text) || /\b(мини|маленьк(?:ий|ая|ое)?|мал)\b/.test(text)) return 'Маленький';
  if (/\b(big|large|xl)\b/.test(text) || /\b(биг|больш(?:ой|ая|ое)?)\b/.test(text)) return 'Большой';
  return '';
}

function productSizeChoiceLabel(product, index, total) {
  const size = String(product.size || '').trim();
  const text = size.toLowerCase();
  let volume = productNameVolume(product.name) || size || 'порция';

  if (/мини|мал|small|s\b/.test(text)) {
    volume = `Маленький${size ? ` · ${size}` : ''}`;
  } else if (/биг|бол|large|big|xl|l\b/.test(text)) {
    volume = `Большой${size ? ` · ${size}` : ''}`;
  } else if (productNameVolume(product.name)) {
    volume = `${productNameVolume(product.name)}${size && !['порция'].includes(size.toLowerCase()) ? ` · ${size}` : ''}`;
  } else if (total === 2 && index === 0) {
    volume = `Маленький${size ? ` · ${size}` : ''}`;
  } else if (total === 2 && index === 1) {
    volume = `Большой${size ? ` · ${size}` : ''}`;
  }

  return volume;
}

function sortProductVariants(products) {
  return [...products].sort((a, b) => {
    const priceDiff = Number(a.price || 0) - Number(b.price || 0);
    if (priceDiff) return priceDiff;
    return String(a.size || '').localeCompare(String(b.size || ''), 'ru');
  });
}

function roundPayment(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric * 100) / 100);
}

function parseCashBalance(value) {
  const numeric = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(numeric) ? roundPayment(numeric) : 0;
}

function encodeBase64Unicode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64Unicode(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function bytesToBase64(bytes) {
  let binary = '';
  new Uint8Array(bytes).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const exportDirectoryDb = {
  name: 'icashbox-export-directory',
  store: 'handles',
  key: 'reports'
};

function openExportDirectoryDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = window.indexedDB.open(exportDirectoryDb.name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(exportDirectoryDb.store);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readExportDirectoryHandle() {
  const db = await openExportDirectoryDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(exportDirectoryDb.store, 'readonly')
      .objectStore(exportDirectoryDb.store)
      .get(exportDirectoryDb.key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveExportDirectoryHandle(handle) {
  const db = await openExportDirectoryDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(exportDirectoryDb.store, 'readwrite')
      .objectStore(exportDirectoryDb.store)
      .put(handle, exportDirectoryDb.key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function ensureDirectoryWritePermission(handle) {
  if (!handle?.queryPermission || !handle?.requestPermission) return false;
  const options = { mode: 'readwrite' };
  if ((await handle.queryPermission(options)) === 'granted') return true;
  return (await handle.requestPermission(options)) === 'granted';
}

async function hasDirectoryWritePermission(handle) {
  if (!handle?.queryPermission) return false;
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
}

async function writeDirectoryFile(handle, filename, data, type) {
  const file = await handle.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  await writable.write(data instanceof Blob ? data : new Blob([data], { type }));
  await writable.close();
}

function downloadArchiveFiles({ dateKey, dayOrders, report, reportPdfBase64, workbook }) {
  downloadBlob(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `orders-${dateKey}.xlsx`);
  downloadBlob(new Blob([JSON.stringify(dayOrders, null, 2)], { type: 'application/json' }), `orders-${dateKey}.json`);
  downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `report-${dateKey}.json`);
  downloadBlob(new Blob([Uint8Array.from(atob(reportPdfBase64), (char) => char.charCodeAt(0))], { type: 'application/pdf' }), `report-${dateKey}.pdf`);
}

function orderDisplayStatus(order) {
  return order?.refunded || order?.status === 'Возврат' ? 'Возврат' : 'Оплачен';
}

function normalizeOrderStatus(order) {
  const status = orderDisplayStatus(order);
  return {
    ...order,
    cancelled: false,
    paid: status === 'Оплачен',
    refunded: status === 'Возврат',
    status
  };
}

function manualPaymentMethod(raw) {
  const text = String(raw || '').toLowerCase();
  if (text.includes('алиф') || text.includes('alif')) return 'Alif';
  if (text.includes('дс') || text.includes('ds')) return 'Dushanbe City';
  if (text.includes('карт') || text.includes('card') || text.includes('visa')) return 'Карта';
  return 'Наличные';
}

function parseManualOrderHistoryRow(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const amountMatches = Array.from(text.matchAll(/\d+\s*с?/gi));
  const amountMatch = amountMatches.at(-1);
  const total = Number(String(amountMatch?.[0] || '').replace(/\D/g, ''));

  if (!text || !amountMatch || !Number.isFinite(total) || total <= 0) return null;

  const method = manualPaymentMethod(text);
  const name = text
    .slice(0, amountMatch.index)
    .replace(/(алиф|alif|дс|ds|наличные|наличка|налик|нал)/gi, '')
    .replace(/\s*[-–—,]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    item: name || 'Позиция',
    method,
    total
  };
}

function buildManualOrderHistoryOrders({ baseId, shift }) {
  const shiftKey = shiftKeyFromShift(shift);
  const shiftName = shiftLabel(shift);
  const shiftNumber = normalizeShiftNumber(shift.number);
  const openedAt = toDate(shift.openedAtIso);

  return manualOrderHistoryRows
    .map(parseManualOrderHistoryRow)
    .filter(Boolean)
    .map((row, index) => {
      const createdAt = new Date(openedAt.getTime() + (index + 1) * 2 * 60 * 1000).toISOString();
      return {
        id: baseId + index,
        type: 'Продажа',
        table: 'Касса',
        status: 'Оплачен',
        minutes: 0,
        total: row.total,
        items: [row.item],
        lines: [
          {
            id: `manual-${baseId + index}`,
            name: row.item,
            price: row.total,
            qty: 1,
            total: row.total
          }
        ],
        paid: true,
        payments: { ...defaultBlankPayments, [row.method]: row.total },
        shiftKey,
        shiftLabel: shiftName,
        shiftNumber,
        createdAt,
        importBatch: manualOrderHistoryVersion
      };
    });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function menuImageFileToDataUrl(file) {
  if (!file || !file.type.startsWith('image/')) {
    return Promise.reject(new Error('Выберите файл изображения'));
  }

  if (file.type === 'image/svg+xml') {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(sourceUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Не удалось загрузить изображение'));
    };

    image.src = sourceUrl;
  });
}

function App() {
  const [activeView, setActiveView] = useState('pos');
  const [accounts, setAccounts] = useStoredState('icashbox.accounts', defaultAccounts);
  const [accessRules, setAccessRules] = useStoredState('icashbox.accessRules', defaultRoleAccess);
  const [session, setSession] = useStoredState('icashbox.session', null);
  const [isOnline, setIsOnline] = useStoredState('icashbox.online', false);
  const [products, setProducts] = useStoredState('icashbox.products', productSeed);
  const [stock, setStock] = useStoredState('icashbox.stock', stockSeed);
  const [orders, setOrders] = useStoredState('icashbox.orders', orderSeed);
  const [orderArchives, setOrderArchives] = useStoredState('icashbox.orderArchives', []);
  const [expenses, setExpenses] = useStoredState('icashbox.expenses', [
    { id: 1, title: 'Закупка продуктов', category: 'Логистика', amount: 120, time: '09:45' },
    { id: 2, title: 'Хозтовары', category: 'Операционные', amount: 85, time: '11:10' }
  ]);
  const [syncQueue, setSyncQueue] = useStoredState('icashbox.syncQueue', [
    { id: 1, type: 'Изменение цены', source: 'Локально', status: 'Ожидает', time: '09:20' },
    { id: 2, type: 'Закрытие смены', source: 'Локально', status: 'Ожидает', time: '10:05' },
    { id: 3, type: 'Списание склада', source: 'Локально', status: 'Ожидает', time: '10:14' }
  ]);
  const [shift, setShift] = useStoredState('icashbox.shift', {
    number: formatShiftNumber(),
    open: true,
    shiftKey: localDateKey(),
    openedAt: '08:00',
    openedAtIso: new Date().toISOString(),
    openingCashBalance: 0,
    closingCashBalance: null,
    cashier: 'Мадина'
  });
  const [shiftHistory, setShiftHistory] = useStoredState('icashbox.shiftHistory', []);
  const [paymentSettings, setPaymentSettings] = useStoredState('icashbox.paymentSettings', {
    methods: defaultPaymentMethods
  });
  const paymentMethods = useMemo(
    () => normalizePaymentMethods(paymentSettings.methods),
    [paymentSettings.methods]
  );
  const blankPayments = useMemo(() => blankPaymentsFor(paymentMethods), [paymentMethods]);
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [orderComment, setOrderComment] = useState('');
  const [payments, setPayments] = useState(() => blankPaymentsFor(defaultPaymentMethods));
  const [lastMessage, setLastMessage] = useState('Локальная база готова к работе');
  const [printJob, setPrintJob] = useState(null);
  const [copyRequest, setCopyRequest] = useState(null);
  const [orderEditAuth, setOrderEditAuth] = useState(null);
  const [adminActionAuth, setAdminActionAuth] = useState(null);
  const [orderEditor, setOrderEditor] = useState(null);
  const [clearOrdersAuth, setClearOrdersAuth] = useState(null);
  const [loadedArchive, setLoadedArchive] = useState(null);
  const [shiftCashPrompt, setShiftCashPrompt] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [liveUrls, setLiveUrls] = useState([]);
  const [remoteLiveStatus, setRemoteLiveStatus] = useState('');
  const [printSettings, setPrintSettings] = useStoredState('icashbox.printSettings', {
    autoReceipt: false,
    directAgent: true,
    printerName: '',
    remoteLiveEnabled: false,
    remoteLiveToken: '',
    remoteLiveUrl: '',
    shiftPassword: '1234',
    stickerPrinterName: ''
  });
  const [exportSettings, setExportSettings] = useStoredState('icashbox.exportSettings', {
    directory: ''
  });
  const [exportDirectoryHandle, setExportDirectoryHandle] = useState(null);
  const [githubSettings, setGithubSettings] = useStoredState('icashbox.githubSettings', {
    owner: '',
    repo: '',
    branch: 'main',
    path: 'icashbox-backup.json',
    token: ''
  });
  const [printers, setPrinters] = useState([]);
  const importInputRef = useRef(null);
  const creatingOrderRef = useRef(false);
  const currentUser = accounts.find((account) => account.id === session?.accountId) || null;
  const currentShiftLabel = shiftLabel(shift);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !hiddenViewIds.has(item.id) && canAccessView(currentUser, item.id, accessRules)),
    [accessRules, currentUser]
  );

  const categories = useMemo(() => ['Все', ...new Set(products.map((item) => item.category))], [products]);
  const visibleProducts = products.filter((item) => {
    const categoryMatch = selectedCategory === 'Все' || item.category === selectedCategory;
    const searchMatch = `${item.name} ${item.size} ${item.category}`.toLowerCase().includes(search.toLowerCase());
    return item.active && categoryMatch && searchMatch;
  });
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const paidAmount = Object.values(payments).reduce((sum, value) => sum + Number(value || 0), 0);

  useEffect(() => {
    setPayments((current) => normalizePaymentValues(current, paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    if (!window.icashboxSystem?.updateLiveSnapshot) return;
    const snapshot = buildLiveSnapshot({ orders, paymentMethods, shift });
    window.icashboxSystem.updateLiveSnapshot(snapshot)
      .then((result) => setLiveUrls(result?.urls || []))
      .catch(() => {});
  }, [orders, paymentMethods, shift]);

  const pushRemoteLiveSnapshot = useCallback(async (manual = false, overrideOrders = orders) => {
    if (!printSettings.remoteLiveEnabled || !printSettings.remoteLiveUrl) {
      if (manual) setRemoteLiveStatus('Включите Live через интернет и укажите API URL');
      return false;
    }

    const snapshot = buildLiveSnapshot({ orders: overrideOrders, paymentMethods, shift });
    try {
      const response = await fetch(printSettings.remoteLiveUrl.trim(), {
        body: JSON.stringify(snapshot),
        headers: {
          'Content-Type': 'application/json',
          ...(printSettings.remoteLiveToken ? { 'x-live-token': printSettings.remoteLiveToken.trim() } : {})
        },
        method: 'POST'
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
      }
      setRemoteLiveStatus(`Отправлено ${new Date().toLocaleTimeString('ru-RU')}`);
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Не удалось отправить Live';
      setRemoteLiveStatus(message.slice(0, 160));
      return false;
    }
  }, [
    orders,
    paymentMethods,
    printSettings.remoteLiveEnabled,
    printSettings.remoteLiveToken,
    printSettings.remoteLiveUrl,
    shift
  ]);

  useEffect(() => {
    if (!printSettings.remoteLiveEnabled || !printSettings.remoteLiveUrl) return undefined;
    const timeout = window.setTimeout(() => {
      pushRemoteLiveSnapshot(false);
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [printSettings.remoteLiveEnabled, printSettings.remoteLiveUrl, pushRemoteLiveSnapshot]);

  const archiveOrdersForDate = async (dateKey, reason = 'auto', options = {}) => {
    const dayOrders = orders.filter((order) => orderShiftKey(order, shift) === dateKey).map(normalizeOrderStatus);
    if (!dayOrders.length) return false;

    const dayExpenses = expenses.filter((expense) => expenseShiftKey(expense, shift) === dateKey);
    const summary = summarizePeriod(dayOrders, dayExpenses, paymentMethods);
    const report = {
      dateKey,
      exportedAt: new Date().toISOString(),
      reason,
      summary: {
        average: summary.average,
        orders: dayOrders.length,
        paid: summary.paid,
        refundTotal: summary.refundTotal,
        revenue: summary.revenue
      }
    };
    const workbook = await createOrdersWorkbook(dayOrders, paymentMethods);
    const reportPdfBase64 = await createArchiveReportPdfBase64({
      dateKey,
      orders: dayOrders,
      paymentMethods,
      report,
      shift,
      summary
    });
    const archivePayload = {
      dateKey,
      exportDir: exportSettings.directory,
      orders: dayOrders,
      ordersWorkbookBase64: bytesToBase64(workbook),
      report,
      reportPdfBase64
    };
    let files;
    let exportWarning = '';

    if (window.icashboxSystem?.archiveOrders) {
      files = await window.icashboxSystem.archiveOrders(archivePayload);
    } else if (exportDirectoryHandle) {
      const ordersJson = JSON.stringify(dayOrders, null, 2);
      const reportJson = JSON.stringify(report, null, 2);
      const pdfBytes = Uint8Array.from(atob(reportPdfBase64), (char) => char.charCodeAt(0));

      try {
        if (!(await hasDirectoryWritePermission(exportDirectoryHandle))) {
          throw new Error('Нет разрешения браузера на запись в папку');
        }

        await writeDirectoryFile(
          exportDirectoryHandle,
          `orders-${dateKey}.xlsx`,
          workbook,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        await writeDirectoryFile(exportDirectoryHandle, `orders-${dateKey}.json`, ordersJson, 'application/json');
        await writeDirectoryFile(exportDirectoryHandle, `report-${dateKey}.json`, reportJson, 'application/json');
        await writeDirectoryFile(exportDirectoryHandle, `report-${dateKey}.pdf`, pdfBytes, 'application/pdf');

        files = {
          archiveDir: exportSettings.directory || exportDirectoryHandle.name || 'selected-folder',
          jsonPath: `orders-${dateKey}.json`,
          pdfPath: `report-${dateKey}.pdf`,
          reportPath: `report-${dateKey}.json`,
          xlsxPath: `orders-${dateKey}.xlsx`
        };
      } catch (error) {
        downloadArchiveFiles({ dateKey, dayOrders, report, reportPdfBase64, workbook });
        exportWarning = error.message || 'Браузер не смог записать в выбранную папку';
        files = {
          archiveDir: 'скачано браузером',
          jsonPath: `orders-${dateKey}.json`,
          pdfPath: `report-${dateKey}.pdf`,
          reportPath: `report-${dateKey}.json`,
          xlsxPath: `orders-${dateKey}.xlsx`
        };
      }
    } else {
      downloadArchiveFiles({ dateKey, dayOrders, report, reportPdfBase64, workbook });
      files = {
        archiveDir: 'скачано браузером',
        jsonPath: `orders-${dateKey}.json`,
        pdfPath: `report-${dateKey}.pdf`,
        reportPath: `report-${dateKey}.json`,
        xlsxPath: `orders-${dateKey}.xlsx`
      };
    }
    const archive = {
      ...files,
      dateKey,
      exportedAt: report.exportedAt,
      label: `Отчет ${dateKey}`,
      ordersCount: dayOrders.length,
      revenue: summary.revenue
    };

    setOrderArchives((current) => [archive, ...current.filter((item) => item.dateKey !== dateKey)]);
    if (options.clearOrders !== false) {
      setOrders((current) => current.filter((order) => orderShiftKey(order, shift) !== dateKey));
    }
    setLoadedArchive((current) => (current?.dateKey === dateKey ? { ...archive, orders: dayOrders } : current));
    queueSync(`Архив заказов ${dateKey}`, 'Папка отчетов');
    setLastMessage(
      exportWarning
        ? `Папка не приняла файлы (${exportWarning}). Отчет скачан браузером`
        : `Заказы за ${dateKey} выгружены: ${files.archiveDir}`
    );
    return archive;
  };
  useEffect(() => {
    const runMidnightArchive = () => {
      const now = new Date();
      if (now.getHours() !== 0 || now.getMinutes() > 2) return;

      const dateKey = previousLocalDateKey(now);
      const archiveKey = `icashbox.archived.${dateKey}`;
      if (localStorage.getItem(archiveKey)) return;

      archiveOrdersForDate(dateKey, 'midnight')
        .then((archived) => {
          if (archived) localStorage.setItem(archiveKey, new Date().toISOString());
        })
        .catch((error) => setLastMessage(error.message || 'Не удалось сделать ночной архив заказов'));
    };

    runMidnightArchive();
    const timer = window.setInterval(runMidnightArchive, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [orders, expenses, shift]);

  useEffect(() => {
    if (localStorage.getItem(menuClearVersionKey) === menuClearVersion) return;

    const categoryPatch = applySeedCategories(products);
    const isKnownMenu = categoryPatch.matched >= Math.min(30, menuTemplateProducts.length);

    if (isLegacyDemoProductList(products) || isPreviousPosterSeedProductList(products)) {
      setProducts([]);
      setCart([]);
      setSelectedCategory('Все');
      localStorage.setItem('icashbox.productsSeedVersion', productSeedVersion);
      localStorage.setItem(productCategorySeedVersionKey, productSeedVersion);
      localStorage.setItem(menuClearVersionKey, menuClearVersion);
      setLastMessage('Текущее меню удалено');
      return;
    }

    if (isKnownMenu || isPosterSeedProductList(products)) {
      setProducts([]);
      setCart([]);
      setSelectedCategory('Все');
      localStorage.setItem('icashbox.productsSeedVersion', productSeedVersion);
      localStorage.setItem(productCategorySeedVersionKey, productSeedVersion);
      localStorage.setItem(menuClearVersionKey, menuClearVersion);
      setLastMessage('Текущее меню удалено');
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!canAccessView(currentUser, activeView, accessRules)) {
      setActiveView(accessRules[currentUser.role]?.[0] || 'pos');
    }
  }, [accessRules, activeView, currentUser]);

  useEffect(() => {
    if ((accessRules.cashier || []).includes('analytics')) return;
    setAccessRules((current) => ({
      ...current,
      cashier: [...new Set([...(current.cashier || []), 'analytics'])]
    }));
  }, [accessRules.cashier, setAccessRules]);

  useEffect(() => {
    let cancelled = false;

    window.icashboxSystem?.getAutoLaunch?.()
      .then((settings) => {
        if (!cancelled) setAutoLaunch(Boolean(settings?.openAtLogin));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (window.icashboxSystem?.selectExportDirectory || !window.showDirectoryPicker) return undefined;

    let cancelled = false;
    readExportDirectoryHandle()
      .then((handle) => {
        if (cancelled || !handle) return;
        setExportDirectoryHandle(handle);
        setExportSettings((current) => ({ ...current, directory: current.directory || handle.name || '' }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setExportSettings]);

  useEffect(() => {
    const nextNumber = normalizeShiftNumber(shift.number);
    const nextShiftKey = shift.shiftKey || localDateKey(shift.openedAtIso);
    if (shift.number === nextNumber && shift.shiftKey === nextShiftKey) return;
    setShift((current) => ({ ...current, number: nextNumber, shiftKey: nextShiftKey }));
  }, [setShift, shift.number, shift.openedAtIso, shift.shiftKey]);

  useEffect(() => {
    if (localStorage.getItem(manualOrderHistoryVersionKey) === manualOrderHistoryVersion) return;

    localStorage.setItem(manualOrderHistoryVersionKey, manualOrderHistoryVersion);
    setOrders((current) => {
      if (current.some((order) => order.importBatch === manualOrderHistoryVersion)) return current;

      const numericIds = current.map((order) => Number(order.id)).filter(Number.isFinite);
      const baseId = Math.max(1044, ...numericIds) + 1;
      const importedOrders = buildManualOrderHistoryOrders({ baseId, shift });
      return [...importedOrders].reverse().concat(current);
    });
    setLastMessage(`Добавлены заказы в историю: ${manualOrderHistoryRows.length}`);
  }, [setOrders, shift]);

  const login = ({ password, role }) => {
    const account = accounts.find(
      (item) => item.role === role && accountPasswordMatches(item, password)
    );

    if (!account) return false;

    setSession({ accountId: account.id, loggedAt: new Date().toISOString() });
    setShift((current) => ({ ...current, cashier: account.name }));
    setLastMessage(`Вход выполнен: ${account.name}`);
    return true;
  };

  const logout = () => {
    setSession(null);
    setCart([]);
    setGuestName('');
    setOrderComment('');
    setPayments(blankPayments);
    setPrintJob(null);
    setCopyRequest(null);
    setOrderEditAuth(null);
    setAdminActionAuth(null);
    setOrderEditor(null);
    setClearOrdersAuth(null);
    setSettingsOpen(false);
    setLastMessage('Вы вышли из аккаунта');
  };

  const queueSync = (type, source = 'Локально') => {
    const now = new Date();
    setSyncQueue((queue) => [
      {
        id: now.getTime(),
        type,
        source,
        status: isOnline ? 'Сохранено' : 'Ожидает',
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      },
      ...queue
    ]);
  };

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...current, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const createOrder = () => {
    if (!cart.length || !shift.open || creatingOrderRef.current) return;
    if (paidAmount < cartTotal) {
      setLastMessage(`До оплаты осталось: ${currency.format(roundPayment(cartTotal - paidAmount))}`);
      return;
    }
    creatingOrderRef.current = true;
    const createdAt = new Date().toISOString();
    const shiftKey = shiftKeyFromShift(shift);
    const stickerCount = cart.reduce((sum, item) => sum + Math.max(1, Math.round(Number(item.qty || 1))), 0);
    const stickerWishes = Array.from({ length: stickerCount }, () => pickStickerWish());
    const nextOrder = {
      id: Math.max(1044, ...orders.map((order) => order.id)) + 1,
      type: 'Продажа',
      table: 'Касса',
      status: 'Оплачен',
      minutes: 0,
      total: cartTotal,
      items: cart.map((item) => `${productLineLabel(item)} x${item.qty}`),
      lines: cart.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        price: item.price,
        qty: item.qty,
        total: item.price * item.qty
      })),
      guestName: guestName.trim(),
      comment: orderComment,
      stickerWishes,
      paid: true,
      payments: { ...payments },
      shiftKey,
      shiftLabel: currentShiftLabel,
      shiftNumber: normalizeShiftNumber(shift.number),
      createdAt
    };

    const nextOrders = [nextOrder, ...orders];
    setOrders(nextOrders);
    pushRemoteLiveSnapshot(false, nextOrders);
    setStock(applyRecipeWriteOff(stock, cart));
    queueSync('Создание заказа');
    queueSync('Списание ингредиентов');
    setLastMessage(`Заказ #${nextOrder.id} сохранён локально`);
    if (printSettings.autoReceipt) {
      sendToReceiptPrinter(nextOrder, 'receipt', true, 1);
    } else {
      setPrintJob({ order: nextOrder, type: 'receipt', autoPrint: false });
    }
    setCart([]);
    setGuestName('');
    setOrderComment('');
    setPayments(blankPayments);
    window.setTimeout(() => {
      creatingOrderRef.current = false;
    }, 900);
  };

  const toggleNetwork = () => {
    setIsOnline((value) => {
      const next = !value;
      if (next) {
        setSyncQueue((queue) => queue.map((item) => ({ ...item, status: 'Сохранено' })));
        setLastMessage('Локальная база обновлена');
      } else {
        setLastMessage('Интернет отключён, касса продолжает работать локально');
      }
      return next;
    });
  };

  const toggleAutoLaunch = async () => {
    if (!window.icashboxSystem?.setAutoLaunch) {
      setLastMessage('Автозагрузка доступна только в portable-версии');
      return;
    }

    try {
      const nextValue = !autoLaunch;
      const settings = await window.icashboxSystem.setAutoLaunch(nextValue);
      setAutoLaunch(Boolean(settings?.openAtLogin));
      setLastMessage(settings?.openAtLogin ? 'iCashbox добавлен в автозагрузку Windows' : 'iCashbox убран из автозагрузки Windows');
    } catch (error) {
      setLastMessage(error.message || 'Не удалось изменить автозагрузку');
    }
  };

  const selectExportDirectory = async () => {
    try {
      if (window.icashboxSystem?.selectExportDirectory) {
        const directory = await window.icashboxSystem.selectExportDirectory();
        if (!directory) return;
        setExportSettings({ directory });
        setLastMessage(`Папка отчетов: ${directory}`);
        return;
      }

      if (!window.showDirectoryPicker) {
        setLastMessage('Этот браузер не даёт выбрать папку. Отчеты будут скачиваться обычными файлами');
        return;
      }

      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (!(await ensureDirectoryWritePermission(handle))) {
        setLastMessage('Браузер не дал доступ на запись в выбранную папку');
        return;
      }

      await writeDirectoryFile(handle, '.icashbox-access-check.txt', 'iCashbox export folder is ready', 'text/plain');
      await handle.removeEntry?.('.icashbox-access-check.txt').catch(() => {});

      setExportDirectoryHandle(handle);
      setExportSettings({ directory: handle.name || 'Выбранная папка' });
      await saveExportDirectoryHandle(handle);
      setLastMessage(`Папка отчетов: ${handle.name || 'выбрана'}`);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setLastMessage(error.message || 'Не удалось выбрать папку отчетов');
    }
  };

  const closeShift = async (cashBalance = 0) => {
    const closingCashBalance = parseCashBalance(cashBalance);
    setLastMessage('Получаю актуальную дату смены из интернета...');
    const clock = await getShiftClock();
    const closedAt = clock.date.toISOString();
    const key = shiftKeyFromShift(shift);
    const summary = summarizePeriod(
      orders.filter((order) => orderShiftKey(order, shift) === key),
      expenses.filter((expense) => expenseShiftKey(expense, shift) === key),
      paymentMethods
    );
    const closedShift = {
      id: `shift-${key}`,
      key,
      number: normalizeShiftNumber(shift.number),
      label: currentShiftLabel,
      cashier: shift.cashier,
      openedAt: shift.openedAt,
      openedAtIso: shift.openedAtIso,
      closedAt,
      openingCashBalance: parseCashBalance(shift.openingCashBalance),
      closingCashBalance,
      summary: {
        average: summary.average,
        expenseTotal: summary.expenseTotal,
        orders: summary.orders.length,
        paid: summary.paid,
        refundTotal: summary.refundTotal,
        revenue: summary.revenue
      }
    };

    setShiftHistory((current) => [closedShift, ...current.filter((item) => item.key !== key)]);
    setShift((current) => ({ ...current, open: false, closedAt, closingCashBalance }));
    const archive = await archiveOrdersForDate(key, 'shift-close');
    queueSync('Закрытие смены');
    const timeMessage = clock.online ? 'Смена закрыта по интернет-времени' : 'Смена закрыта по локальному времени';
    setLastMessage(archive?.archiveDir ? `${timeMessage}. Отчет: ${archive.archiveDir}` : timeMessage);
  };

  const openShift = async (cashBalance = 0) => {
    const openingCashBalance = parseCashBalance(cashBalance);
    setLastMessage('Получаю актуальную дату смены из интернета...');
    const clock = await getShiftClock();
    const openedAt = clock.date;
    setShift((current) => ({
      number: formatShiftNumber(openedAt),
      open: true,
      shiftKey: localDateKey(openedAt),
      openedAt: formatBusinessTime(openedAt),
      openedAtIso: openedAt.toISOString(),
      openingCashBalance,
      closingCashBalance: null,
      timeSource: clock.source,
      cashier: current.cashier
    }));
    queueSync('Открытие смены');
    setLastMessage(clock.online ? 'Новая смена открыта по интернет-времени' : 'Новая смена открыта по локальному времени: интернет-время недоступно');
  };

  const requestShiftCashInput = (mode) => {
    setShiftCashPrompt({
      mode,
      value: String(
        mode === 'close'
          ? shift.closingCashBalance ?? shift.openingCashBalance ?? 0
          : shift.closingCashBalance ?? 0
      )
    });
  };

  const requestShiftToggle = () => {
    requestAdminAction({
      action: () => requestShiftCashInput(shift.open ? 'close' : 'open'),
      confirmLabel: shift.open ? 'Закрыть смену' : 'Открыть смену',
      description: shift.open
        ? `${currentShiftLabel}: подтвердите закрытие смены паролем администратора`
        : `${currentShiftLabel}: введите пароль смены`,
      passwordCheck: shift.open ? isAdminPassword : isShiftPassword,
      restrictToAdmin: false,
      title: shift.open ? 'Пароль для закрытия смены' : 'Пароль смены',
      wrongPasswordMessage: shift.open ? 'Неверный пароль администратора' : 'Неверный пароль смены'
    });
  };

  const updateProduct = (id, patch) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...patch } : product)));
    queueSync('Изменение меню');
    setLastMessage('Меню обновлено');
  };

  const addProduct = (draft) => {
    const now = Date.now();
    const patch = draft ? menuDraftToProductPatch(draft) : {};
    const nextProduct = {
      id: `product-${now}`,
      name: patch.name || 'Новая позиция',
      category: patch.category || 'Меню',
      size: patch.size || 'порция',
      price: Number(patch.price || 0),
      modifiers: patch.modifiers || [],
      image: patch.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      active: true
    };
    setProducts((current) => [nextProduct, ...current]);
    queueSync('Добавлена позиция меню');
    setLastMessage('Новая позиция добавлена в меню');
  };

  const deleteProduct = (id) => {
    setProducts((current) => current.filter((product) => product.id !== id));
    queueSync('Удалена позиция меню');
    setLastMessage('Позиция удалена из меню');
  };

  const clearProductsMenu = () => {
    setProducts([]);
    setCart([]);
    setSelectedCategory('Все');
    localStorage.setItem('icashbox.productsSeedVersion', productSeedVersion);
    localStorage.setItem(productCategorySeedVersionKey, productSeedVersion);
    localStorage.setItem(menuClearVersionKey, menuClearVersion);
    queueSync('Удалено меню', 'Локально');
    setLastMessage('Меню удалено');
  };

  const receiveStock = (id, amount) => {
    setStock((current) =>
      current.map((item) => (item.id === id ? { ...item, stock: roundStock(item.stock + amount) } : item))
    );
    queueSync('Приход товара');
    setLastMessage('Приход добавлен в локальный журнал');
  };

  const refundOrder = (id) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, cancelled: false, status: 'Возврат', paid: false, refunded: true } : order
      )
    );
    queueSync('Возврат заказа');
    setLastMessage(`Возврат по заказу #${id} зафиксирован`);
  };

  const isAdminPassword = (password) => {
    return accounts.some(
      (account) => account.role === 'admin' && accountPasswordMatches(account, password)
    );
  };

  const isShiftPassword = (password) => {
    const savedPassword = String(printSettings.shiftPassword || '1234').trim();
    return String(password ?? '') === savedPassword;
  };

  const requestAdminAction = ({
    action,
    confirmLabel = 'Подтвердить',
    description,
    passwordCheck = isAdminPassword,
    restrictToAdmin = true,
    title = 'Пароль администратора',
    wrongPasswordMessage = 'Неверный пароль'
  }) => {
    if (restrictToAdmin && currentUser?.role !== 'admin') {
      setLastMessage('Действие доступно только администратору');
      return;
    }
    setAdminActionAuth({ action, confirmLabel, description, error: '', password: '', passwordCheck, title, wrongPasswordMessage });
  };

  const confirmAdminAction = () => {
    if (!adminActionAuth) return;
    if (!adminActionAuth.passwordCheck(adminActionAuth.password)) {
      setAdminActionAuth((current) => ({
        ...current,
        password: '',
        error: current.wrongPasswordMessage || 'Неверный пароль'
      }));
      return;
    }
    const action = adminActionAuth.action;
    setAdminActionAuth(null);
    action?.();
  };

  const requestMenuAction = (description, action) => {
    requestAdminAction({
      action,
      confirmLabel: 'Выполнить',
      description,
      title: 'Пароль для меню'
    });
  };

  const secureAddProduct = (draft) => {
    const patch = draft ? menuDraftToProductPatch(draft) : {};
    requestMenuAction(`Добавить позицию: ${patch.name || 'Новая позиция'}`, () => addProduct(draft));
  };

  const secureUpdateProduct = (id, patch, productName, actionLabel = 'Сохранить изменения') => {
    const productLabel = productName || products.find((product) => product.id === id)?.name || 'позиция меню';
    requestMenuAction(`${actionLabel}: ${productLabel}`, () => updateProduct(id, patch));
  };

  const secureDeleteProduct = (id, productName) => {
    requestMenuAction(`Удалить позицию: ${productName || 'позиция меню'}`, () => deleteProduct(id));
  };

  const requestClearProductsMenu = () => {
    if (!products.length) {
      setLastMessage('Меню уже пустое');
      return;
    }

    setSettingsOpen(false);
    requestAdminAction({
      action: clearProductsMenu,
      confirmLabel: 'Удалить меню',
      description: `Удалить все позиции меню: ${products.length}`,
      title: 'Пароль для удаления меню'
    });
  };

  const addAccount = () => {
    if (currentUser?.role !== 'admin') {
      setLastMessage('Добавлять доступы может только администратор');
      return;
    }
    const now = Date.now();
    const nextAccount = {
      id: `account-${now}`,
      username: `user${accounts.length + 1}`,
      password: '0000',
      name: 'Новый сотрудник',
      role: 'cashier'
    };
    setAccounts((current) => [...current, nextAccount]);
    queueSync('Добавлен доступ сотрудника');
    setLastMessage('Новый сотрудник добавлен в доступы');
  };

  const updateAccount = (id, patch) => {
    if (currentUser?.role !== 'admin') {
      setLastMessage('Менять доступы может только администратор');
      return;
    }
    const target = accounts.find((account) => account.id === id);
    const nextRole = ['admin', 'cashier'].includes(patch.role ?? target?.role) ? patch.role ?? target?.role : target?.role;
    const adminCount = accounts.filter((account) => account.role === 'admin').length;
    if (target?.role === 'admin' && nextRole !== 'admin' && adminCount <= 1) {
      setLastMessage('Должен остаться хотя бы один администратор');
      return;
    }
    setAccounts((current) =>
      current.map((account) =>
        account.id === id
          ? {
              ...account,
              ...patch,
              name: String(patch.name ?? account.name).trim() || account.name,
              password: String(patch.password ?? account.password).trim() || account.password,
              role: ['admin', 'cashier'].includes(patch.role ?? account.role) ? patch.role ?? account.role : account.role,
              username: String(patch.username ?? account.username).trim() || account.username
            }
          : account
      )
    );
    queueSync('Изменён доступ сотрудника');
    setLastMessage('Доступ сотрудника обновлён');
  };

  const deleteAccount = (id) => {
    if (currentUser?.role !== 'admin') {
      setLastMessage('Удалять доступы может только администратор');
      return;
    }
    if (id === currentUser.id) {
      setLastMessage('Нельзя удалить текущий аккаунт администратора');
      return;
    }
    const target = accounts.find((account) => account.id === id);
    const adminCount = accounts.filter((account) => account.role === 'admin').length;
    if (target?.role === 'admin' && adminCount <= 1) {
      setLastMessage('Должен остаться хотя бы один администратор');
      return;
    }
    setAccounts((current) => current.filter((account) => account.id !== id));
    queueSync('Удалён доступ сотрудника');
    setLastMessage('Доступ сотрудника удалён');
  };

  const toggleRoleRight = (roleId, viewId) => {
    if (currentUser?.role !== 'admin') {
      setLastMessage('Менять права может только администратор');
      return;
    }
    if (viewId === 'roles') {
      setLastMessage('Раздел ролей доступен только администраторам');
      return;
    }

    setAccessRules((current) => {
      const nextRights = new Set(current[roleId] || []);
      if (nextRights.has(viewId)) {
        nextRights.delete(viewId);
      } else {
        nextRights.add(viewId);
      }
      if (roleId === 'admin') {
        nextRights.add('roles');
      }
      return { ...current, [roleId]: Array.from(nextRights) };
    });
    queueSync('Изменены права доступа');
    setLastMessage('Права доступа обновлены');
  };

  const requestOrderEdit = (order) => {
    if (currentUser?.role !== 'admin') {
      setLastMessage('Редактировать заказы может только администратор');
      return;
    }
    setOrderEditAuth({ orderId: order.id, password: '', error: '' });
  };

  const confirmOrderEdit = (password) => {
    if (!isAdminPassword(password)) {
      setOrderEditAuth((current) => ({ ...current, password: '', error: 'Неверный пароль администратора' }));
      return;
    }
    const order = orders.find((item) => item.id === orderEditAuth?.orderId);
    if (!order) {
      setOrderEditAuth(null);
      setLastMessage('Заказ не найден');
      return;
    }
    setOrderEditAuth(null);
    setOrderEditor(order);
  };

  const saveOrderEdit = (updatedOrder) => {
    setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? normalizeOrderStatus(updatedOrder) : order)));
    queueSync('Редактирование заказа');
    setLastMessage(`Заказ #${updatedOrder.id} обновлён администратором`);
    setOrderEditor(null);
  };

  const deleteOrder = (id) => {
    setOrders((current) => current.filter((order) => order.id !== id));
    setOrderEditor((current) => (current?.id === id ? null : current));
    queueSync('Удалён заказ');
    setLastMessage(`Заказ #${id} удалён`);
  };

  const deleteAllOrders = () => {
    setOrders([]);
    setOrderEditor(null);
    setPrintJob(null);
    setCopyRequest(null);
    setClearOrdersAuth(null);
    queueSync('Удалены все заказы');
    setLastMessage('История заказов очищена');
  };

  const requestDeleteOrder = (order) => {
    requestAdminAction({
      action: () => deleteOrder(order.id),
      confirmLabel: 'Удалить заказ',
      description: `Удалить заказ #${order.id} на ${currency.format(order.total)}`,
      title: 'Пароль для удаления заказа'
    });
  };

  const requestDeleteAllOrders = () => {
    if (!orders.length) {
      setLastMessage('История заказов уже пуста');
      return;
    }

    if (currentUser?.role !== 'admin') {
      setLastMessage('Очищать историю может только администратор');
      return;
    }

    setAdminActionAuth(null);
    setClearOrdersAuth({
      error: '',
      password: '',
      sessionId: `clear-orders-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      typed: false,
      total: orders.length
    });
  };

  const confirmClearOrdersPassword = () => {
    if (!clearOrdersAuth) return;
    if (!clearOrdersAuth.typed || !String(clearOrdersAuth.password || '').trim()) {
      setClearOrdersAuth((current) => ({ ...current, password: '', error: 'Введите пароль администратора заново' }));
      return;
    }
    if (!isAdminPassword(clearOrdersAuth.password)) {
      setClearOrdersAuth((current) => ({
        ...current,
        error: 'Неверный пароль администратора',
        password: '',
        sessionId: `clear-orders-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        typed: false
      }));
      return;
    }

    deleteAllOrders();
  };

  const exportOrders = async () => {
    try {
      const workbook = await createOrdersWorkbook(orders.map(normalizeOrderStatus), paymentMethods);
      const blob = new Blob([workbook], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `icashbox-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setLastMessage('Заказы экспортированы в XLSX');
    } catch {
      setLastMessage('Не удалось экспортировать заказы');
    }
  };

  const importOrders = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const importedOrders = await parseOrdersWorkbook(await file.arrayBuffer());
      if (!importedOrders.length) {
        throw new Error('В файле не найдены заказы');
      }

      requestAdminAction({
        action: () => {
          setOrders(importedOrders.map(normalizeOrderStatus));
          setOrderEditor(null);
          queueSync('Импорт заказов XLSX');
          setLastMessage(`Импортировано заказов: ${importedOrders.length}`);
        },
        confirmLabel: 'Импортировать',
        description: `Импортировать ${importedOrders.length} заказов из ${file.name}`,
        title: 'Пароль для импорта заказов'
      });
    } catch (error) {
      setLastMessage(error.message || 'Не удалось импортировать заказы из XLSX');
    }
  };

  const loadOrderArchive = async (archive) => {
    if (!archive?.jsonPath) return;
    if (!window.icashboxSystem?.loadOrderArchive) {
      setLastMessage('Архивы по датам доступны только в portable-версии');
      return;
    }

    try {
      const archivedOrders = await window.icashboxSystem.loadOrderArchive(archive.jsonPath);
      setLoadedArchive({ ...archive, orders: archivedOrders.map(normalizeOrderStatus) });
      setLastMessage(`Загружен архив заказов: ${archive.dateKey}`);
    } catch (error) {
      setLastMessage(error.message || 'Не удалось загрузить архив заказов');
    }
  };

  const addExpense = () => {
    const now = new Date();
    const nextExpense = {
      id: now.getTime(),
      title: 'Закупка по смене',
      category: 'Склад',
      amount: 100,
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      shiftKey: shiftKeyFromShift(shift),
      createdAt: now.toISOString()
    };
    setExpenses((current) => [nextExpense, ...current]);
    queueSync('Добавлен расход');
    setLastMessage('Расход добавлен в сменный отчёт');
  };

  const buildDatabasePayload = () => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      accessRules,
      accounts,
      products,
      stock,
      orders: orders.map(normalizeOrderStatus),
      orderArchives,
      expenses,
      paymentSettings,
      syncQueue,
      shift,
      shiftHistory
  });

  const applyDatabasePayload = (payload) => {
    if (Array.isArray(payload.accounts)) setAccounts(payload.accounts);
    if (payload.accessRules && typeof payload.accessRules === 'object') setAccessRules(payload.accessRules);
    if (Array.isArray(payload.products)) setProducts(payload.products);
    if (Array.isArray(payload.stock)) setStock(payload.stock);
    if (Array.isArray(payload.orders)) setOrders(payload.orders.map(normalizeOrderStatus));
    if (Array.isArray(payload.orderArchives)) setOrderArchives(payload.orderArchives);
    if (Array.isArray(payload.expenses)) setExpenses(payload.expenses);
    if (payload.paymentSettings && typeof payload.paymentSettings === 'object') setPaymentSettings(payload.paymentSettings);
    if (Array.isArray(payload.syncQueue)) setSyncQueue(payload.syncQueue);
    if (payload.shift) setShift(payload.shift);
    if (Array.isArray(payload.shiftHistory)) setShiftHistory(payload.shiftHistory);
  };

  const exportLocalDatabase = () => {
    const payload = buildDatabasePayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `icashbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setLastMessage('Локальная база экспортирована в JSON');
  };

  const normalizedGithubSettings = () => ({
    owner: githubSettings.owner.trim(),
    repo: githubSettings.repo.trim(),
    branch: githubSettings.branch.trim() || 'main',
    path: githubSettings.path.trim() || 'icashbox-backup.json',
    token: githubSettings.token.trim()
  });

  const githubApiRequest = async (settings, options = {}) => {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${settings.path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}?ref=${encodeURIComponent(settings.branch)}`,
      {
        ...options,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${settings.token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(options.headers || {})
        }
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `GitHub HTTP ${response.status}`);
    return payload;
  };

  const validateGithubSettings = () => {
    const settings = normalizedGithubSettings();
    if (!settings.owner || !settings.repo || !settings.token) {
      throw new Error('Заполните GitHub owner, repo и token');
    }
    return settings;
  };

  const saveDatabaseToGithub = async () => {
    try {
      const settings = validateGithubSettings();
      setLastMessage('Сохраняю базу на GitHub...');
      let sha;
      try {
        const currentFile = await githubApiRequest(settings);
        sha = currentFile.sha;
      } catch (error) {
        if (!String(error.message || '').includes('404')) throw error;
      }

      await githubApiRequest(settings, {
        method: 'PUT',
        body: JSON.stringify({
          branch: settings.branch,
          content: encodeBase64Unicode(JSON.stringify(buildDatabasePayload(), null, 2)),
          message: `Update iCashbox backup ${new Date().toISOString()}`,
          sha
        })
      });
      queueSync('Сохранение базы на GitHub', 'GitHub');
      setLastMessage('База сохранена на GitHub');
    } catch (error) {
      setLastMessage(error.message || 'Не удалось сохранить базу на GitHub');
    }
  };

  const loadDatabaseFromGithub = async () => {
    try {
      const settings = validateGithubSettings();
      setLastMessage('Загружаю базу с GitHub...');
      const file = await githubApiRequest(settings);
      const payload = JSON.parse(decodeBase64Unicode(file.content));
      applyDatabasePayload(payload);
      queueSync('Загрузка базы с GitHub', 'GitHub');
      setLastMessage('База загружена с GitHub');
    } catch (error) {
      setLastMessage(error.message || 'Не удалось загрузить базу с GitHub');
    }
  };

  const importLocalDatabase = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        applyDatabasePayload(payload);
        queueSync('Импорт локальной базы');
        setLastMessage('Локальная база импортирована');
      } catch {
        setLastMessage('Не удалось импортировать файл базы');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportMenuProducts = async () => {
    try {
      const workbook = await createPosterMenuWorkbook(products);
      const blob = new Blob([workbook], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_products_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setLastMessage('Меню экспортировано в XLSX');
    } catch {
      setLastMessage('Не удалось экспортировать меню');
    }
  };

  const importMenuProducts = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const importedProducts = await parsePosterMenuWorkbook(await file.arrayBuffer());
      if (!importedProducts.length) {
        throw new Error('В файле не найдены позиции меню');
      }

      requestMenuAction(`Импортировать ${importedProducts.length} позиций меню из ${file.name}`, () => {
        setProducts(importedProducts);
        setCart([]);
        setSelectedCategory('Все');
        queueSync('Импорт меню XLSX');
        setLastMessage(`Импортировано позиций меню: ${importedProducts.length}`);
      });
    } catch (error) {
      setLastMessage(error.message || 'Не удалось импортировать меню из XLSX');
    }
  };

  const sendToReceiptPrinter = async (order, type = 'receipt', silent = false, copies = 1) => {
    const printerName = type === 'sticker' ? printSettings.stickerPrinterName : printSettings.printerName;
    const payload = {
      copies: normalizeCopies(copies),
      order,
      printerName: printerName.trim(),
      shift,
      type
    };

    try {
      let result = { ok: true };
      if (window.icashboxPrint?.print) {
        result = await window.icashboxPrint.print(payload);
      } else {
        const response = await fetch('http://127.0.0.1:8787/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Не удалось отправить задание на принтер');
      }
      result = result || {};
      const printerLabel = result.printer ? ` (${result.printer})` : '';
      const queueLabel = Number.isFinite(result.jobCount) ? `, очередь: ${result.jobCount}` : '';
      setLastMessage(
        type === 'sticker'
          ? `Наклейки отправлены: ${countStickerLabels(order)} шт.${printerLabel}${queueLabel}`
          : `Чек отправлен на принтер: ${payload.copies} коп.${printerLabel}${queueLabel}`
      );
    } catch (error) {
      if (!silent) {
        setLastMessage(error.message || 'Print-agent не отвечает. Запустите npm run print-agent');
      }
      setPrintJob({ order, type, autoPrint: false });
    }
  };

  const requestReceiptCopies = (order) => {
    setCopyRequest({ order, type: 'receipt', copies: 1 });
  };

  const loadPrinters = async () => {
    try {
      if (window.icashboxPrint?.listPrinters) {
        setPrinters(await window.icashboxPrint.listPrinters());
      } else {
        const response = await fetch('http://127.0.0.1:8787/printers');
        const payload = await response.json();
        setPrinters(payload.printers || []);
      }
      setLastMessage('Список принтеров обновлён');
    } catch {
      setLastMessage('Print-agent не отвечает. Запустите npm run print-agent');
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <CircleDollarSign size={26} />
          </div>
          <div>
            <strong>iCashbox</strong>
            <span>Hybrid POS</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Основные разделы">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? 'nav-button active' : 'nav-button'}
                onClick={() => setActiveView(item.id)}
                title={item.label}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="sidebar-cash-button" onClick={() => setActiveView('pos')}>
          <ReceiptText size={20} />
          <span>Касса</span>
        </button>

        <div className="user-card">
          <User size={18} />
          <div>
            <strong>{currentUser.name}</strong>
            <span>{roleLabels[currentUser.role]}</span>
          </div>
          <button className="sidebar-icon-button" title="Выйти" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>

      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Автономная POS-система для кафе и ресторанов</p>
            <h1 onClick={(event) => activeView === 'orders' && event.detail >= 3 && requestDeleteAllOrders()}>
              {pageTitle(activeView)}
            </h1>
          </div>
          <div className="topbar-actions">
            <div className={shift.open ? 'shift-pill open' : 'shift-pill'}>
              <span>{currentShiftLabel}</span>
              <strong>{shift.open ? 'Открыта' : 'Закрыта'}</strong>
            </div>
            <button
              className={printSettings.autoReceipt ? 'icon-button active' : 'icon-button'}
              title={printSettings.autoReceipt ? 'Автопечать чека включена' : 'Автопечать чека выключена'}
              onClick={() =>
                setPrintSettings((current) => ({ ...current, autoReceipt: !current.autoReceipt }))
              }
            >
              <Printer size={19} />
            </button>
            <button className="icon-button" title="Уведомления">
              <Bell size={19} />
            </button>
            <button
              className="icon-button"
              title="Настройки"
              onClick={() => {
                setSettingsOpen(true);
                loadPrinters();
              }}
            >
              <Settings size={19} />
            </button>
            <button className="network-toggle" onClick={toggleNetwork}>
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
              <span>{isOnline ? 'Интернет доступен' : 'Работа без интернета'}</span>
            </button>
          </div>
        </header>

        <div className="status-strip">
          <Check size={17} />
          <span>{lastMessage}</span>
        </div>

        {activeView === 'pos' && (
          <PosView
            cart={cart}
            cartTotal={cartTotal}
            categories={categories}
            createOrder={createOrder}
            guestName={guestName}
            orderComment={orderComment}
            paidAmount={paidAmount}
            paymentMethods={paymentMethods}
            payments={payments}
            products={visibleProducts}
            search={search}
            selectedCategory={selectedCategory}
            setGuestName={setGuestName}
            setOrderComment={setOrderComment}
            setPayments={setPayments}
            setSearch={setSearch}
            setSelectedCategory={setSelectedCategory}
            shift={shift}
            updateQty={updateQty}
            addToCart={addToCart}
            clearCart={() => setCart([])}
          />
        )}
        {activeView === 'menu' && (
          <MenuManager
            addProduct={secureAddProduct}
            deleteProduct={secureDeleteProduct}
            exportMenuProducts={exportMenuProducts}
            importMenuProducts={importMenuProducts}
            products={products}
            stock={stock}
            updateProduct={secureUpdateProduct}
          />
        )}
        {activeView === 'orders' && (
          <OrderHistory
            archiveOrdersForDate={archiveOrdersForDate}
            loadedArchive={loadedArchive}
            loadOrderArchive={loadOrderArchive}
            canEditOrders={currentUser.role === 'admin'}
            orders={orders}
            orderArchives={orderArchives}
            exportOrders={exportOrders}
            importOrders={importOrders}
            printOrder={(order, type = 'receipt') => setPrintJob({ order, type, autoPrint: false })}
            requestDeleteAllOrders={requestDeleteAllOrders}
            requestDeleteOrder={requestDeleteOrder}
            requestOrderEdit={requestOrderEdit}
            requestReceiptCopies={requestReceiptCopies}
            sendToReceiptPrinter={sendToReceiptPrinter}
            paymentMethods={paymentMethods}
            shift={shift}
            shiftHistory={shiftHistory}
            refundOrder={refundOrder}
          />
        )}
        {activeView === 'inventory' && <Inventory stock={stock} receiveStock={receiveStock} />}
        {activeView === 'analytics' && (
          <Analytics
            addExpense={addExpense}
            expenses={expenses}
            orders={orders}
            paymentMethods={paymentMethods}
            shift={shift}
            shiftHistory={shiftHistory}
            requestShiftToggle={requestShiftToggle}
          />
        )}
        {activeView === 'cloud' && (
          <CloudSync
            autoLaunch={autoLaunch}
            exportDirectory={exportSettings.directory}
            exportLocalDatabase={exportLocalDatabase}
            githubSettings={githubSettings}
            importInputRef={importInputRef}
            importLocalDatabase={importLocalDatabase}
            isOnline={isOnline}
            liveUrls={liveUrls}
            loadPrinters={loadPrinters}
            loadDatabaseFromGithub={loadDatabaseFromGithub}
            printSettings={printSettings}
            printers={printers}
            saveDatabaseToGithub={saveDatabaseToGithub}
            setGithubSettings={setGithubSettings}
            setPrintSettings={setPrintSettings}
            syncQueue={syncQueue}
            selectExportDirectory={selectExportDirectory}
            toggleAutoLaunch={toggleAutoLaunch}
            toggleNetwork={toggleNetwork}
          />
        )}
        {activeView === 'roles' && (
          <Roles
            accessRules={accessRules}
            accounts={accounts}
            addAccount={addAccount}
            canManageAccess={currentUser.role === 'admin'}
            currentUserId={currentUser.id}
            deleteAccount={deleteAccount}
            printSettings={printSettings}
            paymentMethods={paymentMethods}
            paymentSettings={paymentSettings}
            setPrintSettings={setPrintSettings}
            setPaymentSettings={setPaymentSettings}
            toggleRoleRight={toggleRoleRight}
            updateAccount={updateAccount}
          />
        )}
      </main>
      {printJob && (
        <PrintModal
          order={printJob.order}
          onClose={() => setPrintJob(null)}
          onPrint={(order, type) => {
            sendToReceiptPrinter(order, type, false, 1);
            setPrintJob(null);
          }}
          shift={shift}
          type={printJob.type}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          loadPrinters={loadPrinters}
          onClearMenu={requestClearProductsMenu}
          onClose={() => setSettingsOpen(false)}
          onPushRemoteLive={() => pushRemoteLiveSnapshot(true)}
          printSettings={printSettings}
          productsCount={products.length}
          printers={printers}
          remoteLiveStatus={remoteLiveStatus}
          setPrintSettings={setPrintSettings}
        />
      )}
      {shiftCashPrompt && (
        <ShiftCashBalanceModal
          mode={shiftCashPrompt.mode}
          onChange={(value) => setShiftCashPrompt((current) => ({ ...current, value }))}
          onClose={() => setShiftCashPrompt(null)}
          onConfirm={() => {
            const value = parseCashBalance(shiftCashPrompt.value);
            const mode = shiftCashPrompt.mode;
            setShiftCashPrompt(null);
            if (mode === 'close') {
              closeShift(value);
            } else {
              openShift(value);
            }
          }}
          value={shiftCashPrompt.value}
        />
      )}
      {copyRequest && (
        <CopiesModal
          copies={copyRequest.copies}
          onChange={(copies) => setCopyRequest((current) => ({ ...current, copies: normalizeCopies(copies) }))}
          onClose={() => setCopyRequest(null)}
          onPrint={() => {
            sendToReceiptPrinter(copyRequest.order, copyRequest.type, false, copyRequest.copies);
            setCopyRequest(null);
            setPrintJob(null);
          }}
          order={copyRequest.order}
        />
      )}
      {clearOrdersAuth && (
        <AdminPasswordModal
          confirmLabel="Удалить историю"
          description={`Будут удалены все заказы: ${clearOrdersAuth.total}. Введите пароль администратора заново.`}
          disabled={!clearOrdersAuth.typed || !String(clearOrdersAuth.password || '').trim()}
          error={clearOrdersAuth.error}
          inputKey={clearOrdersAuth.sessionId}
          onChange={(password) => setClearOrdersAuth((current) => ({ ...current, error: '', password }))}
          onClose={() => setClearOrdersAuth(null)}
          onConfirm={confirmClearOrdersPassword}
          onUserInput={() => setClearOrdersAuth((current) => ({ ...current, error: '', typed: true }))}
          password={clearOrdersAuth.password}
          title="Удалить всю историю?"
        />
      )}
      {orderEditAuth && (
        <AdminPasswordModal
          error={orderEditAuth.error}
          onChange={(password) => setOrderEditAuth((current) => ({ ...current, password }))}
          onClose={() => setOrderEditAuth(null)}
          onConfirm={() => confirmOrderEdit(orderEditAuth.password)}
          password={orderEditAuth.password}
        />
      )}
      {adminActionAuth && (
        <AdminPasswordModal
          confirmLabel={adminActionAuth.confirmLabel}
          description={adminActionAuth.description}
          error={adminActionAuth.error}
          onChange={(password) => setAdminActionAuth((current) => ({ ...current, password }))}
          onClose={() => setAdminActionAuth(null)}
          onConfirm={confirmAdminAction}
          password={adminActionAuth.password}
          title={adminActionAuth.title}
        />
      )}
      {orderEditor && (
        <OrderEditModal
          onClose={() => setOrderEditor(null)}
          onSave={saveOrderEdit}
          order={orderEditor}
          paymentMethods={paymentMethods}
        />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [role, setRole] = useState('cashier');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const loginRoles = [
    { id: 'cashier', label: 'Кассир', text: 'Продажи и заказы' },
    { id: 'admin', label: 'Админ', text: 'Полный доступ' }
  ];
  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

  const submitLogin = (event) => {
    event.preventDefault();
    const ok = onLogin({ role, password });
    if (!ok) setError('Неверный пароль');
  };

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Вход в iCashbox">
        <div className="brand login-brand">
          <div className="brand-mark">
            <CircleDollarSign size={26} />
          </div>
          <div>
            <strong>iCashbox</strong>
            <span>Hybrid POS</span>
          </div>
        </div>
        <div className="login-heading">
          <p className="eyebrow">Локальный вход</p>
          <h1>Выберите роль</h1>
        </div>
        <form className="login-form" onSubmit={submitLogin}>
          <div className="login-role-grid" role="group" aria-label="Роль пользователя">
            {loginRoles.map((item) => (
              <button
                className={role === item.id ? 'login-role active' : 'login-role'}
                key={item.id}
                type="button"
                onClick={() => {
                  setRole(item.id);
                  setPassword('');
                  setError('');
                }}
              >
                <strong>{item.label}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
          <label>
            <span>Пароль</span>
            <div className="login-input">
              <KeyRound size={18} />
              <input
                autoComplete="current-password"
                inputMode="numeric"
                placeholder="PIN"
                readOnly
                type="password"
                value={password}
              />
            </div>
          </label>
          <div className="pin-keypad" aria-label="Цифровая клавиатура">
            {keypad.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setError('');
                  if (key === 'clear') {
                    setPassword('');
                  } else if (key === 'back') {
                    setPassword((value) => value.slice(0, -1));
                  } else {
                    setPassword((value) => `${value}${key}`.slice(0, 8));
                  }
                }}
              >
                {key === 'clear' ? 'Сброс' : key === 'back' ? '←' : key}
              </button>
            ))}
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-action" type="submit">
            <ShieldCheck size={18} />
            <span>Войти</span>
          </button>
        </form>
      </section>
    </main>
  );
}

function PosView({
  cart,
  cartTotal,
  categories,
  createOrder,
  guestName,
  orderComment,
  paidAmount,
  paymentMethods,
  payments,
  products,
  search,
  selectedCategory,
  setOrderComment,
  setPayments,
  setGuestName,
  setSearch,
  setSelectedCategory,
  shift,
  updateQty,
  addToCart,
  clearCart
}) {
  const [paymentEditorMethod, setPaymentEditorMethod] = useState(null);
  const [sizeChooser, setSizeChooser] = useState(null);
  const currentShiftLabel = shiftLabel(shift);
  const remainingAmount = Math.max(0, roundPayment(cartTotal - paidAmount));
  const changeAmount = Math.max(0, roundPayment(paidAmount - cartTotal));
  const paymentComplete = paidAmount >= cartTotal && cartTotal > 0;
  const canPayOrder = cart.length > 0 && shift.open && paymentComplete;
  const productGroups = useMemo(() => {
    const groups = new Map();

    products.forEach((product) => {
      const key = productVariantKey(product);
      const current = groups.get(key) || [];
      current.push(product);
      groups.set(key, current);
    });

    return Array.from(groups.values()).map((items) => sortProductVariants(items));
  }, [products]);
  const updatePaymentAmount = (method, value) => {
    setPayments({ ...payments, [method]: roundPayment(value) });
  };
  const selectProduct = (variants) => {
    if (variants.length <= 1) {
      addToCart(variants[0]);
      return;
    }

    setSizeChooser({ variants });
  };

  return (
    <>
      <section className="pos-layout">
        <div className="catalog-panel">
          <div className="section-row">
            <div>
              <h2>Меню</h2>
              <p>Категории, размеры, модификаторы и стоп-лист</p>
            </div>
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Поиск блюда" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>

          <div className="segmented">
            {categories.map((category) => (
              <button
                key={category}
                className={selectedCategory === category ? 'selected' : ''}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {productGroups.length === 0 && <div className="empty-state">Меню пустое</div>}
            {productGroups.map((variants) => {
              const product = variants[0];
              const title = productBaseName(product.name) || product.name;
              const minPrice = Math.min(...variants.map((item) => Number(item.price || 0)));
              const maxPrice = Math.max(...variants.map((item) => Number(item.price || 0)));

              return (
              <button className="product-card" key={productVariantKey(product)} onClick={() => selectProduct(variants)}>
                <img src={product.image} alt="" />
                <span className="product-category">{product.category}</span>
                <strong>{title}</strong>
                <span>{variants.length > 1 ? `${variants.length} объема` : product.size}</span>
                <b>{minPrice === maxPrice ? currency.format(minPrice) : `${currency.format(minPrice)} - ${currency.format(maxPrice)}`}</b>
              </button>
              );
            })}
          </div>
        </div>

        <aside className="ticket-panel">
          <div className="section-row compact">
            <div>
              <h2>Заказ</h2>
              <p>Кассовая продажа · {currentShiftLabel}</p>
            </div>
            <button className="icon-button" title="Очистить заказ" onClick={clearCart}>
              <X size={18} />
            </button>
          </div>

          <div className="cart-list">
            {cart.length === 0 && <div className="empty-state">Выберите позиции из меню</div>}
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  {item.size && <span>{item.size}</span>}
                </div>
                <div className="qty-control">
                  <button title="Уменьшить" onClick={() => updateQty(item.id, -1)}>
                    <Minus size={14} />
                  </button>
                  <span>{item.qty}</span>
                  <button title="Добавить" onClick={() => updateQty(item.id, 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <b>{currency.format(item.price * item.qty)}</b>
              </div>
            ))}
          </div>

          <div className="payments">
            <label className="comment-field">
              <span>Имя гостя для стикера</span>
              <input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Например: Азиза"
              />
            </label>
            <label className="comment-field">
              <span>Комментарий к заказу</span>
              <input
                value={orderComment}
                onChange={(event) => setOrderComment(event.target.value)}
                placeholder="Например: без лука, срочно"
              />
            </label>
            <div className="payment-summary-grid">
              <div>
                <span>К оплате</span>
                <strong>{currency.format(cartTotal)}</strong>
              </div>
              <div>
                <span>Остаток</span>
                <strong>{currency.format(remainingAmount)}</strong>
              </div>
              <div>
                <span>Сдача</span>
                <strong>{currency.format(changeAmount)}</strong>
              </div>
            </div>
            <div className="payment-method-buttons">
              {paymentMethods.map((method) => {
                const logo = paymentButtonLogos[method];

                return (
                  <button
                    className={Number(payments[method] || 0) > 0 ? 'payment-method-button active' : 'payment-method-button'}
                    key={method}
                    type="button"
                    disabled={!cartTotal}
                    onClick={() => setPaymentEditorMethod(method)}
                  >
                    {logo ? (
                      <span className="payment-method-logo-frame">
                        <img className="payment-method-logo" src={logo.src} alt={logo.alt} />
                      </span>
                    ) : (
                      <span className="payment-method-label">{paymentMethodLabel(method)}</span>
                    )}
                    <strong>{currency.format(payments[method] || 0)}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ticket-total">
            <span>Итого</span>
            <strong>{currency.format(cartTotal)}</strong>
          </div>
          <div className={paymentComplete ? 'payment-status done' : 'payment-status'}>
            {paymentComplete ? `Оплачено: ${currency.format(paidAmount)}` : `Осталось: ${currency.format(remainingAmount)}`}
          </div>
          <button className="primary-action" disabled={!canPayOrder} onClick={createOrder}>
            <Check size={19} />
            <span>{shift.open ? 'Оплатить' : 'Откройте смену'}</span>
          </button>
        </aside>
      </section>
      {paymentEditorMethod && (
        <PaymentAmountModal
          cartTotal={cartTotal}
          label={paymentMethodLabel(paymentEditorMethod)}
          method={paymentEditorMethod}
          onClose={() => setPaymentEditorMethod(null)}
          onSave={(value) => {
            updatePaymentAmount(paymentEditorMethod, value);
            setPaymentEditorMethod(null);
          }}
          remainingAmount={remainingAmount}
          value={payments[paymentEditorMethod] || 0}
        />
      )}
      {sizeChooser && (
        <SizeChoiceModal
          onClose={() => setSizeChooser(null)}
          onSelect={(product) => {
            addToCart(product);
            setSizeChooser(null);
          }}
          variants={sizeChooser.variants}
        />
      )}
    </>
  );
}

function SizeChoiceModal({ onClose, onSelect, variants }) {
  const product = variants[0];
  const title = productBaseName(product.name) || product.name;

  return (
    <div className="modal-backdrop">
      <section className="size-choice-modal" aria-label="Выбор объема">
        <div className="section-row compact">
          <div>
            <h2>{title}</h2>
            <p>Выберите объем</p>
          </div>
          <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="size-choice-list">
          {variants.map((item, index) => (
            <button key={item.id} type="button" onClick={() => onSelect(item)}>
              <div>
                <strong>{productSizeChoiceLabel(item, index, variants.length)}</strong>
                <span>{item.size || item.category}</span>
              </div>
              <b>{currency.format(item.price)}</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function PaymentAmountModal({ cartTotal, label, method, onClose, onSave, remainingAmount, value }) {
  const [draft, setDraft] = useState(String(value || 0));
  const logo = paymentButtonLogos[method];
  const amountToClose = roundPayment(Number(value || 0) + remainingAmount);
  const quickValues = [
    ['Остаток', amountToClose],
    ['Вся сумма', cartTotal],
    ['Очистить', 0]
  ];

  useEffect(() => {
    setDraft(String(value || 0));
  }, [method, value]);

  const submit = (event) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <div className="modal-backdrop">
      <section className="payment-amount-modal" aria-label="Ввод суммы оплаты">
        <form className="payment-amount-form" onSubmit={submit}>
          <div className="section-row compact">
            <div>
              <h2 className={logo ? 'payment-amount-logo-title' : undefined}>
                {logo ? (
                  <>
                    <img src={logo.src} alt={logo.alt} />
                    <span>{label}</span>
                  </>
                ) : (
                  label
                )}
              </h2>
              <p>Введите сумму для этого способа оплаты</p>
            </div>
            <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <label className="payment-amount-field">
            <span>Сумма</span>
            <input
              autoFocus
              inputMode="decimal"
              min="0"
              step="1"
              type="number"
              value={draft}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>

          <div className="payment-amount-presets">
            {quickValues.map(([title, amount]) => (
              <button key={title} type="button" onClick={() => setDraft(String(amount))}>
                <span>{title}</span>
                <strong>{currency.format(amount)}</strong>
              </button>
            ))}
          </div>

          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={onClose}>
              <X size={18} />
              <span>Отмена</span>
            </button>
            <button className="primary-action" type="submit">
              <Check size={18} />
              <span>Готово</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function productToMenuDraft(product = {}) {
  return {
    category: product.category || '',
    image: product.image || '',
    modifiers: (product.modifiers || []).join(', '),
    name: product.name || '',
    price: product.price == null ? '' : String(product.price),
    size: product.size || ''
  };
}

function menuDraftToProductPatch(draft) {
  const price = Number(String(draft.price ?? '').replace(',', '.'));
  return {
    category: draft.category.trim() || 'Меню',
    image: draft.image.trim(),
    modifiers: String(draft.modifiers ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    name: draft.name.trim() || 'Без названия',
    price: Number.isFinite(price) ? Math.max(0, price) : 0,
    size: draft.size.trim()
  };
}

function menuDraftChanged(product, draft) {
  const patch = menuDraftToProductPatch(draft);
  return (
    patch.category !== (product.category || '') ||
    patch.image !== (product.image || '') ||
    JSON.stringify(patch.modifiers) !== JSON.stringify(product.modifiers || []) ||
    patch.name !== (product.name || '') ||
    patch.price !== Number(product.price || 0) ||
    patch.size !== (product.size || '')
  );
}

function MenuManager({ addProduct, deleteProduct, exportMenuProducts, importMenuProducts, products, stock, updateProduct }) {
  const [uploadingId, setUploadingId] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [productCreatorOpen, setProductCreatorOpen] = useState(false);
  const menuImportInputRef = useRef(null);
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(products.map((product) => [product.id, productToMenuDraft(product)]))
  );
  const visibleProducts = products.filter((product) =>
    [product.name, product.category, product.size, ...(product.modifiers || [])]
      .join(' ')
      .toLowerCase()
      .includes(menuSearch.trim().toLowerCase())
  );

  useEffect(() => {
    setDrafts(Object.fromEntries(products.map((product) => [product.id, productToMenuDraft(product)])));
  }, [products]);

  const updateDraft = (product, patch) => {
    setDrafts((current) => ({
      ...current,
      [product.id]: {
        ...(current[product.id] || productToMenuDraft(product)),
        ...patch
      }
    }));
  };

  const uploadProductImage = async (product, file) => {
    if (!file) return;
    setUploadingId(product.id);
    try {
      const image = await menuImageFileToDataUrl(file);
      updateProduct(product.id, { image }, product.name, 'Сохранить фото');
    } catch (error) {
      window.alert(error.message || 'Не удалось сохранить фото');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2>Управление меню</h2>
          <p>Названия, категории, размеры, цены, фото и стоп-лист</p>
        </div>
        <div className="section-actions">
          <button className="secondary-action" onClick={exportMenuProducts}>
            <Download size={18} />
            <span>Экспорт XLSX</span>
          </button>
          <button className="secondary-action" onClick={() => menuImportInputRef.current?.click()}>
            <Upload size={18} />
            <span>Импорт XLSX</span>
          </button>
          <input
            ref={menuImportInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={importMenuProducts}
            hidden
          />
          <button className="secondary-action" onClick={() => setProductCreatorOpen(true)}>
            <Plus size={18} />
            <span>Позиция</span>
          </button>
        </div>
      </div>
      <div className="menu-search-row">
        <div className="search-box">
          <Search size={17} />
          <input
            placeholder="Поиск по меню"
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="menu-grid">
        {visibleProducts.length === 0 && (
          <div className="empty-state">{products.length ? 'Поиск ничего не нашёл' : 'Меню пустое'}</div>
        )}
        {visibleProducts.map((product) => {
          const draft = drafts[product.id] || productToMenuDraft(product);
          const draftLabel = draft.name.trim() || product.name || 'позиция меню';
          const hasDraftChanges = menuDraftChanged(product, draft);
          const productDetails = [product.size, (product.modifiers || []).join(', ')].filter(Boolean).join(' · ');

          return (
            <article className={product.active ? 'menu-card' : 'menu-card paused'} key={product.id}>
              <img src={product.image} alt="" />
              <div className="menu-card-main">
                <span className="product-category">{product.category}</span>
                <h3>{product.name}</h3>
                {productDetails && <p>{productDetails}</p>}
                <RecipePreview productId={product.id} stock={stock} />
              </div>
              <div className="menu-edit-fields">
                <label>
                  <span>Название</span>
                  <input
                    value={draft.name}
                    onChange={(event) => updateDraft(product, { name: event.target.value })}
                  />
                </label>
                <label>
                  <span>Категория</span>
                  <input
                    value={draft.category}
                    onChange={(event) => updateDraft(product, { category: event.target.value })}
                  />
                </label>
                <label>
                  <span>Размер</span>
                  <input
                    value={draft.size}
                    onChange={(event) => updateDraft(product, { size: event.target.value })}
                  />
                </label>
                <label>
                  <span>Цена</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.price}
                    onChange={(event) => updateDraft(product, { price: event.target.value })}
                  />
                </label>
                <label className="wide-field">
                  <span>Модификаторы</span>
                  <input
                    value={draft.modifiers}
                    onChange={(event) => updateDraft(product, { modifiers: event.target.value })}
                  />
                </label>
              </div>
              <div className="menu-actions">
                <button
                  className="primary-action"
                  disabled={!hasDraftChanges}
                  onClick={() =>
                    updateProduct(product.id, menuDraftToProductPatch(draft), draftLabel, 'Сохранить изменения')
                  }
                >
                  <Save size={17} />
                  <span>Сохранить</span>
                </button>
                <label className="secondary-action file-action">
                  <Upload size={17} />
                  <span>{uploadingId === product.id ? 'Сохраняю' : 'Фото'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      uploadProductImage(product, event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </label>
                <button
                  className={product.active ? 'secondary-action' : 'primary-action'}
                  onClick={() =>
                    updateProduct(
                      product.id,
                      { active: !product.active },
                      product.name,
                      product.active ? 'Поставить в стоп' : 'Вернуть в меню'
                    )
                  }
                >
                  {product.active ? <X size={17} /> : <Check size={17} />}
                  <span>{product.active ? 'Стоп' : 'Вернуть'}</span>
                </button>
                <button className="secondary-action danger-action" onClick={() => deleteProduct(product.id, product.name)}>
                  <Trash2 size={17} />
                  <span>Удалить</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {productCreatorOpen && (
        <ProductCreateModal
          onClose={() => setProductCreatorOpen(false)}
          onSave={(draft) => {
            addProduct(draft);
            setProductCreatorOpen(false);
          }}
        />
      )}
    </section>
  );
}

function ProductCreateModal({ onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    category: 'Меню',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    modifiers: '',
    name: '',
    price: '',
    size: 'порция'
  }));

  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const submit = (event) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <div className="modal-backdrop">
      <section className="product-create-modal" aria-label="Новая позиция меню">
        <form className="product-create-form" onSubmit={submit}>
          <div className="section-row compact">
            <div>
              <h2>Карточка товара</h2>
              <p>Заполните позицию меню перед добавлением</p>
            </div>
            <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="product-create-layout">
            <div className="product-create-preview">
              <img src={draft.image} alt="" />
              <span className="product-category">{draft.category || 'Меню'}</span>
              <strong>{draft.name || 'Новая позиция'}</strong>
              <small>{draft.size || 'порция'}</small>
              <b>{currency.format(Number(draft.price || 0))}</b>
            </div>
            <div className="menu-edit-fields product-create-fields">
              <label>
                <span>Название</span>
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  placeholder="Например: Латте"
                />
              </label>
              <label>
                <span>Категория</span>
                <input
                  value={draft.category}
                  onChange={(event) => updateDraft({ category: event.target.value })}
                  placeholder="Кофе"
                />
              </label>
              <label>
                <span>Размер</span>
                <input
                  value={draft.size}
                  onChange={(event) => updateDraft({ size: event.target.value })}
                  placeholder="350 мл"
                />
              </label>
              <label>
                <span>Цена</span>
                <input
                  type="number"
                  min="0"
                  value={draft.price}
                  onChange={(event) => updateDraft({ price: event.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="wide-field">
                <span>Модификаторы</span>
                <input
                  value={draft.modifiers}
                  onChange={(event) => updateDraft({ modifiers: event.target.value })}
                  placeholder="Сироп, сахар, альтернативное молоко"
                />
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={onClose}>
              <X size={18} />
              <span>Отмена</span>
            </button>
            <button className="primary-action" type="submit">
              <Save size={18} />
              <span>Добавить</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RecipePreview({ productId, stock }) {
  const ingredients = recipes[productId] || [];
  return (
    <div className="recipe-preview">
      {ingredients.map((line) => {
        const ingredient = stock.find((item) => item.id === line.ingredientId);
        return (
          <span key={line.ingredientId}>
            {ingredient?.name}: {line.qty} {ingredient?.unit}
          </span>
        );
      })}
    </div>
  );
}

function OrderHistory({
  archiveOrdersForDate,
  loadedArchive,
  loadOrderArchive,
  canEditOrders,
  orders,
  orderArchives,
  exportOrders,
  importOrders,
  paymentMethods,
  printOrder,
  refundOrder,
  requestDeleteAllOrders,
  requestDeleteOrder,
  requestOrderEdit,
  requestReceiptCopies,
  sendToReceiptPrinter,
  shift,
  shiftHistory
}) {
  const orderImportInputRef = useRef(null);
  const historyTitleClickRef = useRef({ count: 0, lastAt: 0 });
  const currentShiftKey = shiftKeyFromShift(shift);
  const reports = useMemo(
    () => buildShiftReports(orders, [], shiftHistory, shift, paymentMethods),
    [orders, paymentMethods, shift, shiftHistory]
  );
  const [selectedShiftKey, setSelectedShiftKey] = useState(currentShiftKey);
  const archiveOptions = orderArchives || [];
  const isArchiveSelected = selectedShiftKey.startsWith('archive:');
  const selectedArchiveKey = isArchiveSelected ? selectedShiftKey.slice('archive:'.length) : '';

  useEffect(() => {
    if (
      !isArchiveSelected &&
      !reports.some((report) => report.key === selectedShiftKey)
    ) {
      setSelectedShiftKey(currentShiftKey);
    }
  }, [currentShiftKey, isArchiveSelected, reports, selectedShiftKey]);

  useEffect(() => {
    if (!isArchiveSelected) return;
    const archive = archiveOptions.find((item) => item.dateKey === selectedArchiveKey);
    if (archive && loadedArchive?.dateKey !== archive.dateKey) {
      loadOrderArchive(archive);
    }
  }, [archiveOptions, isArchiveSelected, loadOrderArchive, loadedArchive?.dateKey, selectedArchiveKey]);

  const selectedReport = reports.find((report) => report.key === selectedShiftKey) || reports[0];
  const selectedArchive = archiveOptions.find((item) => item.dateKey === selectedArchiveKey);
  const visibleOrders = isArchiveSelected
    ? loadedArchive?.dateKey === selectedArchiveKey
      ? loadedArchive.orders || []
      : []
    : orders.filter((order) => orderShiftKey(order, shift) === selectedReport?.key);
  const selectedLabel = isArchiveSelected ? selectedArchive?.label || selectedArchiveKey : selectedReport?.label || shiftLabel(shift);
  const handleHistoryTitleClick = () => {
    const now = Date.now();
    const previous = historyTitleClickRef.current;
    const nextCount = now - previous.lastAt <= 900 ? previous.count + 1 : 1;

    if (nextCount >= 3) {
      historyTitleClickRef.current = { count: 0, lastAt: 0 };
      requestDeleteAllOrders?.();
      return;
    }

    historyTitleClickRef.current = { count: nextCount, lastAt: now };
  };

  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2 onClick={handleHistoryTitleClick}>История заказов</h2>
          <p>{selectedLabel} · контроль оплат, возвратов и комментариев</p>
        </div>
        <div className="section-actions">
          <label className="history-shift-filter">
            <span>Смена</span>
            <select value={selectedShiftKey} onChange={(event) => setSelectedShiftKey(event.target.value)}>
              {reports.map((report) => (
                <option key={report.key} value={report.key}>
                  {report.label}{report.open ? ' · открыта' : ''}
                </option>
              ))}
              {archiveOptions.map((archive) => (
                <option key={archive.dateKey} value={`archive:${archive.dateKey}`}>
                  {archive.label || `Отчет ${archive.dateKey}`}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-action" onClick={exportOrders}>
            <Download size={18} />
            <span>Экспорт XLSX</span>
          </button>
          {canEditOrders && (
            <>
              <button className="secondary-action" onClick={() => orderImportInputRef.current?.click()}>
                <Upload size={18} />
                <span>Импорт XLSX</span>
              </button>
              <input
                ref={orderImportInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={importOrders}
                hidden
              />
            </>
          )}
        </div>
      </div>
      <div className="order-history">
        {visibleOrders.length === 0 && <div className="empty-state">Заказов за эту смену пока нет</div>}
        {visibleOrders.map((order) => (
          <article className="history-card" key={order.id}>
            <div className="history-main">
              <div className="order-head">
                <strong>#{order.id}</strong>
                <span className={orderStatusClass(orderDisplayStatus(order))}>{orderDisplayStatus(order)}</span>
              </div>
              <p>
                {order.type} · {order.table} · {order.shiftLabel || selectedLabel} ·{' '}
                {currency.format(order.total)}
              </p>
              {order.guestName && <p className="order-comment">Гость: {order.guestName}</p>}
              {order.comment && <p className="order-comment">{order.comment}</p>}
              <ul>
                {order.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="history-actions">
              <button className="secondary-action" onClick={() => printOrder(order, 'receipt')}>
                <Printer size={17} />
                <span>Чек</span>
              </button>
              <button className="secondary-action" onClick={() => requestReceiptCopies(order)}>
                <ReceiptText size={17} />
                <span>Печать</span>
              </button>
              <button className="secondary-action" onClick={() => sendToReceiptPrinter(order, 'sticker')}>
                <Printer size={17} />
                <span>Стикер</span>
              </button>
              {canEditOrders && !isArchiveSelected && (
                <button className="secondary-action" onClick={() => requestOrderEdit(order)}>
                  <Pencil size={17} />
                  <span>Правка</span>
                </button>
              )}
              <button className="secondary-action" disabled={isArchiveSelected || order.refunded} onClick={() => refundOrder(order.id)}>
                <Undo2 size={17} />
                <span>Возврат</span>
              </button>
              {canEditOrders && !isArchiveSelected && (
                <button className="secondary-action danger-action" onClick={() => requestDeleteOrder(order)}>
                  <Trash2 size={17} />
                  <span>Удалить</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Inventory({ stock, receiveStock }) {
  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2>Складской учёт</h2>
          <p>Остатки, минимальные значения, закупочные цены и движения</p>
        </div>
        <button className="secondary-action">
          <PackagePlus size={18} />
          <span>Поставщики</span>
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ингредиент</th>
              <th>Остаток</th>
              <th>Минимум</th>
              <th>Закупка</th>
              <th>Статус</th>
              <th>Приход</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.stock} {item.unit}</td>
                <td>{item.min} {item.unit}</td>
                <td>{currency.format(item.cost)}</td>
                <td>
                  <span className={item.stock <= item.min ? 'badge danger' : 'badge'}>
                    {item.stock <= item.min ? 'Низко' : 'В норме'}
                  </span>
                </td>
                <td>
                  <button className="mini-button" onClick={() => receiveStock(item.id, item.unit === 'шт' ? 10 : 1)}>
                    <Plus size={15} />
                    <span>{item.unit === 'шт' ? '+10' : '+1'}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Analytics({ addExpense, expenses, orders, paymentMethods, shift, shiftHistory, requestShiftToggle }) {
  const currentShiftKey = shiftKeyFromShift(shift);
  const reports = useMemo(
    () => buildShiftReports(orders, expenses, shiftHistory, shift, paymentMethods),
    [expenses, orders, paymentMethods, shift, shiftHistory]
  );
  const [selectedShiftKey, setSelectedShiftKey] = useState(currentShiftKey);
  const [reportExporting, setReportExporting] = useState(false);

  useEffect(() => {
    if (!reports.some((report) => report.key === selectedShiftKey)) {
      setSelectedShiftKey(currentShiftKey);
    }
  }, [currentShiftKey, reports, selectedShiftKey]);

  const selectedReport = reports.find((report) => report.key === selectedShiftKey) || reports[0];
  const {
    activeOrders = [],
    average = 0,
    expenseTotal = 0,
    orders: periodOrders = [],
    paid = 0,
    paymentTotals = [],
    refundTotal = 0,
    revenue = 0
  } = selectedReport?.summary || summarizePeriod([], [], paymentMethods);
  const paymentOrderGroups = paymentMethods.map((method) => {
    const methodOrders = activeOrders.filter((order) => orderHasNetPayment(order, method, paymentMethods));
    return {
      method,
      orders: methodOrders,
      total: methodOrders.reduce((sum, order) => sum + netOrderPayment(order, method, paymentMethods), 0)
    };
  });
  const currentReport = reports.find((report) => report.key === currentShiftKey);
  const {
    activeOrders: currentActiveOrders = [],
    average: currentAverage = 0,
    orders: currentPeriodOrders = [],
    paid: currentPaid = 0,
    paymentTotals: currentPaymentTotals = [],
    refundTotal: currentRefundTotal = 0,
    revenue: currentRevenue = 0
  } = currentReport?.summary || summarizePeriod([], [], paymentMethods);
  const currentReportShift = {
    cashier: shift.cashier,
    closedAt: currentReport?.closedAt || shift.closedAt,
    closingCashBalance: currentReport?.closingCashBalance ?? shift.closingCashBalance,
    number: normalizeShiftNumber(shift.number),
    open: shift.open,
    openedAt: shift.openedAt,
    openingCashBalance: currentReport?.openingCashBalance ?? shift.openingCashBalance,
    shiftKey: currentShiftKey
  };
  const downloadCurrentReport = (paymentFilter = null) =>
    downloadAnalyticsReportPdf({
      activeOrders: currentActiveOrders,
      average: currentAverage,
      paid: currentPaid,
      paymentFilter,
      paymentMethods,
      paymentTotals: currentPaymentTotals,
      revenue: currentRevenue,
      shift: currentReportShift
    });

  const downloadCurrentReportBundle = async () => {
    if (reportExporting) return;
    setReportExporting(true);

    try {
      const datePart = currentShiftKey || localDateKey();
      const shiftNumber = normalizeShiftNumber(currentReportShift.number).replace('.', '-');
      const workbook = await createOrdersWorkbook(currentPeriodOrders.map(normalizeOrderStatus), paymentMethods);

      downloadBlob(
        new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `icashbox-shift-${shiftNumber}-${datePart}.xlsx`
      );
      await downloadCurrentReport();
    } finally {
      setReportExporting(false);
    }
  };

  const stats = [
    ['Чистая прибыль', currentRevenue, BarChart3],
    ['Оплачено', currentPaid, CreditCard],
    ['Средний чек', currentAverage, ReceiptText]
  ];
  return (
    <section className="analytics">
      <div className="section-row analytics-report-row">
        <div>
          <h2>Отчёты по смене</h2>
          <p>{shiftTimingLine(currentReport, shift)}</p>
        </div>
        <div className="report-period-actions">
          <button className="secondary-action" disabled={reportExporting} onClick={downloadCurrentReportBundle}>
            <Download size={18} />
            <span>{reportExporting ? 'Выгрузка...' : 'PDF + Excel'}</span>
          </button>
        </div>
      </div>
      <div className="metric-grid">
        {stats.map(([label, value, Icon]) => (
          <article className="metric-card" key={label}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{currency.format(value)}</strong>
          </article>
        ))}
      </div>
      <div className="analytics-grid">
        <div className="data-section">
          <div className="section-row">
            <div>
              <h2>Отчёт по оплатам</h2>
              <p>{shiftLabel(shift)} · только текущая смена</p>
            </div>
          </div>
          <div className="payment-report">
            {currentPaymentTotals.map(([method, value]) => (
              <div key={method}>
                <PaymentMethodTitle method={method} />
                <strong>{currency.format(value)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="data-section shift-section">
          <div>
            <h2>Управление сменой</h2>
            <p>{shiftTimingLine(currentReport, shift)} · кассир: {shift.cashier}</p>
          </div>
          <div className="shift-summary">
            <div><span>Заказы</span><strong>{currentPeriodOrders.length}</strong></div>
            <div><span>Возвраты</span><strong>{currency.format(currentRefundTotal)}</strong></div>
            <div><span>Остаток при открытии</span><strong>{currency.format(currentReport?.openingCashBalance || 0)}</strong></div>
            <div><span>Остаток при закрытии</span><strong>{currentReport?.closingCashBalance == null ? '-' : currency.format(currentReport.closingCashBalance)}</strong></div>
          </div>
          <button className="primary-action" onClick={requestShiftToggle}>
            {shift.open ? <Save size={18} /> : <Check size={18} />}
            <span>{shift.open ? 'Закрыть смену' : 'Открыть смену'}</span>
          </button>
        </div>
      </div>
      <div className="data-section shift-history-section">
        <div className="section-row">
          <div>
            <h2>История смен</h2>
            <p>Дневные итоги сохраняются при закрытии смены и дополняются заказами за день</p>
          </div>
        </div>
        <div className="shift-history-list">
          {reports.map((report) => (
            <button
              className={report.key === selectedReport?.key ? 'shift-history-row selected' : 'shift-history-row'}
              key={report.key}
              type="button"
              onClick={() => setSelectedShiftKey(report.key)}
            >
              <div>
                <strong>{report.label}</strong>
                <span>
                  {report.open
                    ? 'Открыта'
                    : report.closedAt
                      ? `Закрыта ${toDate(report.closedAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}`
                      : 'Без закрытия'}
                </span>
              </div>
              <span>{report.summary.orders.length} заказов</span>
              <span>{report.cashier}</span>
              <b>{currency.format(report.summary.revenue)}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="data-section shift-detail-section">
        <div className="section-row">
          <div>
            <h2>Детализация смены</h2>
            <p>{selectedReport?.label || shiftLabel(shift)} · оплаты и все заказы</p>
          </div>
          <div className="shift-detail-total">
            <span>Итого смены</span>
            <strong>{currency.format(revenue)}</strong>
          </div>
        </div>
        <div className="shift-payment-detail">
          {paymentTotals.map(([method, value]) => {
            const logo = paymentButtonLogos[method];

            return (
              <div className={`shift-payment-card method-${methodSlug(method)}`} key={method}>
                <span className="shift-payment-card-label">
                  {logo ? <img src={logo.src} alt={logo.alt} /> : paymentMethodLabel(method)}
                </span>
                <strong>{currency.format(value)}</strong>
                <small>{value > 0 ? 'Есть оплаты' : 'Без оплат'}</small>
              </div>
            );
          })}
        </div>
        <div className="shift-order-detail">
          {activeOrders.length === 0 && <div className="empty-state">Оплаченных заказов за эту смену пока нет</div>}
          {paymentOrderGroups.map(({ method, orders: methodOrders, total }) => (
            <section className={`shift-payment-orders method-${methodSlug(method)}`} key={method}>
              <div className="shift-payment-orders-head">
                <strong>
                  <PaymentMethodTitle method={method} />
                </strong>
                <span>{methodOrders.length} заказов</span>
                <b>{currency.format(total)}</b>
              </div>
              {methodOrders.length === 0 && <div className="empty-state">Оплат этим способом нет</div>}
              {methodOrders.map((order) => {
                const methodAmount = netOrderPayment(order, method, paymentMethods);

                return (
                  <article className="shift-order-row" key={`${method}-${order.id}`}>
                    <div className="shift-order-id">
                      <strong>#{order.id}</strong>
                      <span className={orderStatusClass(orderDisplayStatus(order))}>{orderDisplayStatus(order)}</span>
                    </div>
                    <div className="shift-order-main">
                      <p>{(order.items || []).join(', ') || 'Без позиций'}</p>
                      <span>{order.guestName ? `Гость: ${order.guestName}` : order.type || 'Продажа'}</span>
                    </div>
                    <div className="shift-order-payments">
                      <span className="shift-order-payment-chip">Время · {formatOrderTime(order.createdAt)}</span>
                    </div>
                    <b>{currency.format(methodAmount)}</b>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </div>
      {showShiftExpensesSection && (
        <div className="data-section expenses-section">
          <div className="section-row">
            <div>
              <h2>Расходы смены</h2>
              <p>Закупки, логистика и операционные траты</p>
            </div>
            <button className="secondary-action" onClick={addExpense}>
              <Plus size={18} />
              <span>Расход</span>
            </button>
          </div>
          <div className="expense-list">
            {expenses.map((expense) => (
              <div key={expense.id}>
                <span>{expense.time}</span>
                <strong>{expense.title}</strong>
                <small>{expense.category}</small>
                <b>{currency.format(expense.amount)}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

async function downloadAnalyticsReportPdf({
  activeOrders,
  average,
  paid,
  paymentFilter = null,
  paymentMethods = defaultPaymentMethods,
  paymentTotals,
  revenue,
  shift
}) {
  const reportDate = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const reportOrders = paymentFilter
    ? activeOrders.filter((order) => orderHasNetPayment(order, paymentFilter, paymentMethods))
    : activeOrders;
  const filteredPaymentTotal = paymentFilter
    ? reportOrders.reduce((sum, order) => sum + netOrderPayment(order, paymentFilter, paymentMethods), 0)
    : 0;
  const reportRevenue = paymentFilter ? filteredPaymentTotal : revenue;
  const reportPaid = paymentFilter ? filteredPaymentTotal : paid;
  const reportAverage = Math.round(reportRevenue / Math.max(reportOrders.length, 1));
  const unpaid = Math.max(0, reportRevenue - reportPaid);
  const reportShiftLabel = shiftLabel(shift);
  const filterLabel = paymentFilter ? paymentMethodLabel(paymentFilter) : 'Все способы оплаты';
  const reportTitle = paymentFilter ? `${reportShiftLabel}: ${filterLabel}` : reportShiftLabel;
  const summaryRows = [
    ['Чистая прибыль', currency.format(reportRevenue), 'Оплачено', currency.format(reportPaid)],
    [paymentFilter ? 'Фильтр' : 'Ожидает оплаты', paymentFilter ? filterLabel : currency.format(unpaid), 'Средний чек', currency.format(reportAverage)],
    ['Заказы', String(reportOrders.length), 'Способ оплаты', filterLabel],
    [
      'Остаток при открытии',
      currency.format(shift.openingCashBalance || 0),
      'Остаток при закрытии',
      shift.closingCashBalance == null ? '-' : currency.format(shift.closingCashBalance)
    ]
  ];
  const paymentRows = (paymentFilter ? [[paymentFilter, filteredPaymentTotal]] : paymentTotals).map(([method, value]) => [
    paymentMethodLabel(method),
    currency.format(value)
  ]);
  const paymentOrderSections = (paymentFilter ? [paymentFilter] : paymentMethods).flatMap((method) => {
    const methodOrders = activeOrders.filter((order) => orderHasNetPayment(order, method, paymentMethods));
    const methodTotal = methodOrders.reduce((sum, order) => sum + netOrderPayment(order, method, paymentMethods), 0);
    const methodTitle = `${paymentMethodLabel(method)} · ${currency.format(methodTotal)}`;

    return [
      { text: methodTitle, style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [30, 38, 48, '*', 58],
          body: [
            [
              { text: '№', style: 'tableHeader' },
              { text: 'Время', style: 'tableHeader' },
              { text: 'Статус', style: 'tableHeader' },
              { text: 'Позиции', style: 'tableHeader' },
              { text: 'Сумма', style: 'tableHeader', alignment: 'right' }
            ],
            ...(methodOrders.length
              ? methodOrders.map((order) => [
                  `#${order.id}`,
                  formatOrderTime(order.createdAt),
                  orderDisplayStatus(order),
                  (order.items || []).join(', ') || '-',
                  {
                    text: currency.format(netOrderPayment(order, method, paymentMethods)),
                    alignment: 'right',
                    noWrap: true
                  }
                ])
              : [[{ text: 'Оплат этим способом нет', colSpan: 5, alignment: 'center' }, {}, {}, {}, {}]])
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ];
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [34, 34, 34, 34],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 8,
      lineHeight: 1.12
    },
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      meta: { color: '#64736a', fontSize: 8 },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fillColor: '#edf4ea' }
    },
    content: [
      {
        columns: [
          [
            { text: 'iCashbox POS', style: 'meta' },
            { text: `Отчёт: ${reportTitle}`, style: 'title' }
          ],
          {
            width: 170,
            stack: [
              { text: reportDate, alignment: 'right', bold: true },
              { text: `Кассир: ${shift.cashier}`, alignment: 'right', style: 'meta' },
              { text: `Открыта: ${shift.openedAt}`, alignment: 'right', style: 'meta' }
            ]
          }
        ],
        columnGap: 16,
        margin: [0, 0, 0, 8]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 527, y2: 0, lineWidth: 1.2, lineColor: '#17201b' }],
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          widths: ['*', 'auto', '*', 'auto'],
          body: summaryRows.map((row) => [
            { text: row[0], color: '#64736a' },
            { text: row[1], bold: true, alignment: 'right' },
            { text: row[2], color: '#64736a' },
            { text: row[3], bold: true, alignment: 'right' }
          ])
        },
        layout: 'lightHorizontalLines'
      },
      { text: 'Оплаты', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Способ', style: 'tableHeader' },
              { text: 'Сумма', style: 'tableHeader', alignment: 'right' }
            ],
            ...paymentRows.map(([method, value]) => [method, { text: value, alignment: 'right', bold: true }])
          ]
        },
        layout: 'lightHorizontalLines'
      },
      { text: 'Заказы по способам оплаты', style: 'sectionTitle' },
      ...paymentOrderSections
    ]
  };

  const datePart = shift.shiftKey || new Date().toISOString().slice(0, 10);
  const loadedPdfMake = await loadPdfMake();
  loadedPdfMake
    .createPdf(docDefinition)
    .download(
      `icashbox-shift-${normalizeShiftNumber(shift.number).replace('.', '-')}${
        paymentFilter ? `-${methodSlug(paymentFilter)}` : ''
      }-${datePart}.pdf`
    );
}

function CloudSync({
  autoLaunch,
  exportDirectory,
  exportLocalDatabase,
  githubSettings,
  importInputRef,
  importLocalDatabase,
  isOnline,
  liveUrls,
  loadPrinters,
  loadDatabaseFromGithub,
  printSettings,
  printers,
  saveDatabaseToGithub,
  setGithubSettings,
  setPrintSettings,
  syncQueue,
  selectExportDirectory,
  toggleAutoLaunch,
  toggleNetwork
}) {
  const [githubAccessOpen, setGithubAccessOpen] = useState(false);
  const updateGithubSetting = (field, value) => {
    setGithubSettings((current) => ({ ...current, [field]: value }));
  };

  return (
    <>
    <section className="cloud-layout">
      <div className={isOnline ? 'sync-hero online' : 'sync-hero'}>
        <Smartphone size={34} />
        <h2>{isOnline ? 'Интернет доступен' : 'Система работает локально'}</h2>
        <p>
          Меню, склад, заказы, смены и роли сохраняются на этом компьютере. Экспорт базы можно использовать для ручной резервной копии.
        </p>
        <button className="primary-action" onClick={toggleNetwork}>
          {isOnline ? <WifiOff size={18} /> : <Wifi size={18} />}
          <span>{isOnline ? 'Локальный режим' : 'Проверить интернет'}</span>
        </button>
        <div className="backup-actions">
          <button className="secondary-action" onClick={exportLocalDatabase}>
            <Download size={18} />
            <span>Экспорт базы</span>
          </button>
          <button className="secondary-action" onClick={() => importInputRef.current?.click()}>
            <Upload size={18} />
            <span>Импорт базы</span>
          </button>
          <input ref={importInputRef} type="file" accept="application/json" onChange={importLocalDatabase} hidden />
        </div>
      </div>
      {showGithubSyncSection && (
      <div className="data-section github-sync-section">
        <div className="section-row">
          <div>
            <h2>GitHub</h2>
            <p>Автоматический JSON-бэкап базы в репозитории</p>
          </div>
          <GitBranch size={22} />
        </div>
        <div className="github-access-row">
          <div>
            <strong>{githubSettings.owner && githubSettings.repo ? `${githubSettings.owner}/${githubSettings.repo}` : 'GitHub не подключен'}</strong>
            <span>{githubSettings.path || 'icashbox-backup.json'}</span>
          </div>
          <button className="secondary-action" onClick={() => setGithubAccessOpen(true)}>
            <GitBranch size={18} />
            <span>Доступ к GitHub</span>
          </button>
        </div>
        <div className="backup-actions">
          <button className="secondary-action" onClick={saveDatabaseToGithub}>
            <Upload size={18} />
            <span>Сохранить в GitHub</span>
          </button>
          <button className="secondary-action" onClick={loadDatabaseFromGithub}>
            <Download size={18} />
            <span>Загрузить из GitHub</span>
          </button>
        </div>
      </div>
      )}
      <div className="data-section">
        <div className="section-row">
          <div>
            <h2>Автозагрузка</h2>
            <p>Запуск iCashbox вместе с Windows</p>
          </div>
          <Settings size={22} />
        </div>
        <button className={autoLaunch ? 'primary-action' : 'secondary-action'} onClick={toggleAutoLaunch}>
          {autoLaunch ? <Check size={18} /> : <Plus size={18} />}
          <span>{autoLaunch ? 'В автозагрузке' : 'Добавить в автозагрузку'}</span>
        </button>
      </div>
      <div className="data-section">
        <div className="section-row">
          <div>
            <h2>Телефон</h2>
            <p>Откройте адрес на телефоне в той же Wi‑Fi сети</p>
          </div>
          <Smartphone size={22} />
        </div>
        <div className="sync-list">
          {(liveUrls || []).filter((url) => !url.includes('127.0.0.1')).slice(0, 3).map((url) => (
            <div className="sync-item" key={url}>
              <Smartphone size={17} />
              <div>
                <strong>{url}</strong>
                <span>Live-касса для владельца</span>
              </div>
            </div>
          ))}
          {!(liveUrls || []).some((url) => !url.includes('127.0.0.1')) && (
            <div className="sync-item">
              <Smartphone size={17} />
              <div>
                <strong>Адрес появится в portable</strong>
                <span>Телефон и касса должны быть в одной сети</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="data-section">
        <div className="section-row">
          <div>
            <h2>Папка отчётов</h2>
            <p>Excel, PDF и архив заказов после закрытия смены</p>
          </div>
          <FolderOpen size={22} />
        </div>
        <div className="github-access-row">
          <div>
            <strong>{exportDirectory || 'Папка не выбрана'}</strong>
            <span>{exportDirectory ? 'Смена будет выгружаться сюда' : 'По умолчанию: Documents\\iCashbox Reports'}</span>
          </div>
          <button className="secondary-action" onClick={selectExportDirectory}>
            <FolderOpen size={18} />
            <span>Выбрать</span>
          </button>
        </div>
      </div>
      <div className="data-section">
        <div className="section-row">
          <div>
            <h2>Чековый принтер</h2>
            <p>Отдельные устройства для чеков и самоклеек</p>
          </div>
          <Printer size={22} />
        </div>
        <PrinterSettingsFields
          loadPrinters={loadPrinters}
          printSettings={printSettings}
          printers={printers}
          setPrintSettings={setPrintSettings}
        />
      </div>
      <div className="data-section">
        <div className="section-row">
          <div>
            <h2>Журнал действий</h2>
            <p>Последние локальные операции кассы</p>
          </div>
          <Database size={22} />
        </div>
        <div className="sync-list">
          {syncQueue.map((item) => (
            <div className="sync-item" key={item.id}>
              <RotateCcw size={17} />
              <div>
                <strong>{item.type}</strong>
                <span>{item.source === 'Облако' ? 'Локально' : item.source} · {item.time}</span>
              </div>
              <span className={item.status === 'Ожидает' ? 'badge warning' : 'badge'}>
                {item.status === 'Синхронизировано' ? 'Сохранено' : item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
    {githubAccessOpen && (
      <GithubAccessModal
        githubSettings={githubSettings}
        onChange={updateGithubSetting}
        onClose={() => setGithubAccessOpen(false)}
      />
    )}
    </>
  );
}

function GithubAccessModal({ githubSettings, onChange, onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="github-access-modal" aria-label="Доступ к GitHub">
        <div className="section-row compact">
          <div>
            <h2>Доступ к GitHub</h2>
            <p>Укажите репозиторий и token для сохранения базы</p>
          </div>
          <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="github-settings-grid">
          <label>
            <span>Owner</span>
            <input
              autoFocus
              value={githubSettings.owner}
              onChange={(event) => onChange('owner', event.target.value)}
              placeholder="username"
            />
          </label>
          <label>
            <span>Repo</span>
            <input
              value={githubSettings.repo}
              onChange={(event) => onChange('repo', event.target.value)}
              placeholder="icashbox-data"
            />
          </label>
          <label>
            <span>Branch</span>
            <input
              value={githubSettings.branch}
              onChange={(event) => onChange('branch', event.target.value)}
              placeholder="main"
            />
          </label>
          <label>
            <span>Path</span>
            <input
              value={githubSettings.path}
              onChange={(event) => onChange('path', event.target.value)}
              placeholder="icashbox-backup.json"
            />
          </label>
          <label className="wide-field">
            <span>Token</span>
            <input
              type="password"
              value={githubSettings.token}
              onChange={(event) => onChange('token', event.target.value)}
              placeholder="github_pat_..."
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="primary-action" onClick={onClose}>
            <Check size={18} />
            <span>Готово</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function accountToDraft(account = {}) {
  return {
    name: account.name || '',
    password: account.password || '',
    role: account.role || 'cashier',
    username: account.username || ''
  };
}

function accountDraftChanged(account, draft) {
  return (
    draft.name.trim() !== (account.name || '') ||
    draft.password.trim() !== (account.password || '') ||
    draft.role !== (account.role || 'cashier') ||
    draft.username.trim() !== (account.username || '')
  );
}

function Roles({
  accessRules,
  accounts,
  addAccount,
  canManageAccess,
  currentUserId,
  deleteAccount,
  paymentMethods,
  paymentSettings,
  printSettings,
  setPaymentSettings,
  setPrintSettings,
  toggleRoleRight,
  updateAccount
}) {
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(accounts.map((account) => [account.id, accountToDraft(account)]))
  );
  const [shiftPasswordDraft, setShiftPasswordDraft] = useState(printSettings.shiftPassword || '1234');
  const [paymentMethodDraft, setPaymentMethodDraft] = useState('');
  const rights = [
    { id: 'pos', label: 'Касса' },
    { id: 'orders', label: 'Заказы' },
    { id: 'menu', label: 'Меню' },
    { id: 'inventory', label: 'Склад' },
    { id: 'analytics', label: 'Отчёты' },
    { id: 'cloud', label: 'Настройки' },
    { id: 'roles', label: 'Роли' }
  ].filter((right) => !hiddenViewIds.has(right.id));
  const roles = [
    { id: 'admin', title: 'Админ', text: 'Полный доступ к кассе, меню, складу, отчётам и настройкам.' },
    { id: 'cashier', title: 'Кассир', text: 'Работа с продажами и заказами.' }
  ];

  useEffect(() => {
    setDrafts(Object.fromEntries(accounts.map((account) => [account.id, accountToDraft(account)])));
  }, [accounts]);

  useEffect(() => {
    setShiftPasswordDraft(printSettings.shiftPassword || '1234');
  }, [printSettings.shiftPassword]);

  const updateDraft = (account, patch) => {
    setDrafts((current) => ({
      ...current,
      [account.id]: {
        ...(current[account.id] || accountToDraft(account)),
        ...patch
      }
    }));
  };
  const addPaymentMethod = () => {
    const name = paymentMethodDraft.replace(/\s+/g, ' ').trim();
    if (!name) return;
    setPaymentSettings((current) => ({
      ...current,
      methods: normalizePaymentMethods([...(current.methods || defaultPaymentMethods), name])
    }));
    setPaymentMethodDraft('');
  };
  const removePaymentMethod = (method) => {
    if (defaultPaymentMethods.includes(method)) return;
    setPaymentSettings((current) => ({
      ...current,
      methods: normalizePaymentMethods(current.methods || defaultPaymentMethods).filter((item) => item !== method)
    }));
  };

  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2>Сотрудники и роли</h2>
          <p>Администратор меняет сотрудников, PIN и права разделов</p>
        </div>
        <button className="secondary-action" disabled={!canManageAccess} onClick={addAccount}>
          <UserRoundCog size={18} />
          <span>Добавить</span>
        </button>
      </div>
      <div className="account-grid">
        {accounts.map((account) => {
          const draft = drafts[account.id] || accountToDraft(account);
          const changed = accountDraftChanged(account, draft);
          const isCurrentUser = account.id === currentUserId;

          return (
            <article className="account-card editable-account-card" key={account.id}>
              <div className="account-card-head">
                <div>
                  <strong>{account.name}</strong>
                  <span>{roleLabels[account.role]}</span>
                </div>
                <code>PIN</code>
              </div>
              <div className="account-edit-grid">
                <label>
                  <span>Имя</span>
                  <input
                    disabled={!canManageAccess}
                    value={draft.name}
                    onChange={(event) => updateDraft(account, { name: event.target.value })}
                  />
                </label>
                <label>
                  <span>Логин</span>
                  <input
                    disabled={!canManageAccess}
                    value={draft.username}
                    onChange={(event) => updateDraft(account, { username: event.target.value })}
                  />
                </label>
                <label>
                  <span>Роль</span>
                  <select
                    disabled={!canManageAccess}
                    value={draft.role}
                    onChange={(event) => updateDraft(account, { role: event.target.value })}
                  >
                    <option value="admin">Админ</option>
                    <option value="cashier">Кассир</option>
                  </select>
                </label>
                <label>
                  <span>Пароль</span>
                  <input
                    disabled={!canManageAccess}
                    value={draft.password}
                    onChange={(event) => updateDraft(account, { password: event.target.value })}
                  />
                </label>
              </div>
              <div className="account-actions">
                <button
                  className="primary-action"
                  disabled={!canManageAccess || !changed}
                  onClick={() => updateAccount(account.id, draft)}
                >
                  <Save size={17} />
                  <span>Сохранить</span>
                </button>
                <button
                  className="secondary-action danger-action"
                  disabled={!canManageAccess || isCurrentUser}
                  onClick={() => deleteAccount(account.id)}
                >
                  <Trash2 size={17} />
                  <span>Удалить</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="settings-panel">
        <div className="settings-panel-title">
          <KeyRound size={22} />
          <div>
            <h3>Пароль от кассы</h3>
            <p>Кассир вводит его при открытии смены</p>
          </div>
        </div>
        <div className="account-edit-grid">
          <label>
            <span>Пароль</span>
            <input
              disabled={!canManageAccess}
              type="password"
              value={shiftPasswordDraft}
              onChange={(event) => setShiftPasswordDraft(event.target.value)}
            />
          </label>
        </div>
        <div className="account-actions">
          <button
            className="primary-action"
            disabled={!canManageAccess || !shiftPasswordDraft.trim() || shiftPasswordDraft === (printSettings.shiftPassword || '1234')}
            onClick={() =>
              setPrintSettings((current) => ({ ...current, shiftPassword: shiftPasswordDraft.trim() }))
            }
          >
            <Save size={17} />
            <span>Сохранить</span>
          </button>
        </div>
      </div>
      <div className="settings-panel">
        <div className="settings-panel-title">
          <CreditCard size={22} />
          <div>
            <h3>Виды оплаты</h3>
            <p>Новые способы сразу появятся в кассе и отчётах</p>
          </div>
        </div>
        <div className="account-edit-grid">
          <label>
            <span>Новый вид оплаты</span>
            <input
              disabled={!canManageAccess}
              value={paymentMethodDraft}
              onChange={(event) => setPaymentMethodDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addPaymentMethod();
                }
              }}
              placeholder="Например: QR"
            />
          </label>
        </div>
        <div className="account-actions">
          <button
            className="primary-action"
            disabled={!canManageAccess || !paymentMethodDraft.trim()}
            onClick={addPaymentMethod}
          >
            <Plus size={17} />
            <span>Добавить</span>
          </button>
        </div>
        <div className="payment-method-list">
          {paymentMethods.map((method) => (
            <div className="payment-method-row" key={method}>
              <span>{paymentMethodLabel(method)}</span>
              <button
                className="mini-button"
                disabled={!canManageAccess || defaultPaymentMethods.includes(method)}
                onClick={() => removePaymentMethod(method)}
                type="button"
              >
                <Trash2 size={15} />
                <span>Убрать</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="role-grid">
        {roles.map((role) => (
          <article className="role-card" key={role.id}>
            <h3>{role.title}</h3>
            <p>{role.text}</p>
            <div>
              {rights.map((right) => (
                <label key={right.id}>
                  <input
                    type="checkbox"
                    checked={right.id === 'roles' ? role.id === 'admin' : (accessRules[role.id] || []).includes(right.id)}
                    disabled={!canManageAccess || right.id === 'roles'}
                    onChange={() => toggleRoleRight(role.id, right.id)}
                  />
                  <span>{right.label}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PrinterPicker({ label, onChange, placeholder, printers, value }) {
  const printerOptions = [...new Set(printers.filter(Boolean))];
  const selectedValue = printerOptions.includes(value) ? value : '';

  return (
    <div className="printer-field">
      <span>{label}</span>
      <select value={selectedValue} onChange={(event) => onChange(event.target.value)}>
        <option value="">Системный принтер Windows</option>
        {printerOptions.map((printer) => (
          <option key={printer} value={printer}>
            {printer}
          </option>
        ))}
      </select>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function PrinterSettingsFields({ loadPrinters, onPushRemoteLive, printSettings, printers, remoteLiveStatus, setPrintSettings }) {
  return (
    <div className="printer-settings">
      <PrinterPicker
        label="Принтер чеков"
        placeholder="Или введите имя вручную, например POS-80C"
        printers={printers}
        value={printSettings.printerName}
        onChange={(printerName) => setPrintSettings((current) => ({ ...current, printerName }))}
      />
      <PrinterPicker
        label="Принтер стикеров"
        placeholder="Или введите имя вручную, например XP-365B"
        printers={printers}
        value={printSettings.stickerPrinterName}
        onChange={(stickerPrinterName) =>
          setPrintSettings((current) => ({ ...current, stickerPrinterName }))
        }
      />
      <button className="secondary-action" onClick={loadPrinters}>
        <RotateCcw size={18} />
        <span>Обновить список принтеров</span>
      </button>
      <label>
        <input
          checked={printSettings.directAgent}
          type="checkbox"
          onChange={(event) =>
            setPrintSettings((current) => ({ ...current, directAgent: event.target.checked }))
          }
        />
        <span>Печатать напрямую через локальный агент</span>
      </label>
      <label>
        <input
          checked={printSettings.autoReceipt}
          type="checkbox"
          onChange={(event) =>
            setPrintSettings((current) => ({ ...current, autoReceipt: event.target.checked }))
          }
        />
        <span>Автопечать чека после заказа</span>
      </label>
      <label>
        <input
          checked={Boolean(printSettings.remoteLiveEnabled)}
          type="checkbox"
          onChange={(event) =>
            setPrintSettings((current) => ({ ...current, remoteLiveEnabled: event.target.checked }))
          }
        />
        <span>Live через интернет</span>
      </label>
      <label className="printer-field">
        <span>API URL</span>
        <input
          placeholder="https://your-app.vercel.app/api/live/update"
          value={printSettings.remoteLiveUrl || ''}
          onChange={(event) =>
            setPrintSettings((current) => ({ ...current, remoteLiveUrl: event.target.value }))
          }
        />
      </label>
      <label className="printer-field">
        <span>Секрет</span>
        <input
          type="password"
          placeholder="LIVE_PUSH_TOKEN"
          value={printSettings.remoteLiveToken || ''}
          onChange={(event) =>
            setPrintSettings((current) => ({ ...current, remoteLiveToken: event.target.value }))
          }
        />
      </label>
      <button className="secondary-action" type="button" onClick={onPushRemoteLive}>
        <RotateCcw size={18} />
        <span>Отправить Live сейчас</span>
      </button>
      {remoteLiveStatus && <p className="settings-hint">{remoteLiveStatus}</p>}
    </div>
  );
}

function SettingsModal({
  loadPrinters,
  onClearMenu,
  onClose,
  onPushRemoteLive,
  printSettings,
  productsCount,
  printers,
  remoteLiveStatus,
  setPrintSettings
}) {
  return (
    <div className="modal-backdrop">
      <section className="settings-modal" aria-label="Настройки программы">
        <div className="section-row compact">
          <div>
            <h2>Настройки</h2>
            <p>Принтеры чеков и самоклеек выбираются отдельно</p>
          </div>
          <button className="icon-button" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="settings-modal-body">
          <div className="settings-panel">
            <div className="settings-panel-title">
              <Printer size={22} />
              <div>
                <h3>Печать</h3>
                <p>Список берётся из установленных Windows-принтеров</p>
              </div>
            </div>
            <PrinterSettingsFields
              loadPrinters={loadPrinters}
              onPushRemoteLive={onPushRemoteLive}
              printSettings={printSettings}
              printers={printers}
              remoteLiveStatus={remoteLiveStatus}
              setPrintSettings={setPrintSettings}
            />
          </div>
          <div className="settings-panel">
            <div className="settings-panel-title">
              <KeyRound size={22} />
              <div>
                <h3>Пароль смены</h3>
                <p>Кассир вводит его при открытии смены</p>
              </div>
            </div>
            <div className="printer-settings">
              <label className="printer-field">
                <span>Пароль</span>
                <input
                  type="password"
                  value={printSettings.shiftPassword || '1234'}
                  onChange={(event) =>
                    setPrintSettings((current) => ({ ...current, shiftPassword: event.target.value }))
                  }
                  placeholder="1234"
                />
              </label>
            </div>
          </div>
          <div className="settings-panel danger-settings-panel">
            <div className="settings-panel-title">
              <Trash2 size={22} />
              <div>
                <h3>Меню</h3>
                <p>Текущих позиций: {productsCount}</p>
              </div>
            </div>
            <button className="secondary-action danger-action" disabled={!productsCount} onClick={onClearMenu}>
              <Trash2 size={18} />
              <span>Удалить меню</span>
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button className="primary-action" onClick={onClose}>
            <Check size={18} />
            <span>Сохранить</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function CopiesModal({ copies, onChange, onClose, onPrint, order }) {
  const quickCopies = [1, 2, 3];

  return (
    <div className="modal-backdrop">
      <section className="copies-modal" aria-label="Количество копий чека">
        <div className="section-row compact">
          <div>
            <h2>Печать чека #{order.id}</h2>
            <p>Выберите количество копий</p>
          </div>
          <button className="icon-button" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="copy-stepper">
          <button type="button" onClick={() => onChange(copies - 1)}>
            <Minus size={22} />
          </button>
          <strong>{copies}</strong>
          <button type="button" onClick={() => onChange(copies + 1)}>
            <Plus size={22} />
          </button>
        </div>
        <div className="copy-presets">
          {quickCopies.map((value) => (
            <button
              className={copies === value ? 'selected' : ''}
              key={value}
              type="button"
              onClick={() => onChange(value)}
            >
              {value} коп.
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="secondary-action" onClick={onClose}>
            <X size={18} />
            <span>Отмена</span>
          </button>
          <button className="primary-action" onClick={onPrint}>
            <Printer size={18} />
            <span>Печатать</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ShiftCashBalanceModal({ mode, onChange, onClose, onConfirm, value }) {
  const isClosing = mode === 'close';
  const title = isClosing ? 'Остаток в кассе при закрытии' : 'Остаток в кассе при открытии';
  const description = isClosing
    ? 'Введите фактическую сумму наличных в кассе перед закрытием смены'
    : 'Введите фактическую сумму наличных в кассе перед открытием смены';
  const confirmLabel = isClosing ? 'Закрыть смену' : 'Открыть смену';

  const submit = (event) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <div className="modal-backdrop">
      <section className="shift-cash-modal" aria-label={title}>
        <form className="shift-cash-form" onSubmit={submit}>
          <div className="section-row compact">
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <label className="shift-cash-field">
            <span>Сумма</span>
            <input
              autoFocus
              inputMode="decimal"
              min="0"
              step="1"
              type="number"
              value={value}
              onFocus={(event) => event.target.select()}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={onClose}>
              <X size={18} />
              <span>Отмена</span>
            </button>
            <button className="primary-action" type="submit">
              {isClosing ? <Save size={18} /> : <Check size={18} />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AdminPasswordModal({
  confirmLabel = 'Открыть',
  description = 'Редактирование заказа требует повторного подтверждения',
  disabled = false,
  error,
  inputKey,
  onChange,
  onClose,
  onConfirm,
  onUserInput,
  password,
  title = 'Пароль администратора'
}) {
  const markUserInput = () => {
    onUserInput?.();
  };

  const submit = (event) => {
    event.preventDefault();
    if (disabled) return;
    onConfirm();
  };

  return (
    <div className="modal-backdrop">
      <section className="admin-auth-modal" aria-label="Подтверждение администратора">
        <form className="admin-auth-form" autoComplete="off" onSubmit={submit}>
          <div className="section-row compact">
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <label>
            <span>Пароль</span>
            <input
              autoFocus
              autoComplete="off"
              key={inputKey || title}
              name={inputKey || `admin-password-${title}`}
              onBeforeInput={markUserInput}
              spellCheck="false"
              type="password"
              value={password}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={markUserInput}
              onPaste={markUserInput}
              placeholder="Введите пароль"
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={onClose}>
              <X size={18} />
              <span>Отмена</span>
            </button>
            <button className="primary-action" disabled={disabled} type="submit">
              <ShieldCheck size={18} />
              <span>{confirmLabel}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DangerConfirmModal({
  confirmLabel = 'Удалить',
  description,
  onClose,
  onConfirm,
  title
}) {
  return (
    <div className="modal-backdrop">
      <section className="admin-auth-modal danger-confirm-modal" aria-label={title}>
        <div className="section-row compact">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            <X size={18} />
            <span>Отмена</span>
          </button>
          <button className="secondary-action danger-action" type="button" onClick={onConfirm}>
            <Trash2 size={18} />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function OrderEditModal({ onClose, onSave, order, paymentMethods }) {
  const [draft, setDraft] = useState(() => ({
    comment: order.comment || '',
    guestName: order.guestName || '',
    itemsText: (order.items || []).join('\n'),
    paid: Boolean(order.paid),
    payments: { ...blankPaymentsFor(paymentMethods), ...(order.payments || {}) },
    status: orderDisplayStatus(order),
    table: order.table || 'Касса',
    total: String(order.total || 0),
    type: order.type || 'Продажа'
  }));
  const statuses = ['Оплачен', 'Возврат'];

  const updatePayment = (method, value) => {
    setDraft((current) => ({
      ...current,
      payments: { ...current.payments, [method]: Number(value) }
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const itemLines = draft.itemsText
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const total = Math.max(0, Number(draft.total || 0));
    const payments = Object.fromEntries(paymentMethods.map((method) => [method, Number(draft.payments[method] || 0)]));
    const paidAmount = Object.values(payments).reduce((sum, value) => sum + Number(value || 0), 0);

    onSave({
      ...order,
      cancelled: false,
      comment: draft.comment.trim(),
      editedAt: new Date().toISOString(),
      guestName: draft.guestName.trim(),
      items: itemLines,
      lines: buildEditableOrderLines(itemLines, total),
      paid: draft.status === 'Оплачен',
      payments,
      refunded: draft.status === 'Возврат',
      status: draft.status,
      table: draft.table.trim() || 'Касса',
      total,
      type: draft.type.trim() || 'Продажа'
    });
  };

  return (
    <div className="modal-backdrop">
      <section className="order-edit-modal" aria-label="Редактирование заказа">
        <form className="order-edit-form" onSubmit={submit}>
          <div className="section-row compact">
            <div>
              <h2>Редактирование #{order.id}</h2>
              <p>Изменения сохраняются в истории и локальном журнале</p>
            </div>
            <button className="icon-button" type="button" title="Закрыть" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="edit-grid">
            <label>
              <span>Тип</span>
              <input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} />
            </label>
            <label>
              <span>Место</span>
              <input value={draft.table} onChange={(event) => setDraft({ ...draft, table: event.target.value })} />
            </label>
            <label>
              <span>Статус</span>
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Итого</span>
              <input
                type="number"
                min="0"
                value={draft.total}
                onChange={(event) => setDraft({ ...draft, total: event.target.value })}
              />
            </label>
            <label>
              <span>Имя гостя</span>
              <input
                value={draft.guestName}
                onChange={(event) => setDraft({ ...draft, guestName: event.target.value })}
              />
            </label>
            <label>
              <span>Оплачен</span>
              <select
                value={draft.paid ? 'yes' : 'no'}
                onChange={(event) => setDraft({ ...draft, paid: event.target.value === 'yes' })}
              >
                <option value="yes">Да</option>
                <option value="no">Нет</option>
              </select>
            </label>
            <label className="wide-field">
              <span>Позиции</span>
              <textarea
                value={draft.itemsText}
                onChange={(event) => setDraft({ ...draft, itemsText: event.target.value })}
                rows={4}
                placeholder="Капучино 250 мл x1"
              />
            </label>
            <label className="wide-field">
              <span>Комментарий</span>
              <textarea
                value={draft.comment}
                onChange={(event) => setDraft({ ...draft, comment: event.target.value })}
                rows={3}
              />
            </label>
          </div>

          <div className="payment-edit-grid">
            {paymentMethods.map((method) => (
              <label key={method}>
                <span>{paymentMethodLabel(method)}</span>
                <input
                  type="number"
                  min="0"
                  value={draft.payments[method] || 0}
                  onChange={(event) => updatePayment(method, event.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={onClose}>
              <X size={18} />
              <span>Отмена</span>
            </button>
            <button className="primary-action" type="submit">
              <Save size={18} />
              <span>Сохранить</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function buildEditableOrderLines(items, total) {
  const fallbackTotal = items.length ? total / items.length : 0;
  return items.map((item, index) => {
    const match = String(item).match(/^(.*)\s+x(\d+)$/i);
    const qty = match ? Math.max(1, Number(match[2])) : 1;
    const name = match ? match[1].trim() : String(item).trim();
    const lineTotal = Math.round(fallbackTotal);
    return {
      id: `edited-${index}`,
      name,
      price: qty ? Math.round(lineTotal / qty) : lineTotal,
      qty,
      total: lineTotal
    };
  });
}

function receiptCenter(text, width = 36) {
  const value = String(text || '').slice(0, width);
  return `${' '.repeat(Math.max(0, Math.floor((width - value.length) / 2)))}${value}`;
}

function receiptRule(width = 36) {
  return '-'.repeat(width);
}

function receiptColumns(left, right, width = 36) {
  const leftValue = String(left || '');
  const rightValue = String(right || '');
  const gap = Math.max(1, width - leftValue.length - rightValue.length);
  return `${leftValue}${' '.repeat(gap)}${rightValue}`.slice(0, width);
}

function receiptWrap(text, width = 36) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const rows = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      rows.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) rows.push(current);
  return rows.length ? rows : [''];
}

function printableOrderLines(order) {
  if (Array.isArray(order.lines) && order.lines.length) return order.lines;

  const fallbackPrice = order.items?.length ? Number(order.total || 0) / order.items.length : 0;
  return (order.items || []).map((item, index) => {
    const match = String(item).match(/^(.*)\s+x(\d+)$/);
    const qty = match ? Number(match[2]) : 1;
    return {
      id: `${order.id}-${index}`,
      name: match ? match[1] : String(item),
      price: fallbackPrice,
      qty,
      total: fallbackPrice * qty
    };
  });
}

function buildPrintableReceipt(order, shift, type) {
  const width = 30;
  const isSticker = type === 'sticker';
  const rows = [];
  const lines = printableOrderLines(order);
  const now = new Date();
  const printedAt = now.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isSticker) {
    return '';
  }

  rows.push(receiptColumns('Чек №', order.id || '', width));
  rows.push(receiptColumns('Кассир', shift.cashier || 'Кассир', width));
  rows.push(receiptColumns('Открыто', printedAt, width));
  rows.push(receiptColumns('Напечатано', printedAt, width));
  rows.push(receiptColumns('Заказ №', String(order.id || '').slice(-3), width));
  rows.push(receiptRule(width));
  rows.push('Наименование К-во Цена Итого');
  rows.push(receiptRule(width));

  for (const item of lines) {
    const qty = String(item.qty).padStart(3, ' ');
    const price = receiptMoney.format(item.price).padStart(6, ' ');
    const total = receiptMoney.format(item.total).padStart(7, ' ');
    const nameWidth = Math.max(10, width - qty.length - price.length - total.length - 3);
    const wrapped = receiptWrap(item.name, nameWidth);
    rows.push(`${wrapped[0].padEnd(nameWidth)} ${qty} ${price} ${total}`);
    wrapped.slice(1).forEach((row) => rows.push(row));
  }

  rows.push('');
  rows.push(`К оплате ${'.'.repeat(10)} ${receiptMoney.format(order.total)} TJS`);
  rows.push('');
  rows.push(receiptRule(width));
  rows.push('');
  rows.push('Оплата');
  rows.push('');

  const paid = Object.entries(order.payments || {}).filter(([, value]) => Number(value) > 0);
  const paidTotal = paid.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const change = Math.max(0, roundPayment(paidTotal - Number(order.total || 0)));
  if (paid.length) {
    paid.forEach(([method, value]) => rows.push(receiptColumns(method, `${receiptMoney.format(value)} TJS`, width)));
    if (change > 0) {
      rows.push(receiptColumns('Сдача', `${receiptMoney.format(change)} TJS`, width));
    }
  } else {
    rows.push(receiptColumns('Оплата', 'Ожидает', width));
  }

  rows.push(receiptRule(width));
  rows.push('Спасибо за покупку!');
  rows.push(printedAt);
  rows.push('');
  return rows.join('\n');
}

function countStickerLabels(order) {
  return printableOrderLines(order).reduce((total, item) => total + Math.max(1, Math.round(Number(item.qty || 1))), 0);
}

function formatGuestName(name) {
  const cleanName = String(name || '').trim();
  return cleanName || 'Дорогой гость';
}

function buildStickerLabels(order) {
  const labels = [];
  const guestLabel = formatGuestName(order.guestName);
  let labelIndex = 0;

  for (const item of printableOrderLines(order)) {
    const qty = Math.max(1, Math.round(Number(item.qty || 1)));
    for (let index = 1; index <= qty; index += 1) {
      labels.push({
        id: `${order.id || 'order'}-${labelIndex}`,
        guestName: guestLabel,
        wish:
          order.stickerWishes?.[labelIndex] ||
          order.stickerWish ||
          stickerWishForSeed(`${order.id || 'order'}-${labelIndex}`)
      });
      labelIndex += 1;
    }
  }

  if (!labels.length) {
    labels.push({
      id: `${order.id || 'order'}-empty`,
      guestName: guestLabel,
      wish: order.stickerWish || stickerWishForSeed(`${order.id || 'order'}-empty`)
    });
  }

  return labels;
}

function PrintModal({ order, onClose, onPrint, shift, type }) {
  const isSticker = type === 'sticker';
  const stickerLabels = isSticker ? buildStickerLabels(order) : [];
  const receiptText = isSticker ? '' : buildPrintableReceipt(order, shift, type);

  return (
    <div className="modal-backdrop">
      <section
        className={isSticker ? 'receipt-modal sticker-print' : 'receipt-modal'}
        aria-label="Печать заказа"
      >
        <div className={isSticker ? 'section-row compact no-print' : 'section-row compact'}>
          <div>
            <h2>{isSticker ? `Стикеры: ${stickerLabels.length}` : `Чек #${order.id}`}</h2>
            <p>
              {isSticker
                ? `${formatGuestName(order.guestName)} · ${STICKER_WISH_BANK_SIZE} пожеланий`
                : `iCashbox Cafe · ${shiftLabel(shift)}`}
            </p>
          </div>
          <button className="icon-button no-print" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {isSticker ? (
          <div className="sticker-labels">
            {stickerLabels.map((label) => (
              <article className="sticker-label-preview" key={label.id}>
                <img className="sticker-label-logo" src={receiptLogoUrl} alt="" />
                <div className="sticker-label-copy">
                  <strong>{label.guestName}</strong>
                  <p>{label.wish}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <>
            <img className="receipt-logo" src={receiptLogoUrl} alt="" />
            <div className="receipt-body">
              <pre className="receipt-text">{receiptText}</pre>
            </div>
          </>
        )}
        <div className="modal-actions no-print">
          <button className="secondary-action" onClick={() => onPrint(order, type)}>
            <Printer size={18} />
            <span>Печатать</span>
          </button>
          <button className="primary-action" onClick={onClose}>
            <Check size={18} />
            <span>Закрыть</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function applyRecipeWriteOff(stock, cart) {
  return stock.map((ingredient) => {
    const consumed = cart.reduce((sum, product) => {
      const recipe = recipes[product.id] || [];
      const line = recipe.find((item) => item.ingredientId === ingredient.id);
      return sum + (line ? line.qty * product.qty : 0);
    }, 0);
    return consumed ? { ...ingredient, stock: roundStock(Math.max(0, ingredient.stock - consumed)) } : ingredient;
  });
}

function roundStock(value) {
  return Math.round(value * 1000) / 1000;
}

function pageTitle(view) {
  return {
    pos: 'Касса и заказы',
    menu: 'Меню и стоп-лист',
    orders: 'История заказов',
    inventory: 'Склад и техкарты',
    analytics: 'Аналитика и смены',
    cloud: 'Настройки',
    roles: 'Доступы'
  }[view];
}

function orderStatusClass(status) {
  if (status === 'Возврат') return 'badge danger';
  return 'badge';
}

export default App;
