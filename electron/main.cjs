const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const { createServer } = require('node:http');
const { request: httpsRequest } = require('node:https');
const { spawn } = require('node:child_process');
const { appendFileSync, existsSync, mkdirSync } = require('node:fs');
const { readFile, writeFile, unlink } = require('node:fs/promises');
const { join } = require('node:path');
const { networkInterfaces, tmpdir } = require('node:os');

const PRINT_PORT = 8787;
const LIVE_PORT = 8788;
const STICKER_WIDTH_MM = 57;
const STICKER_HEIGHT_MM = 40;
const STICKER_GAP_MM = 2.3;
const PAPER_UNITS_PER_MM = 100 / 25.4;
const STICKER_PAPER_WIDTH = mmToPaperUnits(STICKER_WIDTH_MM);
const STICKER_CONTENT_HEIGHT = mmToPaperUnits(STICKER_HEIGHT_MM);
const STICKER_GAP_HEIGHT = mmToPaperUnits(STICKER_GAP_MM);
const STICKER_PAPER_HEIGHT = STICKER_CONTENT_HEIGHT + STICKER_GAP_HEIGHT;
const STICKER_PRINT_PAUSE_MS = 350;
const NETWORK_TIME_ZONE_OFFSET = '+05:00';
let mainWindow;
let splashWindow;
let splashStartedAt = 0;
let printServer;
let liveServer;
let liveSnapshot = {
  ok: true,
  updatedAt: new Date().toISOString(),
  message: 'Касса запускается',
  shift: { open: false, label: 'Смена' },
  summary: { average: 0, checks: 0, revenue: 0 },
  payments: [],
  topProducts: [],
  recentOrders: []
};
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

function mmToPaperUnits(value) {
  return Math.round(value * PAPER_UNITS_PER_MM);
}

const stickerWishStarts = [
  'Пусть сегодня',
  'Пусть этот день',
  'Пусть впереди',
  'Пусть рядом',
  'Пусть в сердце',
  'Пусть в делах',
  'Пусть в мыслях',
  'Пусть в дороге',
  'Пусть в доме',
  'Пусть в планах',
  'Пусть в каждом часе',
  'Пусть в этой минуте',
  'Пусть после этого вкуса',
  'Пусть с первого глотка',
  'Пусть до самого вечера'
];

const stickerWishMiddles = [
  'будет больше тепла',
  'найдется место для радости',
  'появится легкость',
  'останется приятное спокойствие',
  'родится добрая улыбка',
  'прибавится вдохновение',
  'зазвучит хорошее настроение',
  'случится маленькая удача',
  'станет чуть светлее',
  'будет повод улыбнуться'
];

const stickerWishEndings = [
  ', без лишней спешки.',
  ', с хорошим послевкусием.',
  ', именно в нужный момент.',
  ', как маленький знак заботы.',
  ', чтобы день шел легче.',
  ', и это останется с вами.',
  ', с улыбкой внутри.',
  ', спокойно и красиво.',
  ', по-доброму и вовремя.',
  ', так, как вам нужно.'
];

const stickerWishBank = stickerWishStarts.flatMap((start) =>
  stickerWishMiddles.flatMap((middle) => stickerWishEndings.map((ending) => `${start} ${middle}${ending}`))
);

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function stickerWishForSeed(seed) {
  return stickerWishBank[hashString(seed) % stickerWishBank.length];
}

