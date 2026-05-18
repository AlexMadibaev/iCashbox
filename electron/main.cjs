const { app, BrowserWindow, Menu, shell } = require('electron');
const { createServer } = require('node:http');
const { spawn } = require('node:child_process');
const { writeFile, unlink } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const PRINT_PORT = 8787;
let mainWindow;
let printServer;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
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

function addRegistryPrinterNames(output, names) {
  const printerRoot = 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers\\';
  const ignoredValues = new Set(['DefaultSpoolDirectory', 'ResetDevmodesAttempts', 'LANGIDOfLastDefaultDevmode']);
  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (line.startsWith(printerRoot)) {
        names.add(line.slice(printerRoot.length));
        return;
      }

      const deviceMatch = line.match(/^(.+?)\s+REG_SZ\s+/);
      if (deviceMatch && !deviceMatch[1].startsWith('HKEY_') && !ignoredValues.has(deviceMatch[1].trim())) {
        names.add(deviceMatch[1].trim());
      }
    });
}

async function listPrinters() {
  const names = new Set();

  if (mainWindow?.webContents?.getPrintersAsync) {
    try {
      const electronPrinters = await mainWindow.webContents.getPrintersAsync();
      for (const printer of electronPrinters) {
        if (printer.name) names.add(printer.name);
        if (printer.displayName) names.add(printer.displayName);
      }
    } catch {
      // Fall back to Windows registry / PowerShell below.
    }
  }

  const registryCommands = [
    ['reg.exe', ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers']],
    ['reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices']]
  ];

  for (const [file, args] of registryCommands) {
    try {
      addRegistryPrinterNames(await runCommand(file, args), names);
    } catch {
      // Try PowerShell fallbacks below.
    }
  }

  const commands = [
    "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json",
    "Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers' | Select-Object -ExpandProperty PSChildName | ConvertTo-Json",
    "Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices' | Select-Object -Property * | ConvertTo-Json",
    "Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers' | ForEach-Object { $_.PSChildName }",
    "Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices' | ForEach-Object { $_.PSObject.Properties.Name | Where-Object { $_ -notlike 'PS*' } }"
  ];

  for (const command of commands) {
    try {
      const output = await runPowerShell(command);
      const trimmed = output.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.filter(Boolean).forEach((name) => names.add(String(name)));
        } else if (typeof parsed === 'string') {
          names.add(parsed);
        } else if (parsed && typeof parsed === 'object') {
          Object.keys(parsed)
            .filter((key) => !key.startsWith('PS') && parsed[key])
            .forEach((name) => names.add(name));
        }
      } catch {
        trimmed
          .split(/\r?\n/)
          .map((name) => name.trim())
          .filter(Boolean)
          .forEach((name) => names.add(name));
      }
    } catch {
      // Try the next method.
    }
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
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

