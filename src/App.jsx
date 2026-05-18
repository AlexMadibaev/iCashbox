import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  Check,
  ChefHat,
  ClipboardList,
  CircleDollarSign,
  Cloud,
  CloudOff,
  CreditCard,
  Database,
  Download,
  Landmark,
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

const blankPayments = { Наличные: 0, Alif: 0, 'Dushanbe City': 0, Карта: 0, Перевод: 0 };
const paymentMethods = Object.keys(blankPayments);

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
  { id: 'kitchen', label: 'Кухня', icon: ChefHat },
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

function App() {
  const [activeView, setActiveView] = useState('pos');
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [printSettings, setPrintSettings] = useStoredState('icashbox.printSettings', {
    autoReceipt: false,
    autoKitchen: true,
    directAgent: true,
    printerName: '',
    stickerPrinterName: ''
  });
  const [printers, setPrinters] = useState([]);
  const importInputRef = useRef(null);

  const categories = useMemo(() => ['Все', ...new Set(products.map((item) => item.category))], [products]);
  const visibleProducts = products.filter((item) => {
    const categoryMatch = selectedCategory === 'Все' || item.category === selectedCategory;
    const searchMatch = `${item.name} ${item.size} ${item.category}`.toLowerCase().includes(search.toLowerCase());
    return item.active && categoryMatch && searchMatch;
  });
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const paidAmount = Object.values(payments).reduce((sum, value) => sum + Number(value || 0), 0);
  const pendingSync = syncQueue.filter((item) => item.status === 'Ожидает').length;

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
    if (!cart.length || !shift.open) return;
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
    if (printSettings.directAgent && (printSettings.autoReceipt || printSettings.autoKitchen)) {
      sendToReceiptPrinter(nextOrder, printSettings.autoReceipt ? 'receipt' : 'kitchen', true);
    } else if (printSettings.autoReceipt) {
      setPrintJob({ order: nextOrder, type: 'receipt', autoPrint: true });
    } else if (printSettings.autoKitchen) {
      setPrintJob({ order: nextOrder, type: 'kitchen', autoPrint: true });
    } else {
      setPrintJob({ order: nextOrder, type: 'receipt', autoPrint: false });
    }
    setCart([]);
    setOrderComment('');
    setPayments(blankPayments);
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

  const sendToReceiptPrinter = async (order, type = 'receipt', silent = false) => {
    try {
      const printerName = type === 'sticker' ? printSettings.stickerPrinterName : printSettings.printerName;
      const response = await fetch('http://127.0.0.1:8787/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order,
          printerName: printerName.trim(),
          shift,
          type
        })
      });
      if (!response.ok) throw new Error('print failed');
      setLastMessage(
        type === 'sticker'
          ? 'Комментарий отправлен на принтер самоклеек'
          : type === 'kitchen'
            ? 'Кухонный талон отправлен на принтер'
            : 'Чек отправлен на принтер'
      );
    } catch {
      if (!silent) {
        setLastMessage('Print-agent не отвечает. Запустите npm run print-agent');
      }
      setPrintJob({ order, type, autoPrint: !silent });
    }
  };

  const loadPrinters = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8787/printers');
      const payload = await response.json();
      setPrinters(payload.printers || []);
      setLastMessage('Список принтеров обновлён');
    } catch {
      setLastMessage('Print-agent не отвечает. Запустите npm run print-agent');
    }
  };

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
          {navItems.map((item) => {
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
            printOrder={(order, type = 'receipt') => setPrintJob({ order, type, autoPrint: false })}
            sendToReceiptPrinter={sendToReceiptPrinter}
            refundOrder={refundOrder}
          />
        )}
        {activeView === 'kitchen' && (
          <Kitchen
            orders={orders}
            printKitchenTicket={(order) => setPrintJob({ order, type: 'kitchen', autoPrint: false })}
            sendToReceiptPrinter={sendToReceiptPrinter}
            setOrders={setOrders}
            queueSync={queueSync}
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
        {activeView === 'roles' && <Roles />}
      </main>
      {printJob && (
        <PrintModal
          autoPrint={printJob.autoPrint}
          order={printJob.order}
          onClose={() => setPrintJob(null)}
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
    </div>
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

function OrderHistory({ orders, cancelOrder, printOrder, refundOrder, sendToReceiptPrinter }) {
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
              <button className="secondary-action" onClick={() => sendToReceiptPrinter(order, 'receipt')}>
                <ReceiptText size={17} />
                <span>Принтер</span>
              </button>
              <button className="secondary-action" disabled={!order.comment} onClick={() => sendToReceiptPrinter(order, 'sticker')}>
                <Printer size={17} />
                <span>Наклейка</span>
              </button>
              <button className="secondary-action" onClick={() => printOrder(order, 'kitchen')}>
                <ChefHat size={17} />
                <span>Кухня</span>
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

function Kitchen({ orders, printKitchenTicket, sendToReceiptPrinter, setOrders, queueSync }) {
  const statuses = ['Новый', 'Принят', 'Готовится', 'Готов', 'Выдан', 'Оплачен'];
  return (
    <section className="kitchen-board">
      {statuses.map((status) => (
        <div className="kitchen-column" key={status}>
          <h2>{status}</h2>
          {orders
            .filter((order) => order.status === status)
            .map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-head">
                  <strong>#{order.id}</strong>
                  <span>{order.minutes} мин</span>
                </div>
                <p>{order.type} · {order.table} · {currency.format(order.total)}</p>
                <ul>
                  {order.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setOrders((current) =>
                      current.map((item) =>
                        item.id === order.id ? { ...item, status: nextStatus(status) } : item
                      )
                    );
                    queueSync('Изменение статуса заказа');
                  }}
                >
                  <Check size={16} />
                  <span>Далее</span>
                </button>
                <button onClick={() => printKitchenTicket(order)}>
                  <Printer size={16} />
                  <span>Экран</span>
                </button>
                <button onClick={() => sendToReceiptPrinter(order, 'kitchen')}>
                  <ReceiptText size={16} />
                  <span>Принтер</span>
                </button>
              </article>
            ))}
        </div>
      ))}
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

function Roles() {
  const roles = ['Владелец', 'Администратор', 'Кассир', 'Официант', 'Повар', 'Склад', 'Бухгалтер'];
  const rights = ['Касса', 'Отчёты', 'Меню', 'Склад', 'Финансы', 'Сотрудники'];
  return (
    <section className="data-section">
      <div className="section-row">
        <div>
          <h2>Сотрудники и роли</h2>
          <p>Гибкая матрица доступа для локальной и облачной части</p>
        </div>
        <button className="secondary-action">
          <UserRoundCog size={18} />
          <span>Сотрудник</span>
        </button>
      </div>
      <div className="role-grid">
        {roles.map((role, roleIndex) => (
          <article className="role-card" key={role}>
            <h3>{role}</h3>
            <div>
              {rights.map((right, index) => (
                <label key={right}>
                  <input type="checkbox" defaultChecked={roleIndex < 2 || index <= Math.max(0, 4 - roleIndex)} />
                  <span>{right}</span>
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
      <label>
        <input
          checked={printSettings.autoKitchen}
          type="checkbox"
          onChange={(event) =>
            setPrintSettings((current) => ({ ...current, autoKitchen: event.target.checked }))
          }
        />
        <span>Автопечать кухонного талона</span>
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

function PrintModal({ autoPrint, order, onClose, shift, type }) {
  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  const paid = Object.entries(order.payments || {}).filter(([, value]) => Number(value) > 0);
  const isKitchen = type === 'kitchen';
  const isSticker = type === 'sticker';

  return (
    <div className="modal-backdrop">
      <section
        className={isSticker ? 'receipt-modal sticker-print' : isKitchen ? 'receipt-modal kitchen-print' : 'receipt-modal'}
        aria-label="Печать заказа"
      >
        <div className="section-row compact">
          <div>
            <h2>{isSticker ? 'Самоклейка' : isKitchen ? 'Кухонный талон' : 'Чек'} #{order.id}</h2>
            <p>{isSticker ? 'Комментарий' : isKitchen ? 'Кухня' : 'iCashbox Cafe'} · смена #{shift.number}</p>
          </div>
          <button className="icon-button no-print" title="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="receipt-body">
          <div className="receipt-line">
            <span>Тип</span>
            <strong>{order.type}</strong>
          </div>
          <div className="receipt-line">
            <span>Место</span>
            <strong>{order.table}</strong>
          </div>
          <div className="receipt-line">
            <span>Статус</span>
            <strong>{order.status}</strong>
          </div>
          <div className="receipt-items">
            {order.items.map((item) => (
              <div key={item}>
                <span>{item}</span>
              </div>
            ))}
          </div>
          {order.comment && <p className="order-comment">{order.comment}</p>}
          {!isKitchen && !isSticker && (
            <>
              <div className="receipt-line total">
                <span>Итого</span>
                <strong>{currency.format(order.total)}</strong>
              </div>
              <div className="receipt-payments">
                {paid.length ? (
                  paid.map(([method, value]) => (
                    <div key={method}>
                      <span>{method}</span>
                      <strong>{currency.format(value)}</strong>
                    </div>
                  ))
                ) : (
                  <div>
                    <span>Оплата</span>
                    <strong>Ожидает</strong>
                  </div>
                )}
              </div>
            </>
          )}
          {isKitchen && (
            <div className="kitchen-print-note">
              <strong>Передать на приготовление</strong>
              <span>Таймер и статус меняются на кухонном экране</span>
            </div>
          )}
          {isSticker && (
            <div className="kitchen-print-note">
              <strong>{order.comment || 'Без комментария'}</strong>
              <span>Печать на самоклейку</span>
            </div>
          )}
        </div>
        <div className="modal-actions no-print">
          <button className="secondary-action" onClick={() => window.print()}>
            <Printer size={18} />
            <span>Печатать</span>
          </button>
          <button className="primary-action" onClick={onClose}>
            <Check size={18} />
            <span>Готово</span>
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
    kitchen: 'Кухонный экран',
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

function nextStatus(status) {
  return {
    Новый: 'Принят',
    Принят: 'Готовится',
    Готовится: 'Готов',
    Готов: 'Выдан',
    Выдан: 'Оплачен',
    Оплачен: 'Оплачен'
  }[status];
}

export default App;