function logLine(message) {
  try {
    const dir = app.isReady() ? app.getPath('userData') : tmpdir();
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'icashbox-main.log'), `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {
    // Logging must never stop the POS from opening.
  }
}

process.on('uncaughtException', (error) => {
  logLine(`uncaughtException: ${error.stack || error.message}`);
});

process.on('unhandledRejection', (error) => {
  logLine(`unhandledRejection: ${error?.stack || error}`);
});

function receiptLogoPath() {
  const candidates = [
    join(__dirname, '..', 'dist', 'pos-logo.png'),
    join(__dirname, '..', 'public', 'pos-logo.png')
  ];
  return candidates.find((candidate) => existsSync(candidate)) || '';
}

function appIconPath() {
  const candidates = [
    join(__dirname, '..', 'dist', 'app-icon.ico'),
    join(__dirname, '..', 'public', 'app-icon.ico')
  ];
  return candidates.find((candidate) => existsSync(candidate)) || undefined;
}

function createSplashWindow() {
  splashStartedAt = Date.now();
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    resizable: false,
    movable: true,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    icon: appIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const logoPath = receiptLogoPath();
  const logoUrl = logoPath ? `file:///${logoPath.replace(/\\/g, '/')}` : '';
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      font-family: Inter, "Segoe UI", system-ui, sans-serif;
      background: transparent;
      color: #f7fbf7;
    }
    body {
      display: grid;
      place-items: center;
    }
    .splash {
      position: relative;
      display: grid;
      width: 480px;
      min-height: 310px;
      align-content: center;
      justify-items: center;
      gap: 20px;
      padding: 34px;
      overflow: hidden;
      border: 1px solid rgba(183, 240, 113, 0.22);
      border-radius: 18px;
      background:
        radial-gradient(circle at 50% 12%, rgba(183, 240, 113, 0.2), transparent 34%),
        linear-gradient(135deg, #17201b, #0f1713);
      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.38);
    }
    .splash::before {
      position: absolute;
      inset: 0;
      background: linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.06) 45%, transparent 72%);
      content: "";
      transform: translateX(-100%);
      animation: sweep 2.4s ease-in-out infinite;
    }
    .logo-wrap {
      position: relative;
      display: grid;
      width: 116px;
      height: 116px;
      place-items: center;
      border-radius: 16px;
      background: #ffffff;
      box-shadow: 0 18px 46px rgba(0, 0, 0, 0.24);
    }
    .logo-wrap::after {
      position: absolute;
      inset: -11px;
      border: 2px solid rgba(183, 240, 113, 0.26);
      border-top-color: #b7f071;
      border-radius: 22px;
      content: "";
      animation: spin 1.05s linear infinite;
    }
    .logo-wrap img {
      display: block;
      width: 86px;
      max-height: 70px;
      object-fit: contain;
    }
    .fallback-mark {
      display: grid;
      width: 72px;
      height: 72px;
      place-items: center;
      border-radius: 14px;
      background: #b7f071;
      color: #17201b;
      font-size: 40px;
      font-weight: 900;
    }
    .copy {
      display: grid;
      gap: 8px;
      text-align: center;
    }
    .copy strong {
      font-size: 34px;
      line-height: 1;
      letter-spacing: 0;
    }
    .copy span {
      color: #b4c4ba;
      font-size: 14px;
      font-weight: 800;
    }
    .track {
      width: 270px;
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(247, 251, 247, 0.13);
    }
    .track span {
      display: block;
      width: 42%;
      height: 100%;
      border-radius: inherit;
      background: #b7f071;
      animation: progress 1.12s ease-in-out infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes progress {
      0% { transform: translateX(-115%); }
      100% { transform: translateX(255%); }
    }
    @keyframes sweep {
      0%, 38% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  </style>
</head>
<body>
  <main class="splash">
    <div class="logo-wrap">
      ${logoUrl ? `<img src="${logoUrl}" alt="">` : '<div class="fallback-mark">$</div>'}
    </div>
    <div class="copy">
      <strong>iCashbox</strong>
      <span>Запускаем кассу</span>
    </div>
    <div class="track" aria-hidden="true"><span></span></div>
  </main>
</body>
</html>`;

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch((error) => {
    logLine(`splash loadURL failed: ${error.stack || error.message}`);
  });
}

function closeSplashWhenReady() {
  const minVisibleMs = 1300;
  const elapsed = Date.now() - splashStartedAt;
  const delay = Math.max(0, minVisibleMs - elapsed);

  setTimeout(() => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
  }, delay);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

function localLiveUrls() {
  const urls = [`http://127.0.0.1:${LIVE_PORT}`];
  const nets = networkInterfaces();
  Object.values(nets).forEach((items = []) => {
    items.forEach((item) => {
      if (item.family === 'IPv4' && !item.internal) {
        urls.push(`http://${item.address}:${LIVE_PORT}`);
      }
    });
  });
  return [...new Set(urls)];
}

function moneyHtml(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ru-RU')} TJS`;
}

function liveDashboardHtml() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#17201b">
  <title>iCashbox Live</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f7f8f5;color:#17201b;font-family:Inter,"Segoe UI",system-ui,sans-serif}
    main{width:min(100%,520px);min-height:100vh;margin:0 auto;padding:16px 14px 28px;display:grid;gap:12px}
    header{position:sticky;top:0;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;background:rgba(247,248,245,.94);backdrop-filter:blur(14px)}
    h1{margin:0;font-size:24px}.muted{color:#64736a;font-size:12px;font-weight:800}.pill{padding:8px 10px;border-radius:8px;background:#17201b;color:#fff;font-size:12px;font-weight:900}
    .hero,.card{border:1px solid #e0e6e1;border-radius:10px;background:#fff}.hero{padding:20px;background:linear-gradient(135deg,#17201b,#26372d);color:#fff}
    .hero span{color:#b7f071;font-weight:900}.hero strong{display:block;margin:8px 0;font-size:42px;line-height:1}.hero p{margin:0;color:#dfe9dd}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card{padding:14px;display:grid;gap:6px}.card span{color:#64736a;font-size:12px;font-weight:800}.card strong{font-size:22px}
    .section{display:grid;gap:8px}.section h2{margin:4px 0 0;font-size:18px}.row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;border:1px solid #e0e6e1;border-radius:8px;background:#fff}
    .row div{display:grid;gap:3px}.row span{color:#64736a;font-size:12px}.row b{font-size:15px}.empty{padding:22px;border:1px dashed #ccd6cc;border-radius:10px;color:#64736a;text-align:center;font-weight:900}
  </style>
</head>
<body>
  <main>
    <header><div><span class="muted">iCashbox</span><h1>Касса Live</h1></div><span class="pill" id="shift">...</span></header>
    <section class="hero"><span id="updated">...</span><strong id="revenue">0 TJS</strong><p id="cashier">Загрузка...</p></section>
    <section class="grid">
      <article class="card"><span>Чеки</span><strong id="checks">0</strong></article>
      <article class="card"><span>Средний чек</span><strong id="average">0 TJS</strong></article>
    </section>
    <section class="section"><h2>Оплаты</h2><div id="payments"></div></section>
    <section class="section"><h2>Последние заказы</h2><div id="orders"></div></section>
    <section class="section"><h2>Топ товаров</h2><div id="products"></div></section>
  </main>
  <script>
    const money = (v) => Math.round(Number(v || 0)).toLocaleString('ru-RU') + ' TJS';
    const row = (left, sub, right) => '<div class="row"><div><b>'+left+'</b><span>'+sub+'</span></div><strong>'+right+'</strong></div>';
    async function load(){
      const res = await fetch('/api/live', { cache: 'no-store' });
      const data = await res.json();
      document.getElementById('shift').textContent = data.shift?.open ? 'Открыта' : 'Закрыта';
      document.getElementById('updated').textContent = new Date(data.updatedAt).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      document.getElementById('revenue').textContent = money(data.summary?.revenue);
      document.getElementById('cashier').textContent = (data.shift?.label || 'Смена') + ' · ' + (data.shift?.cashier || 'Кассир');
      document.getElementById('checks').textContent = data.summary?.checks || 0;
      document.getElementById('average').textContent = money(data.summary?.average);
      document.getElementById('payments').innerHTML = (data.payments || []).length ? data.payments.map(p => row(p.method, 'способ оплаты', money(p.total))).join('') : '<div class="empty">Оплат пока нет</div>';
      document.getElementById('orders').innerHTML = (data.recentOrders || []).length ? data.recentOrders.map(o => row('#'+o.id, (o.items || []).join(', '), money(o.total))).join('') : '<div class="empty">Заказов пока нет</div>';
      document.getElementById('products').innerHTML = (data.topProducts || []).length ? data.topProducts.map(p => row(p.name, p.qty + ' шт', money(p.total))).join('') : '<div class="empty">Продаж пока нет</div>';
    }
    load();
    setInterval(load, 4000);
  </script>
</body>
</html>`;
}

function startLiveServer() {
  if (liveServer) return;
  liveServer = createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(liveDashboardHtml());
      return;
    }
    if (req.method === 'GET' && req.url === '/api/live') {
      sendJson(res, 200, liveSnapshot);
      return;
    }
    if (req.method === 'GET' && req.url === '/api/urls') {
      sendJson(res, 200, { urls: localLiveUrls() });
      return;
    }
    sendJson(res, 404, { ok: false, error: 'Not found' });
  });
  liveServer.on('error', (error) => {
    if (error.code !== 'EADDRINUSE') console.error(error);
  });
  liveServer.listen(LIVE_PORT, '0.0.0.0');
}

function requestJson(url, timeoutMs = 4500) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { headers: { Accept: 'application/json' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if ((res.statusCode || 0) >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Network time request timed out'));
    });
    req.on('error', reject);
    req.end();
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
    const iso = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}${NETWORK_TIME_ZONE_OFFSET}`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

async function fetchNetworkTime() {
  const sources = [
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
      const payload = await requestJson(item.url);
      const date = parseNetworkTimePayload(payload);
      if (date) return { iso: date.toISOString(), ok: true, source: item.source };
    } catch (error) {
      logLine(`network time failed (${item.source}): ${error.message}`);
    }
  }

  throw new Error('Network time is unavailable');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', command], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `PowerShell failed with code ${code}`));
    });
  });
}