function receiptText(payload) {
  const width = 36;
  const order = payload.order || {};
  const isKitchen = payload.type === 'kitchen';
  const isSticker = payload.type === 'sticker';
  const payments = Object.entries(order.payments || {}).filter(([, value]) => Number(value) > 0);
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

  if (!isKitchen && !isSticker) {
    rows.push(center('Заклад', width));
    rows.push('');
    rows.push(padColumns('Чек №', order.id || '', width));
    rows.push(padColumns('Тип замовлення', 'у закладі', width));
    rows.push(padColumns('Офіціант', payload.shift?.cashier || 'Кассир', width));
    rows.push(padColumns('Відкрито', time, width));
    rows.push(padColumns('Надруковано', time, width));
    rows.push(padColumns('Стіл №', '1 (Основной зал)', width));
    rows.push(padColumns('К-сть гостей', '1', width));
    rows.push(padColumns('Замовлення №', String(order.id || '').slice(-3), width));
    rows.push(line(width));
  } else {
    rows.push(center(isSticker ? 'НАКЛЕЙКА' : 'КУХОННЫЙ ТАЛОН', width));
    rows.push(center(isSticker ? 'КОММЕНТАРИЙ' : 'НА ПРИГОТОВЛЕНИЕ', width));
    rows.push(line(width));
    rows.push(padColumns(`Заказ #${order.id || ''}`, `Смена #${payload.shift?.number || ''}`, width));
    rows.push(padColumns(order.type || 'Продажа', order.status || '', width));
    rows.push(line(width));
  }

  if (isSticker) {
    rows.push('КОММЕНТАРИЙ:');
    wrapText(order.comment || 'Без комментария', width).forEach((row) => rows.push(row));
    rows.push(line(width));
  }

  if (!isSticker && !isKitchen) {
    rows.push('Наименування   К-сть  Ціна  Загалом');
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
    rows.push(`До оплати  ${'.'.repeat(12)} ${money(order.total)} грн`);
    if (payments.length) {
      rows.push('');
      rows.push(line(width));
      rows.push('');
      rows.push('Оплата');
      rows.push('');
      for (const [method, value] of payments) {
        rows.push(padColumns(method, `${money(value)} грн`, width));
      }
    }
    rows.push('');
    rows.push(line(width));
    rows.push('проспект Олександра Поля, Дніпро,');
    rows.push('Дніпропетровська область, 49000');
    rows.push(line(width));
    rows.push('Мережа Wi-Fi Poster пароль 12345');
    rows.push(line(width));
    rows.push('На вас чекає приємний сюрприз!');
    rows.push(line(width));
  }

  if (isKitchen || isSticker) {
    rows.push(line(width));
    rows.push(center(now.toLocaleString('ru-RU'), width));
  }
  rows.push('\n\n\n');
  return rows.join('\r\n');
}

async function printText(text, printerName) {
  const filePath = join(tmpdir(), `icashbox-${Date.now()}.txt`);
  const scriptPath = join(tmpdir(), `icashbox-print-${Date.now()}.ps1`);
  await writeFile(filePath, text, 'utf8');
  const paperHeight = Math.max(320, Math.ceil(text.split(/\r?\n/).length * 18 + 80));
  const script = `
param(
  [string]$TextPath,
  [string]$PrinterName,
  [int]$PaperWidth,
  [int]$PaperHeight
)
Add-Type -AssemblyName System.Drawing
$doc = New-Object System.Drawing.Printing.PrintDocument
if ($PrinterName) { $doc.PrinterSettings.PrinterName = $PrinterName }
$paper = New-Object System.Drawing.Printing.PaperSize('Receipt80mm', $PaperWidth, $PaperHeight)
$doc.DefaultPageSettings.PaperSize = $paper
$doc.PrinterSettings.DefaultPageSettings.PaperSize = $paper
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.OriginAtMargins = $false
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
$text = Get-Content -LiteralPath $TextPath -Raw -Encoding UTF8
$font = New-Object System.Drawing.Font('Consolas', 10.5, [System.Drawing.FontStyle]::Regular)
$bold = New-Object System.Drawing.Font('Consolas', 12.5, [System.Drawing.FontStyle]::Bold)
$title = New-Object System.Drawing.Font('Consolas', 14, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::Black
$doc.add_PrintPage({
  param($sender, $e)
  $x = 6
  $y = 6
  $lineIndex = 0
  foreach ($line in ($text -split "\\r?\\n")) {
    $fontToUse = if ($lineIndex -lt 1) { $title } elseif ($line -match '^До оплати') { $bold } else { $font }
    $e.Graphics.DrawString($line, $fontToUse, $brush, $x, $y)
    $y += [Math]::Ceiling($fontToUse.GetHeight($e.Graphics)) + 1
    $lineIndex += 1
  }
  $e.HasMorePages = $false
})
$doc.Print()
`;
  await writeFile(scriptPath, script, 'utf8');

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
      '315',
      '-PaperHeight',
      String(paperHeight)
    ];
    if (printerName) args.push('-PrinterName', printerName);
    await runCommand('powershell.exe', args);
  } finally {
    unlink(filePath).catch(() => {});
    unlink(scriptPath).catch(() => {});
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
      await printText(receiptText(payload), payload.printerName);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message });
    }
  });

  printServer.on('error', (error) => {
    if (error.code !== 'EADDRINUSE') console.error(error);
  });
  printServer.listen(PRINT_PORT, '127.0.0.1');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#f6f7f5',
    title: 'iCashbox POS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startPrintServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (printServer) printServer.close();
});
