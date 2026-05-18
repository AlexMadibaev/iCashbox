import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  Check,
  ClipboardList,
  CircleDollarSign,
  Cloud,
  CloudOff,
  CreditCard,
  Database,
  Download,
  KeyRound,
  Landmark,
  LogOut,
  MenuSquare,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Undo2,
  Upload,
  User,
  UserRoundCog,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';

const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'TJS',
  maximumFractionDigits: 0
});

const receiptMoney = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const blankPayments = { Наличные: 0, Alif: 0, 'Dushanbe City': 0, Карта: 0, Перевод: 0 };
const paymentMethods = Object.keys(blankPayments);
const receiptLogoUrl = `${import.meta.env.BASE_URL}pos-logo.png`;

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

const roleAccess = {
  admin: ['pos', 'menu', 'orders', 'inventory', 'analytics', 'cloud', 'roles'],
  cashier: ['pos', 'orders']
};

const productSeed = [
  {
    id: 'capuccino-250',
    name: 'Капучино',
    category: 'Кофе',
    size: '250 мл',
    price: 25,
    modifiers: ['Сироп', 'Альт. молоко', 'Сахар'],
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    active: true
  },
  {
    id: 'capuccino-350',
    name: 'Капучино',
    category: 'Кофе',
    size: '350 мл',
    price: 32,
    modifiers: ['Сироп', 'Альт. молоко', 'Сахар'],
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    active: true
  },
  {
    id: 'burger',
    name: 'Бургер',
    category: 'Кухня',
    size: 'классик',
    price: 68,
    modifiers: ['Без лука', 'Острый соус', 'Доп. сыр'],
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    active: true
  },
  {
    id: 'salad',
    name: 'Цезарь',
    category: 'Кухня',
    size: 'порция',
    price: 54,
    modifiers: ['Без сухариков', 'Доп. курица'],
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=600&q=80',
    active: true
  },
  {
    id: 'pizza',
    name: 'Пицца Маргарита',
    category: 'Пицца',
    size: '30 см',
    price: 82,
    modifiers: ['Тонкое тесто', 'Доп. сыр'],
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
    active: true
  },
  {
    id: 'lemonade',
    name: 'Лимонад',
    category: 'Напитки',
    size: '400 мл',
    price: 22,
    modifiers: ['Лед', 'Без сахара'],
    image: 'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?auto=format&fit=crop&w=600&q=80',
    active: true
  }
];

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
    status: 'Готовится',
    minutes: 12,
    total: 136,
    items: ['Бургер классик x2'],
    paid: false,
    payments: {}
  },
  {
    id: 1043,
    type: 'Продажа',
    table: 'Касса',
    status: 'Новый',
    minutes: 3,
    total: 104,
    items: ['Пицца Маргарита 30 см x1', 'Лимонад 400 мл x1'],
    paid: false,
    payments: {}
  },
  {
    id: 1044,
    type: 'Продажа',
    table: 'Касса',
    status: 'Готов',
    minutes: 18,
    total: 57,
    items: ['Капучино 350 мл x1', 'Капучино 250 мл x1'],
    paid: true,
    payments: { Наличные: 57 }
  }
];

const navItems = [
  { id: 'pos', label: 'Касса', icon: ReceiptText },
  { id: 'menu', label: 'Меню', icon: MenuSquare },
  { id: 'orders', label: 'Заказы', icon: ClipboardList },
  { id: 'inventory', label: 'Склад', icon: Boxes },
  { id: 'analytics', label: 'Отчёты', icon: BarChart3 },
  { id: 'cloud', label: 'Облако', icon: Cloud },
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

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStored(key, fallback));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function canAccessView(account, viewId) {
  if (!account) return false;
  return (roleAccess[account.role] || []).includes(viewId);
}

function normalizeCopies(value) {
  const copies = Number(value);
  if (!Number.isFinite(copies)) return 1;
  return Math.min(20, Math.max(1, Math.round(copies)));
}