function runCommand(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `${file} failed with code ${code}`));
    });
  });
}

function addPrinterName(value, names) {
  const name = String(value || '').trim().replace(/^"|"$/g, '');
  if (!name || /^Name$/i.test(name) || /^-+$/.test(name) || name.startsWith('HKEY_')) return;

  if (name.startsWith(',,') && name.includes(',')) {
    const [, , server, ...printerParts] = name.split(',');
    const printer = printerParts.join(',').trim();
    if (server && printer) {
      names.add(`\\\\${server}\\${printer}`);
      return;
    }
  }

  names.add(name);
}

function addLinePrinterNames(output, names) {
  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => addPrinterName(line, names));
}

function addRegistryPrinterNames(output, names) {
  const printerRoots = [
    'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers\\',
    'HKEY_CURRENT_USER\\Printers\\Connections\\'
  ];
  const ignoredValues = new Set(['DefaultSpoolDirectory', 'ResetDevmodesAttempts', 'LANGIDOfLastDefaultDevmode']);
  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      for (const printerRoot of printerRoots) {
        if (line.startsWith(printerRoot)) {
          addPrinterName(line.slice(printerRoot.length), names);
          return;
        }
      }

      const deviceMatch = line.match(/^(.+?)\s+REG_(?:SZ|MULTI_SZ|EXPAND_SZ)\s+/);
      if (deviceMatch && !deviceMatch[1].startsWith('HKEY_') && !ignoredValues.has(deviceMatch[1].trim())) {
        addPrinterName(deviceMatch[1], names);
      }
    });
}

