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

async function listPrinters() {
  const output = await runPowerShell('Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json');
  if (!output.trim()) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function center(text, width = 32) {
  const value = String(text || '').slice(0, width);
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return `${' '.repeat(left)}${value}`;
}

function line(width = 32) {
  return '-'.repeat(width);
}

function money(value) {
  return `${Math.round(Number(value || 0))} TJS`;
}

function receiptText(payload) {
  const width = 32;
  const order = payload.order || {};
  const isKitchen = payload.type === 'kitchen';
  const isSticker = payload.type === 'sticker';
  const payments = Object.entries(order.payments || {}).filter(([, value]) => Number(value) > 0);
  const rows = [
    center(isSticker ? 'COMMENT LABEL' : isKitchen ? 'KITCHEN TICKET' : 'ICASHBOX'),
    center(isSticker ? 'STICKER' : isKitchen ? 'KITCHEN' : 'HYBRID POS'),
    line(width),
    `Order: #${order.id || ''}`,
    `Shift: #${payload.shift?.number || ''}`,
    `Type: ${order.type || ''}`,
    `Place: ${order.table || ''}`,
    `Status: ${order.status || ''}`,
    line(width)
  ];

  if (isSticker) {
    rows.push(`Comment: ${order.comment || 'No comment'}`);
    rows.push(line(width));
  }

  for (const item of order.items || []) {
    rows.push(String(item));
  }

  if (order.comment && !isSticker) {
    rows.push(line(width));
    rows.push(`Note: ${order.comment}`);
  }

  if (!isKitchen && !isSticker) {
    rows.push(line(width));
    rows.push(`TOTAL: ${money(order.total)}`);
    if (payments.length) {
      rows.push(line(width));
      for (const [method, value] of payments) {
        rows.push(`${method}: ${money(value)}`);
      }
    }
  }

  rows.push(line(width));
  rows.push(new Date().toLocaleString('ru-RU'));
  rows.push('\n\n\n');
  return rows.join('\r\n');
}

async function printText(text, printerName) {
  const filePath = join(tmpdir(), `icashbox-${Date.now()}.txt`);
  await writeFile(filePath, text, 'utf8');
  const escapedFile = filePath.replaceAll("'", "''");
  const command = printerName
    ? `Get-Content -LiteralPath '${escapedFile}' | Out-Printer -Name '${printerName.replaceAll("'", "''")}'`
    : `Get-Content -LiteralPath '${escapedFile}' | Out-Printer`;

  try {
    await runPowerShell(command);
  } finally {
    unlink(filePath).catch(() => {});
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