function App() {
  const [activeView, setActiveView] = useState('pos');
  const [accounts] = useStoredState('icashbox.accounts', defaultAccounts);
  const [session, setSession] = useStoredState('icashbox.session', null);
  const [isOnline, setIsOnline] = useStoredState('icashbox.online', false);
  const [products, setProducts] = useStoredState('icashbox.products', productSeed);
  const [stock, setStock] = useStoredState('icashbox.stock', stockSeed);
  const [orders, setOrders] = useStoredState('icashbox.orders', orderSeed);
  const [expenses, setExpenses] = useStoredState('icashbox.expenses', [
    { id: 1, title: 'Закупка продуктов', category: 'Логистика', amount: 120, time: '09:45' },
    { id: 2, title: 'Хозтовары', category: 'Операционные', amount: 85, time: '11:10' }
  ]);
  const [syncQueue, setSyncQueue] = useStoredState('icashbox.syncQueue', [
    { id: 1, type: 'Изменение цены', source: 'Облако', status: 'Ожидает', time: '09:20' },
    { id: 2, type: 'Закрытие смены', source: 'Локально', status: 'Ожидает', time: '10:05' },
    { id: 3, type: 'Списание склада', source: 'Локально', status: 'Ожидает', time: '10:14' }
  ]);
  const [shift, setShift] = useStoredState('icashbox.shift', {
    number: 24,
    open: true,
    openedAt: '08:00',
    cashier: 'Мадина'
  });
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [orderComment, setOrderComment] = useState('');
  const [payments, setPayments] = useState(blankPayments);
  const [lastMessage, setLastMessage] = useState('Локальная база готова к работе');
  const [printJob, setPrintJob] = useState(null);
  const [copyRequest, setCopyRequest] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [printSettings, setPrintSettings] = useStoredState('icashbox.printSettings', {
    autoReceipt: false,
    directAgent: true,
    printerName: '',
    stickerPrinterName: ''
  });
  const [printers, setPrinters] = useState([]);
  const importInputRef = useRef(null);
  const creatingOrderRef = useRef(false);
  const currentUser = accounts.find((account) => account.id === session?.accountId) || null;
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => canAccessView(currentUser, item.id)),
    [currentUser]
  );

  const categories = useMemo(() => ['Все', ...new Set(products.map((item) => item.category))], [products]);
  const visibleProducts = products.filter((item) => {
    const categoryMatch = selectedCategory === 'Все' || item.category === selectedCategory;
    const searchMatch = `${item.name} ${item.size} ${item.category}`.toLowerCase().includes(search.toLowerCase());
    return item.active && categoryMatch && searchMatch;
  });
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const paidAmount = Object.values(payments).reduce((sum, value) => sum + Number(value || 0), 0);
  const pendingSync = syncQueue.filter((item) => item.status === 'Ожидает').length;

  useEffect(() => {
    if (!currentUser) return;
    if (!canAccessView(currentUser, activeView)) {
      setActiveView(roleAccess[currentUser.role]?.[0] || 'pos');
    }
  }, [activeView, currentUser]);

  const login = ({ password, role }) => {
    const account = accounts.find(
      (item) =>
        item.role === role &&
        [item.password, ...(fallbackRolePins[item.role] || [])].includes(password)
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
    setOrderComment('');
    setPayments(blankPayments);
    setPrintJob(null);
    setCopyRequest(null);
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
        status: isOnline ? 'Синхронизировано' : 'Ожидает',
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
    creatingOrderRef.current = true;
    const nextOrder = {
      id: Math.max(1044, ...orders.map((order) => order.id)) + 1,
      type: 'Продажа',
      table: 'Касса',
      status: paidAmount >= cartTotal ? 'Оплачен' : 'Принят',
      minutes: 0,
      total: cartTotal,
      items: cart.map((item) => `${item.name} ${item.size} x${item.qty}`),
      lines: cart.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        price: item.price,
        qty: item.qty,
        total: item.price * item.qty
      })),
      comment: orderComment,
      paid: paidAmount >= cartTotal,
      payments: { ...payments },
      createdAt: new Date().toISOString()
    };

    setOrders([nextOrder, ...orders]);
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
        setSyncQueue((queue) => queue.map((item) => ({ ...item, status: 'Синхронизировано' })));
        setLastMessage('Очередь синхронизации отправлена в облако');
      } else {
        setLastMessage('Интернет отключён, касса продолжает работать локально');
      }
      return next;
    });
  };

  const closeShift = () => {
    setShift((current) => ({ ...current, open: false, closedAt: new Date().toISOString() }));
    queueSync('Закрытие смены');
    setLastMessage('Смена закрыта, отчёт сохранён');
  };

  const openShift = () => {
    setShift((current) => ({
      number: current.number + 1,
      open: true,
      openedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      cashier: current.cashier
    }));
    queueSync('Открытие смены');
    setLastMessage('Новая смена открыта');
  };

  const updateProduct = (id, patch) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...patch } : product)));
    queueSync('Изменение меню', 'Облако');
  };

  const receiveStock = (id, amount) => {
    setStock((current) =>
      current.map((item) => (item.id === id ? { ...item, stock: roundStock(item.stock + amount) } : item))
    );
    queueSync('Приход товара');
    setLastMessage('Приход добавлен и попадёт в журнал синхронизации');
  };

  const refundOrder = (id) => {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status: 'Возврат', paid: false, refunded: true } : order))
    );
    queueSync('Возврат заказа');
    setLastMessage(`Возврат по заказу #${id} зафиксирован`);
  };

  const cancelOrder = (id) => {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status: 'Отменён', paid: false, cancelled: true } : order))
    );
    queueSync('Отмена заказа');
    setLastMessage(`Заказ #${id} отменён`);
  };

  const markOrderReady = (id) => {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status: 'Готов' } : order))
    );
    queueSync('Изменение статуса заказа');
    setLastMessage(`Заказ #${id} отмечен как готов`);
  };

  const addExpense = () => {
    const now = new Date();
    const nextExpense = {
      id: now.getTime(),
      title: 'Закупка по смене',
      category: 'Склад',
      amount: 100,
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    setExpenses((current) => [nextExpense, ...current]);
    queueSync('Добавлен расход');
    setLastMessage('Расход добавлен в сменный отчёт');
  };

  const exportLocalDatabase = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      products,
      stock,
      orders,
      expenses,
      syncQueue,
      shift
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `icashbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setLastMessage('Локальная база экспортирована в JSON');
  };

  const importLocalDatabase = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (Array.isArray(payload.products)) setProducts(payload.products);
        if (Array.isArray(payload.stock)) setStock(payload.stock);
        if (Array.isArray(payload.orders)) setOrders(payload.orders);
        if (Array.isArray(payload.expenses)) setExpenses(payload.expenses);
        if (Array.isArray(payload.syncQueue)) setSyncQueue(payload.syncQueue);
        if (payload.shift) setShift(payload.shift);
        queueSync('Импорт локальной базы');
        setLastMessage('Локальная база импортирована');
      } catch {
        setLastMessage('Не удалось импортировать файл базы');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
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
      if (window.icashboxPrint?.print) {
        await window.icashboxPrint.print(payload);
      } else {
        const response = await fetch('http://127.0.0.1:8787/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('print failed');
      }
      setLastMessage(
        type === 'sticker'
          ? `Наклейки отправлены: ${countStickerLabels(order)} шт.`
          : `Чек отправлен на принтер: ${payload.copies} коп.`
      );
    } catch {
      if (!silent) {
        setLastMessage('Print-agent не отвечает. Запустите npm run print-agent');
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

        <div className={isOnline ? 'network online' : 'network offline'}>
          {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          <div>
            <strong>{isOnline ? 'Онлайн' : 'Оффлайн'}</strong>
            <span>{pendingSync ? `${pendingSync} в очереди` : 'Локальная база'}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Автономная POS-система для кафе и ресторанов</p>
            <h1>{pageTitle(activeView)}</h1>
          </div>
          <div className="topbar-actions">
            <div className={shift.open ? 'shift-pill open' : 'shift-pill'}>
              <span>Смена #{shift.number}</span>
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
              {isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
              <span>{isOnline ? 'Синхронизация включена' : 'Работа без интернета'}</span>
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
            orderComment={orderComment}
            paidAmount={paidAmount}
            payments={payments}
            products={visibleProducts}
            search={search}
            selectedCategory={selectedCategory}
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
        {activeView === 'menu' && <MenuManager products={products} stock={stock} updateProduct={updateProduct} />}
        {activeView === 'orders' && (
          <OrderHistory
            orders={orders}
            cancelOrder={cancelOrder}
            markOrderReady={markOrderReady}
            printOrder={(order, type = 'receipt') => setPrintJob({ order, type, autoPrint: false })}
            requestReceiptCopies={requestReceiptCopies}
            sendToReceiptPrinter={sendToReceiptPrinter}
            refundOrder={refundOrder}
          />
        )}
        {activeView === 'inventory' && <Inventory stock={stock} receiveStock={receiveStock} />}
        {activeView === 'analytics' && (
          <Analytics
            addExpense={addExpense}
            expenses={expenses}
            orders={orders}
            shift={shift}
            closeShift={closeShift}
            openShift={openShift}
          />
        )}
        {activeView === 'cloud' && (
          <CloudSync
            exportLocalDatabase={exportLocalDatabase}
            importInputRef={importInputRef}
            importLocalDatabase={importLocalDatabase}
            isOnline={isOnline}
            loadPrinters={loadPrinters}
            printSettings={printSettings}
            printers={printers}
            setPrintSettings={setPrintSettings}
            syncQueue={syncQueue}
            toggleNetwork={toggleNetwork}
          />
        )}
        {activeView === 'roles' && <Roles accounts={accounts} />}
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
          onClose={() => setSettingsOpen(false)}
          printSettings={printSettings}
          printers={printers}
          setPrintSettings={setPrintSettings}
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
  orderComment,
  paidAmount,
  payments,
  products,
  search,
  selectedCategory,
  setOrderComment,
  setPayments,
  setSearch,
  setSelectedCategory,
  shift,
  updateQty,
  addToCart,
  clearCart
}) {
  return (
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
          {products.map((product) => (
            <button className="product-card" key={product.id} onClick={() => addToCart(product)}>
              <img src={product.image} alt="" />
              <span className="product-category">{product.category}</span>
              <strong>{product.name}</strong>
              <span>{product.size}</span>
              <b>{currency.format(product.price)}</b>
            </button>
          ))}
        </div>
      </div>

      <aside className="ticket-panel">
        <div className="section-row compact">
          <div>
            <h2>Заказ</h2>
            <p>Кассовая продажа · смена #{shift.number}</p>
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
                <span>{item.size}</span>
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
          <h3>Комбинированная оплата</h3>
          <label className="comment-field">
            <span>Комментарий</span>
            <input
              value={orderComment}
              onChange={(event) => setOrderComment(event.target.value)}
              placeholder="Например: без лука, срочно"
            />
          </label>
          {paymentMethods.map((method) => (
            <label key={method}>
              <span>{method}</span>
              <input
                type="number"
                min="0"
                value={payments[method]}
                onChange={(event) => setPayments({ ...payments, [method]: Number(event.target.value) })}
              />
            </label>
          ))}
        </div>

        <div className="ticket-total">
          <span>Итого</span>
          <strong>{currency.format(cartTotal)}</strong>
        </div>
        <div className={paidAmount >= cartTotal && cartTotal > 0 ? 'payment-status done' : 'payment-status'}>
          Оплачено: {currency.format(paidAmount)}
        </div>
        <button className="primary-action" disabled={!cart.length || !shift.open} onClick={createOrder}>
          <Check size={19} />
          <span>{shift.open ? 'Создать заказ' : 'Откройте смену'}</span>
        </button>
      </aside>
    </section>
  );
}

function MenuManager({ products, stock, updateProduct }) {
  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2>Управление меню</h2>
          <p>Цены, активность, стоп-лист, варианты и техкарты</p>
        </div>
        <button className="secondary-action">
          <Plus size={18} />
          <span>Позиция</span>
        </button>
      </div>
      <div className="menu-grid">
        {products.map((product) => (
          <article className={product.active ? 'menu-card' : 'menu-card paused'} key={product.id}>
            <img src={product.image} alt="" />
            <div className="menu-card-main">
              <span className="product-category">{product.category}</span>
              <h3>{product.name}</h3>
              <p>{product.size} · {product.modifiers.join(', ')}</p>
              <RecipePreview productId={product.id} stock={stock} />
            </div>
            <div className="menu-actions">
              <label>
                <span>Цена</span>
                <input
                  type="number"
                  min="0"
                  value={product.price}
                  onChange={(event) => updateProduct(product.id, { price: Number(event.target.value) })}
                />
              </label>
              <button
                className={product.active ? 'secondary-action' : 'primary-action'}
                onClick={() => updateProduct(product.id, { active: !product.active })}
              >
                {product.active ? <X size={17} /> : <Check size={17} />}
                <span>{product.active ? 'Стоп' : 'Вернуть'}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
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
  orders,
  cancelOrder,
  markOrderReady,
  printOrder,
  refundOrder,
  requestReceiptCopies,
  sendToReceiptPrinter
}) {
  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2>История заказов</h2>
          <p>Контроль оплат, отмен, возвратов и комментариев по смене</p>
        </div>
        <button className="secondary-action">
          <ReceiptText size={18} />
          <span>Экспорт</span>
        </button>
      </div>
      <div className="order-history">
        {orders.map((order) => (
          <article className="history-card" key={order.id}>
            <div className="history-main">
              <div className="order-head">
                <strong>#{order.id}</strong>
                <span className={orderStatusClass(order.status)}>{order.status}</span>
              </div>
              <p>{order.type} · {order.table} · {currency.format(order.total)}</p>
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
                <span>Экран</span>
              </button>
              <button className="secondary-action" onClick={() => requestReceiptCopies(order)}>
                <ReceiptText size={17} />
                <span>Принтер</span>
              </button>
              <button className="secondary-action" onClick={() => sendToReceiptPrinter(order, 'sticker')}>
                <Printer size={17} />
                <span>Стикеры</span>
              </button>
              <button
                className="secondary-action"
                disabled={['Готов', 'Выдан', 'Отменён', 'Возврат'].includes(order.status)}
                onClick={() => markOrderReady(order.id)}
              >
                <Check size={17} />
                <span>Готово</span>
              </button>
              <button className="secondary-action" disabled={order.cancelled} onClick={() => cancelOrder(order.id)}>
                <X size={17} />
                <span>Отмена</span>
              </button>
              <button className="secondary-action" disabled={order.refunded || !order.paid} onClick={() => refundOrder(order.id)}>
                <Undo2 size={17} />
                <span>Возврат</span>
              </button>
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

function Analytics({ addExpense, expenses, orders, shift, closeShift, openShift }) {
  const activeOrders = orders.filter((order) => !order.cancelled && !order.refunded);
  const revenue = activeOrders.reduce((sum, order) => sum + order.total, 0);
  const paid = activeOrders.filter((order) => order.paid).reduce((sum, order) => sum + order.total, 0);
  const average = Math.round(revenue / Math.max(activeOrders.length, 1));
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paymentTotals = paymentMethods.map((method) => [
    method,
    activeOrders.reduce((sum, order) => sum + Number(order.payments?.[method] || 0), 0)
  ]);
  const stats = [
    ['Выручка', revenue, BarChart3],
    ['Оплачено', paid, CreditCard],
    ['Средний чек', average, ReceiptText],
    ['Расходы', expenseTotal, Landmark]
  ];
  return (
    <section className="analytics">
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
              <p>Разбивка по способам оплаты за текущие данные</p>
            </div>
          </div>
          <div className="payment-report">
            {paymentTotals.map(([method, value]) => (
              <div key={method}>
                <span>{method}</span>
                <strong>{currency.format(value)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="data-section shift-section">
          <div>
            <h2>Закрытие смены</h2>
            <p>Кассир: {shift.cashier} · открыта: {shift.openedAt}</p>
          </div>
          <div className="shift-summary">
            <div><span>Заказы</span><strong>{orders.length}</strong></div>
            <div><span>Возвраты</span><strong>{currency.format(0)}</strong></div>
            <div><span>Факт наличных</span><strong>{currency.format(paymentTotals[0][1])}</strong></div>
            <div><span>Расхождение</span><strong>{currency.format(0)}</strong></div>
          </div>
          <button className="primary-action" onClick={shift.open ? closeShift : openShift}>
            {shift.open ? <Save size={18} /> : <Check size={18} />}
            <span>{shift.open ? 'Закрыть смену' : 'Открыть смену'}</span>
          </button>
        </div>
      </div>
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
    </section>
  );
}

function CloudSync({
  exportLocalDatabase,
  importInputRef,
  importLocalDatabase,
  isOnline,
  loadPrinters,
  printSettings,
  printers,
  setPrintSettings,
  syncQueue,
  toggleNetwork
}) {
  return (
    <section className="cloud-layout">
      <div className={isOnline ? 'sync-hero online' : 'sync-hero'}>
        <Smartphone size={34} />
        <h2>{isOnline ? 'Облачное управление активно' : 'Система работает локально'}</h2>
        <p>
          Меню, склад, заказы, смены и роли сохраняются на локальном сервере. При восстановлении связи очередь операций уходит в облако.
        </p>
        <button className="primary-action" onClick={toggleNetwork}>
          {isOnline ? <WifiOff size={18} /> : <Wifi size={18} />}
          <span>{isOnline ? 'Перейти в оффлайн' : 'Включить интернет'}</span>
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
            <h2>Журнал синхронизации</h2>
            <p>Двусторонняя очередь локальных и облачных изменений</p>
          </div>
          <Database size={22} />
        </div>
        <div className="sync-list">
          {syncQueue.map((item) => (
            <div className="sync-item" key={item.id}>
              <RotateCcw size={17} />
              <div>
                <strong>{item.type}</strong>
                <span>{item.source} · {item.time}</span>
              </div>
              <span className={item.status === 'Ожидает' ? 'badge warning' : 'badge'}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roles({ accounts }) {
  const rights = [
    { id: 'pos', label: 'Касса' },
    { id: 'orders', label: 'Заказы' },
    { id: 'menu', label: 'Меню' },
    { id: 'inventory', label: 'Склад' },
    { id: 'analytics', label: 'Отчёты' },
    { id: 'cloud', label: 'Облако' },
    { id: 'roles', label: 'Роли' }
  ];
  const roles = [
    { id: 'admin', title: 'Админ', text: 'Полный доступ к кассе, меню, складу, отчётам и настройкам.' },
    { id: 'cashier', title: 'Кассир', text: 'Работа с продажами и заказами.' }
  ];

  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2>Сотрудники и роли</h2>
          <p>Два уровня доступа для MVP-версии</p>
        </div>
        <button className="secondary-action" disabled>
          <UserRoundCog size={18} />
          <span>2 аккаунта</span>
        </button>
      </div>
      <div className="account-grid">
        {accounts.map((account) => (
          <article className="account-card" key={account.id}>
            <div>
              <strong>{account.name}</strong>
              <span>{roleLabels[account.role]}</span>
            </div>
            <code>PIN</code>
          </article>
        ))}
      </div>
      <div className="role-grid">
        {roles.map((role) => (
          <article className="role-card" key={role.id}>
            <h3>{role.title}</h3>
            <p>{role.text}</p>
            <div>
              {rights.map((right) => (
                <label key={right.id}>
                  <input type="checkbox" checked={roleAccess[role.id].includes(right.id)} readOnly />
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

function PrinterSettingsFields({ loadPrinters, printSettings, printers, setPrintSettings }) {
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
    </div>
  );
}

function SettingsModal({ loadPrinters, onClose, printSettings, printers, setPrintSettings }) {
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
            printSettings={printSettings}
            printers={printers}
            setPrintSettings={setPrintSettings}
          />
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
    return buildStickerPreview(order, printedAt);
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
  if (paid.length) {
    paid.forEach(([method, value]) => rows.push(receiptColumns(method, `${receiptMoney.format(value)} TJS`, width)));
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

function buildStickerPreview(order, printedAt) {
  const width = 38;
  const pages = [];

  for (const item of printableOrderLines(order)) {
    const qty = Math.max(1, Math.round(Number(item.qty || 1)));
    for (let index = 1; index <= qty; index += 1) {
      const rows = [];
      rows.push(receiptColumns(`Заказ #${order.id || ''}`, printedAt.slice(-5), width));
      rows.push(receiptRule(width));
      receiptWrap(String(item.name || '').toUpperCase(), width).forEach((row) => rows.push(receiptCenter(row, width)));
      if (qty > 1) rows.push(receiptCenter(`${index}/${qty}`, width));
      if (order.comment) {
        rows.push(receiptRule(width));
        receiptWrap(order.comment, width).forEach((row) => rows.push(row));
      }
      rows.push(receiptRule(width));
      pages.push(rows.join('\n'));
    }
  }

  return pages.join('\n\n');
}

function PrintModal({ order, onClose, onPrint, shift, type }) {
  const isSticker = type === 'sticker';
  const receiptText = buildPrintableReceipt(order, shift, type);

  return (
    <div className="modal-backdrop">
      <section
        className={isSticker ? 'receipt-modal sticker-print' : 'receipt-modal'}
        aria-label="Печать заказа"
      >
        <div className="section-row compact">
          <div>
            <h2>{isSticker ? 'Самоклейка' : 'Чек'} #{order.id}</h2>
            <p>{isSticker ? 'Комментарий' : 'iCashbox Cafe'} · смена #{shift.number}</p>
          </div>
          <button className="icon-button no-print" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {!isSticker && <img className="receipt-logo" src={receiptLogoUrl} alt="" />}
        <div className="receipt-body">
          <pre className="receipt-text">{receiptText}</pre>
        </div>
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
    cloud: 'Синхронизация',
    roles: 'Доступы'
  }[view];
}

function orderStatusClass(status) {
  if (status === 'Отменён' || status === 'Возврат') return 'badge danger';
  if (status === 'Новый' || status === 'Принят' || status === 'Готовится') return 'badge warning';
  return 'badge';
}

export default App;