async function listPrinters() {
  const names = new Set();

  if (mainWindow?.webContents?.getPrintersAsync) {
    try {
      const electronPrinters = await mainWindow.webContents.getPrintersAsync();
      for (const printer of electronPrinters) {
        addPrinterName(printer.name, names);
        addPrinterName(printer.displayName, names);
        addPrinterName(printer.options?.deviceName, names);
      }
    } catch {
      // Fall back to Windows registry / PowerShell below.
    }
  }

  const registryCommands = [
    ['reg.exe', ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers']],
    ['reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices']],
    ['reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\PrinterPorts']],
    ['reg.exe', ['query', 'HKCU\\Printers\\Connections', '/s']]
  ];

  for (const [file, args] of registryCommands) {
    try {
      addRegistryPrinterNames(await runCommand(file, args), names);
    } catch {
      // Try PowerShell fallbacks below.
    }
  }

  const commandLinePrinterCommands = [['wmic.exe', ['printer', 'get', 'name']]];
  for (const [file, args] of commandLinePrinterCommands) {
    try {
      addLinePrinterNames(await runCommand(file, args), names);
    } catch {
      // WMIC is unavailable on some Windows installations.
    }
  }

  const commands = [
    "[System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ForEach-Object { $_ } | ConvertTo-Json",
    "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json",
    "Get-CimInstance -ClassName Win32_Printer | Select-Object -ExpandProperty Name | ConvertTo-Json",
    "Get-WmiObject -Class Win32_Printer | Select-Object -ExpandProperty Name | ConvertTo-Json",
    "Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers' | Select-Object -ExpandProperty PSChildName | ConvertTo-Json",
    "Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices' | Select-Object -Property * | ConvertTo-Json",
    "Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\PrinterPorts' | Select-Object -Property * | ConvertTo-Json",
    "Get-ChildItem 'HKCU:\\Printers\\Connections' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PSChildName | ConvertTo-Json",
    "Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers' | ForEach-Object { $_.PSChildName }",
    "Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices' | ForEach-Object { $_.PSObject.Properties.Name | Where-Object { $_ -notlike 'PS*' } }",
    "Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\PrinterPorts' | ForEach-Object { $_.PSObject.Properties.Name | Where-Object { $_ -notlike 'PS*' } }"
  ];

  for (const command of commands) {
    try {
      const output = await runPowerShell(command);
      const trimmed = output.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.filter(Boolean).forEach((name) => addPrinterName(name, names));
        } else if (typeof parsed === 'string') {
          addPrinterName(parsed, names);
        } else if (parsed && typeof parsed === 'object') {
          Object.keys(parsed)
            .filter((key) => !key.startsWith('PS') && parsed[key])
            .forEach((name) => addPrinterName(name, names));
        }
      } catch {
        addLinePrinterNames(trimmed, names);
      }
    } catch {
      // Try the next method.
    }
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function psQuote(value) {
  return `'${String(value || '').replace(/'/g, "''")}'`;
}

async function printerDiagnostics(printerName = '') {
  const command = `
$requestedName = ${psQuote(printerName)}
$printer = $null
if ($requestedName) {
  $printer = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -ieq $requestedName } | Select-Object -First 1
} else {
  $printer = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Default } | Select-Object -First 1
}
if (-not $printer) {
  [pscustomobject]@{
    exists = $false
    requestedName = $requestedName
  } | ConvertTo-Json -Compress
  exit
}
$jobs = @(Get-PrintJob -PrinterName $printer.Name -ErrorAction SilentlyContinue)
$printInfo = Get-Printer -Name $printer.Name -ErrorAction SilentlyContinue
[pscustomobject]@{
  exists = $true
  name = $printer.Name
  isDefault = [bool]$printer.Default
  workOffline = [bool]$printer.WorkOffline
  printerStatus = [int]$printer.PrinterStatus
  extendedPrinterStatus = [int]$printer.ExtendedPrinterStatus
  detectedErrorState = [int]$printer.DetectedErrorState
  printerStatusText = if ($printInfo) { [string]$printInfo.PrinterStatus } else { '' }
  portName = $printer.PortName
  driverName = $printer.DriverName
  jobCount = if ($printInfo -and $null -ne $printInfo.JobCount) { [int]$printInfo.JobCount } else { $jobs.Count }
  jobs = @($jobs | Select-Object -First 5 ID, DocumentName, JobStatus, SubmittedTime)
} | ConvertTo-Json -Compress -Depth 4
`;
  const output = (await runPowerShell(command)).trim();
  return output ? JSON.parse(output) : { exists: false, requestedName: printerName };
}

function assertPrinterReady(diagnostics) {
  if (!diagnostics.exists) {
    throw new Error(
      diagnostics.requestedName
        ? `Принтер "${diagnostics.requestedName}" не найден в Windows`
        : 'В Windows не выбран принтер по умолчанию'
    );
  }

  if (diagnostics.workOffline) {
    throw new Error(
      `Принтер "${diagnostics.name}" в режиме offline. В Windows отключите "Use Printer Offline" и проверьте USB/питание. В очереди: ${diagnostics.jobCount}.`
    );
  }

  if (/error|offline|paused/i.test(String(diagnostics.printerStatusText || ''))) {
    throw new Error(
      `Принтер "${diagnostics.name}" сейчас в статусе ${diagnostics.printerStatusText}. Проверьте питание, USB и очистите очередь. В очереди: ${diagnostics.jobCount}.`
    );
  }
}

