import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stickerWishForSeed } from '../src/stickerWishes.js';

const PORT = 8787;
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

function mmToPaperUnits(value) {
  return Math.round(value * PAPER_UNITS_PER_MM);
}

function receiptLogoPath() {
  const candidates = [
    join(process.cwd(), 'public', 'pos-logo.png'),
    join(process.cwd(), 'dist', 'pos-logo.png')
  ];
  return candidates.find((candidate) => existsSync(candidate)) || '';
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
    } catch {
      // Try the next provider.
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
      // Try the PowerShell fallbacks below.
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

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, service: 'icashbox-print-agent' });
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
    console.error(error);
    sendJson(res, 500, { ok: false, error: error.message });
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`iCashbox print agent: http://127.0.0.1:${PORT}`);
});