function center(text, width = 36) {
  const value = String(text || '').slice(0, width);
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return `${' '.repeat(left)}${value}`;
}

function line(width = 36) {
  return '-'.repeat(width);
}

function money(value) {
  return Number(value || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function padColumns(left, right, width = 36) {
  const l = String(left || '');
  const r = String(right || '');
  const space = Math.max(1, width - l.length - r.length);
  return `${l}${' '.repeat(space)}${r}`;
}

function formatShiftNumber(date = new Date()) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

function normalizeShiftNumber(value) {
  const text = String(value ?? '').trim();
  return /^\d{2}\.\d{2}$/.test(text) ? text : formatShiftNumber();
}

function shiftLabel(shift) {
  return `Смена ${normalizeShiftNumber(shift?.number)}`;
}

function parseOrderItem(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/^(.*)\s+x(\d+)$/i);
  return {
    name: match ? match[1].trim() : text,
    qty: match ? Number(match[2]) : 1
  };
}

function orderLines(order) {
  if (Array.isArray(order.lines) && order.lines.length) {
    return order.lines.map((line) => ({
      name: `${line.name || ''}${line.size ? ` ${line.size}` : ''}`.trim(),
      price: Number(line.price || 0),
      qty: Number(line.qty || 1),
      total: Number(line.total || Number(line.price || 0) * Number(line.qty || 1))
    }));
  }

  const items = order.items || [];
  const fallbackPrice = items.length ? Math.round(Number(order.total || 0) / items.length) : 0;
  return items.map((item) => {
    const parsed = parseOrderItem(item);
    return {
      name: parsed.name,
      price: fallbackPrice,
      qty: parsed.qty,
      total: fallbackPrice * parsed.qty
    };
  });
}

function wrapText(text, width = 36) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function formatGuestName(name) {
  const cleanName = String(name || '').trim();
  return cleanName || 'Дорогой гость';
}

function stickerWish(order, labelIndex) {
  return (
    order.stickerWishes?.[labelIndex] ||
    order.stickerWish ||
    stickerWishForSeed(`${order.id || 'order'}-${labelIndex}`)
  );
}

function stickerPages(payload, width = 30) {
  const order = payload.order || {};
  const lines = orderLines(order);
  const guestName = formatGuestName(order.guestName);
  const pages = [];
  let labelIndex = 0;

  for (const item of lines) {
    const qty = Math.max(1, Math.round(Number(item.qty || 1)));
    for (let index = 1; index <= qty; index += 1) {
      const rows = [];
      rows.push(guestName);
      wrapText(stickerWish(order, labelIndex), width).forEach((row) => rows.push(row));
      pages.push(rows.join('\r\n'));
      labelIndex += 1;
    }
  }

  if (!pages.length) {
    pages.push([guestName, ...wrapText(stickerWish(order, 0), width)].join('\r\n'));
  }

  return pages.join('\f');
}

function receiptText(payload) {
  const width = 30;
  const order = payload.order || {};
  const isKitchen = payload.type === 'kitchen';
  const isSticker = payload.type === 'sticker';
  const payments = Object.entries(order.payments || {}).filter(([, value]) => Number(value) > 0);
  const paidTotal = payments.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const change = Math.max(0, Math.round((paidTotal - Number(order.total || 0)) * 100) / 100);
  const lines = orderLines(order);
  const now = new Date();
  const time = now.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const rows = [];

  if (isSticker) return stickerPages(payload);

  if (!isKitchen && !isSticker) {
    rows.push(padColumns('Чек №', order.id || '', width));
    rows.push(padColumns('Кассир', payload.shift?.cashier || 'Кассир', width));
    rows.push(padColumns('Открыто', time, width));
    rows.push(padColumns('Напечатано', time, width));
    rows.push(padColumns('Заказ №', String(order.id || '').slice(-3), width));
    rows.push(line(width));
  } else {
    rows.push(center(isSticker ? 'НАКЛЕЙКА' : 'КУХОННЫЙ ТАЛОН', width));
    rows.push(center(isSticker ? 'КОММЕНТАРИЙ' : 'НА ПРИГОТОВЛЕНИЕ', width));
    rows.push(line(width));
    rows.push(padColumns(`Заказ #${order.id || ''}`, shiftLabel(payload.shift), width));
    rows.push(padColumns(order.type || 'Продажа', order.status || '', width));
    rows.push(line(width));
  }

  if (!isSticker && !isKitchen) {
    rows.push('Наименование К-во Цена Итого');
    rows.push(line(width));
  }

  for (const item of lines) {
    if (isKitchen || isSticker) {
      wrapText(`${item.qty} x ${item.name}`, width).forEach((row) => rows.push(row));
      continue;
    }

    const qty = String(item.qty).padStart(3, ' ');
    const price = money(item.price).padStart(6, ' ');
    const total = money(item.total).padStart(7, ' ');
    const nameWidth = Math.max(10, width - qty.length - price.length - total.length - 3);
    const wrapped = wrapText(item.name, nameWidth);
    rows.push(`${wrapped[0].padEnd(nameWidth)} ${qty} ${price} ${total}`);
    wrapped.slice(1).forEach((row) => rows.push(row));
  }

  if (order.comment && !isSticker) {
    rows.push(line(width));
    rows.push('Комментарий:');
    wrapText(order.comment, width).forEach((row) => rows.push(row));
  }

  if (!isKitchen && !isSticker) {
    rows.push('');
    rows.push(`К оплате ${'.'.repeat(10)} ${money(order.total)} TJS`);
    if (payments.length) {
      rows.push('');
      rows.push(line(width));
      rows.push('');
      rows.push('Оплата');
      rows.push('');
      for (const [method, value] of payments) {
        rows.push(padColumns(method, `${money(value)} TJS`, width));
      }
      if (change > 0) {
        rows.push(padColumns('Сдача', `${money(change)} TJS`, width));
      }
    }
    rows.push('');
    rows.push(line(width));
    rows.push('Спасибо за покупку!');
    rows.push(time);
    rows.push(line(width));
  }

  if (isKitchen || isSticker) {
    rows.push(line(width));
    rows.push(center(now.toLocaleString('ru-RU'), width));
  }
  rows.push('\n\n\n');
  return rows.join('\r\n');
}

async function printText(text, printerName, options = {}) {
  const filePath = join(tmpdir(), `icashbox-${Date.now()}.txt`);
  const scriptPath = join(tmpdir(), `icashbox-print-${Date.now()}.ps1`);
  await writeFile(filePath, text, 'utf8');
  let logoPath = '';
  let tempLogoPath = '';
  if (options.logo) {
    const sourceLogoPath = receiptLogoPath();
    if (sourceLogoPath) {
      tempLogoPath = join(tmpdir(), `icashbox-logo-${Date.now()}.png`);
      try {
        await writeFile(tempLogoPath, await readFile(sourceLogoPath));
        logoPath = tempLogoPath;
      } catch {
        tempLogoPath = '';
        logoPath = sourceLogoPath;
      }
    }
  }
  const copies = Math.min(20, Math.max(1, Math.round(Number(options.copies || 1))));
  const pages = text.split('\f');
  const maxPageLines = Math.max(...pages.map((page) => page.split(/\r?\n/).length));
  const paperWidth = options.sticker ? STICKER_PAPER_WIDTH : 315;
  const paperHeight = options.sticker
    ? STICKER_PAPER_HEIGHT
    : Math.max(320, Math.ceil(maxPageLines * 17 + (logoPath ? 120 : 76)));
  const script = `
param(
  [string]$TextPath,
  [string]$PrinterName,
  [string]$LogoPath,
  [int]$Copies,
  [int]$PaperWidth,
  [int]$PaperHeight,
  [int]$StickerContentHeight,
  [int]$StickerPauseMs,
  [switch]$Sticker
)
Add-Type -AssemblyName System.Drawing
$doc = New-Object System.Drawing.Printing.PrintDocument
if ($PrinterName) { $doc.PrinterSettings.PrinterName = $PrinterName }
$paperName = if ($Sticker) { 'Sticker57x40Gap2_3mm' } else { 'Receipt80mm' }
$paper = New-Object System.Drawing.Printing.PaperSize($paperName, $PaperWidth, $PaperHeight)
$doc.DefaultPageSettings.PaperSize = $paper
$doc.PrinterSettings.DefaultPageSettings.PaperSize = $paper
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.OriginAtMargins = $false
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
$text = Get-Content -LiteralPath $TextPath -Raw -Encoding UTF8
$script:pages = $text -split [char]12
$script:pageIndex = 0
$logo = $null
if ($LogoPath -and (Test-Path -LiteralPath $LogoPath)) { $logo = [System.Drawing.Image]::FromFile($LogoPath) }
$font = New-Object System.Drawing.Font('Consolas', 8.8, [System.Drawing.FontStyle]::Regular)
$bold = New-Object System.Drawing.Font('Consolas', 10.8, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::Black
$doc.DocumentName = if ($Sticker) { 'iCashbox Sticker' } else { 'iCashbox Receipt' }
$centerFormat = New-Object System.Drawing.StringFormat
$centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
$centerFormat.LineAlignment = [System.Drawing.StringAlignment]::Near
$doc.add_PrintPage({
  param($sender, $e)
  $e.Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit
  if ($Sticker) {
    $pageText = $script:pages[$script:pageIndex]
    $lines = @(($pageText -split "\\r?\\n") | Where-Object { $_ -ne $null -and $_.Trim().Length -gt 0 })
    $guestName = if ($lines.Count -gt 0) { $lines[0] } else { 'Дорогой гость' }
    $wishText = if ($lines.Count -gt 1) { ($lines[1..($lines.Count - 1)] -join " ") } else { '' }
    $contentHeight = if ($StickerContentHeight -gt 0) { $StickerContentHeight } else { $PaperHeight }
    $safeWidth = [Math]::Max(1, $PaperWidth - 12)
    $y = 5
    if ($logo) {
      $maxLogoWidth = [Math]::Min(158.0, $safeWidth)
      $maxLogoHeight = 38.0
      $scale = [Math]::Min($maxLogoWidth / $logo.Width, $maxLogoHeight / $logo.Height)
      $logoWidth = [int][Math]::Round($logo.Width * $scale)
      $logoHeight = [int][Math]::Round($logo.Height * $scale)
      $logoX = [Math]::Max(0, [int][Math]::Round(($PaperWidth - $logoWidth) / 2))
      $e.Graphics.DrawImage($logo, $logoX, $y, $logoWidth, $logoHeight)
      $y += $logoHeight + 8
    }
    $guestSize = 13.5
    do {
      $guestFont = New-Object System.Drawing.Font('Arial', $guestSize, [System.Drawing.FontStyle]::Bold)
      $guestMeasure = $e.Graphics.MeasureString($guestName, $guestFont)
      if ($guestMeasure.Width -le $safeWidth -or $guestSize -le 9.0) { break }
      $guestFont.Dispose()
      $guestSize -= 0.5
    } while ($true)
    $guestRect = New-Object System.Drawing.RectangleF(6, $y, $safeWidth, 28)
    $e.Graphics.DrawString($guestName, $guestFont, $brush, $guestRect, $centerFormat)
    $guestFont.Dispose()
    $wishFont = New-Object System.Drawing.Font('Arial', 8.4, [System.Drawing.FontStyle]::Bold)
    $wishRectY = [Math]::Min($contentHeight - 58, $y + 31)
    $wishRect = New-Object System.Drawing.RectangleF(6, $wishRectY, $safeWidth, [Math]::Max(38, $contentHeight - $wishRectY - 5))
    $e.Graphics.DrawString($wishText, $wishFont, $brush, $wishRect, $centerFormat)
    $wishFont.Dispose()
    $script:pageIndex += 1
    $e.HasMorePages = $script:pageIndex -lt $script:pages.Count
    if ($e.HasMorePages -and $StickerPauseMs -gt 0) { Start-Sleep -Milliseconds $StickerPauseMs }
    return
  }
  $x = 3
  $y = 6
  if ($logo) {
    $maxLogoWidth = 190.0
    $maxLogoHeight = 42.0
    $scale = [Math]::Min($maxLogoWidth / $logo.Width, $maxLogoHeight / $logo.Height)
    $logoWidth = [int][Math]::Round($logo.Width * $scale)
    $logoHeight = [int][Math]::Round($logo.Height * $scale)
    $logoX = [Math]::Max(0, [int][Math]::Round((($PaperWidth - $logoWidth) / 2) - 18))
    $e.Graphics.DrawImage($logo, $logoX, $y, $logoWidth, $logoHeight)
    $y += $logoHeight + 8
  }
  $lineIndex = 0
  $pageText = $script:pages[$script:pageIndex]
  foreach ($line in ($pageText -split "\\r?\\n")) {
    $fontToUse = if ($line -match '\\.{4,}.*TJS$') { $bold } else { $font }
    $e.Graphics.DrawString($line, $fontToUse, $brush, $x, $y)
    $y += [Math]::Ceiling($fontToUse.GetHeight($e.Graphics)) + 1
    $lineIndex += 1
  }
  $script:pageIndex += 1
  $e.HasMorePages = $script:pageIndex -lt $script:pages.Count
})
$copyCount = [Math]::Min(20, [Math]::Max(1, $Copies))
for ($copyIndex = 0; $copyIndex -lt $copyCount; $copyIndex++) {
  $script:pageIndex = 0
  $doc.Print()
  if ($Sticker -and $StickerPauseMs -gt 0 -and $copyIndex -lt ($copyCount - 1)) {
    Start-Sleep -Milliseconds $StickerPauseMs
  }
}
if ($logo) { $logo.Dispose() }
$doc.Dispose()
`;
  await writeFile(scriptPath, `\uFEFF${script}`, 'utf8');

  try {
    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-TextPath',
      filePath,
      '-PaperWidth',
      String(paperWidth),
      '-Copies',
      String(copies),
      '-PaperHeight',
      String(paperHeight),
      '-StickerContentHeight',
      String(STICKER_CONTENT_HEIGHT),
      '-StickerPauseMs',
      String(STICKER_PRINT_PAUSE_MS)
    ];
    if (printerName) args.push('-PrinterName', printerName);
    if (logoPath) args.push('-LogoPath', logoPath);
    if (options.sticker) args.push('-Sticker');
    await runCommand('powershell.exe', args);
  } finally {
    unlink(filePath).catch(() => {});
    unlink(scriptPath).catch(() => {});
    if (tempLogoPath) unlink(tempLogoPath).catch(() => {});
  }
}

function startPrintServer() {
  if (printServer) return;

  printServer = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true, service: 'icashbox-desktop-print-agent' });
      return;
    }

    if (req.method === 'GET' && req.url === '/time') {
      try {
        sendJson(res, 200, await fetchNetworkTime());
      } catch (error) {
        sendJson(res, 503, { ok: false, error: error.message });
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/printers') {
      try {
        sendJson(res, 200, { ok: true, printers: await listPrinters() });
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
      }
      return;
    }

    if (req.method !== 'POST' || req.url !== '/print') {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    try {
      const payload = JSON.parse(await readBody(req));
      const beforePrint = await printerDiagnostics(payload.printerName);
      assertPrinterReady(beforePrint);
      await printText(receiptText(payload), payload.printerName, {
        copies: payload.copies,
        logo: !payload.type || payload.type === 'receipt' || payload.type === 'sticker',
        sticker: payload.type === 'sticker'
      });
      const afterPrint = await printerDiagnostics(payload.printerName);
      sendJson(res, 200, { ok: true, printer: afterPrint.name, jobCount: afterPrint.jobCount });
    } catch (error) {
      logLine(`print error: ${error.stack || error.message}`);
      sendJson(res, 500, { ok: false, error: error.message });
    }
  });

  printServer.on('error', (error) => {
    if (error.code !== 'EADDRINUSE') console.error(error);
  });
  printServer.listen(PRINT_PORT, '127.0.0.1');
}

function registerPrintIpc() {
  ipcMain.handle('icashbox:list-printers', async () => listPrinters());
  ipcMain.handle('icashbox:network-time', async () => fetchNetworkTime());
  ipcMain.handle('icashbox:get-auto-launch', async () => {
    const settings = app.getLoginItemSettings({ path: process.execPath });
    return { openAtLogin: settings.openAtLogin };
  });
  ipcMain.handle('icashbox:set-auto-launch', async (_event, openAtLogin) => {
    app.setLoginItemSettings({
      openAtLogin: Boolean(openAtLogin),
      path: process.execPath
    });
    const settings = app.getLoginItemSettings({ path: process.execPath });
    return { openAtLogin: settings.openAtLogin };
  });
  ipcMain.handle('icashbox:update-live-snapshot', async (_event, payload) => {
    liveSnapshot = {
      ...(payload || {}),
      ok: true,
      updatedAt: new Date().toISOString()
    };
    return { ok: true, urls: localLiveUrls() };
  });
  ipcMain.handle('icashbox:get-live-urls', async () => ({ urls: localLiveUrls() }));
  ipcMain.handle('icashbox:select-export-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите папку для отчетов',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths?.[0]) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('icashbox:archive-orders', async (_event, payload) => {
    const dateKey = String(payload?.dateKey || new Date().toISOString().slice(0, 10));
    const archiveDir = String(payload?.exportDir || '').trim() || join(app.getPath('documents'), 'iCashbox Reports');
    mkdirSync(archiveDir, { recursive: true });

    const jsonPath = join(archiveDir, `orders-${dateKey}.json`);
    const xlsxPath = join(archiveDir, `orders-${dateKey}.xlsx`);
    const pdfPath = join(archiveDir, `report-${dateKey}.pdf`);
    const reportPath = join(archiveDir, `report-${dateKey}.json`);

    await writeFile(jsonPath, JSON.stringify(payload?.orders || [], null, 2), 'utf8');
    await writeFile(reportPath, JSON.stringify(payload?.report || {}, null, 2), 'utf8');
    if (payload?.ordersWorkbookBase64) {
      await writeFile(xlsxPath, Buffer.from(payload.ordersWorkbookBase64, 'base64'));
    }
    if (payload?.reportPdfBase64) {
      await writeFile(pdfPath, Buffer.from(payload.reportPdfBase64, 'base64'));
    }

    return { archiveDir, jsonPath, pdfPath, reportPath, xlsxPath };
  });
  ipcMain.handle('icashbox:load-order-archive', async (_event, jsonPath) => {
    const content = await readFile(String(jsonPath || ''), 'utf8');
    return JSON.parse(content);
  });
  ipcMain.handle('icashbox:print', async (_event, payload) => {
    const beforePrint = await printerDiagnostics(payload.printerName);
    assertPrinterReady(beforePrint);
    await printText(receiptText(payload), payload.printerName, {
      copies: payload.copies,
      logo: !payload.type || payload.type === 'receipt' || payload.type === 'sticker',
      sticker: payload.type === 'sticker'
    });
    const afterPrint = await printerDiagnostics(payload.printerName);
    return { ok: true, printer: afterPrint.name, jobCount: afterPrint.jobCount };
  });
}

function createWindow() {
  logLine('createWindow');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#f6f7f5',
    icon: appIconPath(),
    title: 'iCashbox POS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs')
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.once('ready-to-show', () => {
    logLine('ready-to-show');
    closeSplashWhenReady();
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logLine(`did-fail-load: ${errorCode} ${errorDescription}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logLine(`render-process-gone: ${JSON.stringify(details)}`);
  });
  mainWindow.on('closed', () => {
    logLine('mainWindow closed');
    mainWindow = null;
  });
  mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html')).catch((error) => {
    logLine(`loadFile failed: ${error.stack || error.message}`);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  logLine('app ready');
  registerPrintIpc();
  startPrintServer();
  startLiveServer();
  createSplashWindow();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (printServer) printServer.close();
});
