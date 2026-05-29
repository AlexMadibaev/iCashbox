const baseOrderHeaders = [
  'Номер',
  'Тип',
  'Место',
  'Статус',
  'Минуты',
  'Итого',
  'Позиции',
  'Имя гостя',
  'Комментарий',
  'Оплачен'
];
const trailingOrderHeaders = ['Дата создания', 'Отменён', 'Возврат'];
const paymentColumns = ['Наличные', 'Карта', 'Alif', 'Dushanbe City'];

function normalizePaymentColumns(methods = paymentColumns) {
  const seen = new Set();
  return [...paymentColumns, ...(Array.isArray(methods) ? methods : [])]
    .map((method) => String(method || '').replace(/\s+/g, ' ').trim())
    .filter((method) => {
      const key = method.toLowerCase();
      if (!method || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function orderHeaders(methods = paymentColumns) {
  return [...baseOrderHeaders, ...normalizePaymentColumns(methods), ...trailingOrderHeaders];
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase();
}

function parseNumber(value, fallback = 0) {
  const numeric = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function parseBoolean(value) {
  const text = normalizeText(value).toLowerCase();
  return ['1', 'true', 'yes', 'y', 'да', 'оплачен', 'оплачено'].includes(text);
}

function readExcelValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || '').join('');
  if (value.result != null) return readExcelValue(value.result);
  if (value.text != null) return value.text;
  return value;
}

function findHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.includes('номер') && headers.includes('итого');
  });
}

function findColumn(headerRow, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headerRow.findIndex((cell) => {
    const header = normalizeHeader(cell);
    return normalizedAliases.some((alias) => header === alias || header.includes(alias));
  });
}

function buildColumnMap(headerRow) {
  const createdAt = findColumn(headerRow, ['Дата создания', 'created']);
  const paymentStart = baseOrderHeaders.length;
  const paymentEnd = createdAt >= 0 ? createdAt : headerRow.length - trailingOrderHeaders.length;
  const dynamicPayments = headerRow.slice(paymentStart, Math.max(paymentStart, paymentEnd)).map(normalizeText).filter(Boolean);

  return {
    cancelled: findColumn(headerRow, ['Отменён', 'cancelled']),
    comment: findColumn(headerRow, ['Комментарий', 'comment']),
    createdAt,
    guestName: findColumn(headerRow, ['Имя гостя', 'guest']),
    id: findColumn(headerRow, ['Номер', 'id']),
    items: findColumn(headerRow, ['Позиции', 'items']),
    minutes: findColumn(headerRow, ['Минуты', 'minutes']),
    paid: findColumn(headerRow, ['Оплачен', 'paid']),
    paymentIndexes: Object.fromEntries(
      normalizePaymentColumns(dynamicPayments).map((method) => [method, findColumn(headerRow, [method])])
    ),
    refunded: findColumn(headerRow, ['Возврат', 'refund']),
    status: findColumn(headerRow, ['Статус', 'status']),
    table: findColumn(headerRow, ['Место', 'table']),
    total: findColumn(headerRow, ['Итого', 'total']),
    type: findColumn(headerRow, ['Тип', 'type'])
  };
}

function readColumn(row, index) {
  return index >= 0 ? row[index] : '';
}

function splitOrderItems(value) {
  return String(value ?? '')
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildOrderLines(items, total) {
  const fallbackTotal = items.length ? total / items.length : 0;
  return items.map((item, index) => {
    const match = String(item).match(/^(.*)\s+x(\d+)$/i);
    const qty = match ? Math.max(1, Number(match[2])) : 1;
    const name = match ? match[1].trim() : String(item).trim();
    const lineTotal = Math.round(fallbackTotal);
    return {
      id: `imported-${index}`,
      name,
      price: qty ? Math.round(lineTotal / qty) : lineTotal,
      qty,
      total: lineTotal
    };
  });
}

function dedupeOrderId(value, rowIndex, usedIds) {
  const numericId = Number(value);
  let candidate = Number.isFinite(numericId) && numericId > 0 ? Math.round(numericId) : Date.now() + rowIndex;

  while (usedIds.has(candidate)) candidate += 1;
  usedIds.add(candidate);
  return candidate;
}

function ordersToRows(orders, methods = paymentColumns) {
  const paymentMethods = normalizePaymentColumns(methods);
  const rows = [orderHeaders(paymentMethods)];

  orders.forEach((order) => {
    const payments = order.payments || {};
    rows.push([
      order.id ?? '',
      order.type || 'Продажа',
      order.table || 'Касса',
      order.status || 'Новый',
      Number(order.minutes || 0),
      Number(order.total || 0),
      (order.items || []).join('\n'),
      order.guestName || '',
      order.comment || '',
      order.paid ? 'Да' : 'Нет',
      ...paymentMethods.map((method) => Number(payments[method] || 0)),
      order.createdAt || '',
      order.cancelled ? 'Да' : 'Нет',
      order.refunded ? 'Да' : 'Нет'
    ]);
  });

  return rows;
}

function rowsToOrders(rows) {
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) {
    throw new Error('Не найден заголовок заказов');
  }

  const columns = buildColumnMap(rows[headerIndex]);
  if (columns.id < 0 || columns.total < 0) {
    throw new Error('В файле должны быть колонки "Номер" и "Итого"');
  }

  const usedIds = new Set();
  return rows
    .slice(headerIndex + 1)
    .map((row, rowIndex) => {
      const id = dedupeOrderId(readColumn(row, columns.id), rowIndex, usedIds);
      const total = parseNumber(readColumn(row, columns.total));
      const payments = Object.fromEntries(
        Object.entries(columns.paymentIndexes).map(([method, index]) => [method, parseNumber(readColumn(row, index))])
      );
      const paidAmount = Object.values(payments).reduce((sum, value) => sum + Number(value || 0), 0);
      const status = normalizeText(readColumn(row, columns.status)) || 'Новый';
      const items = splitOrderItems(readColumn(row, columns.items));
      const paid = parseBoolean(readColumn(row, columns.paid)) || paidAmount >= total || status === 'Оплачен';

      return {
        id,
        cancelled: parseBoolean(readColumn(row, columns.cancelled)) || status === 'Отменён',
        comment: normalizeText(readColumn(row, columns.comment)),
        createdAt: normalizeText(readColumn(row, columns.createdAt)),
        guestName: normalizeText(readColumn(row, columns.guestName)),
        items,
        lines: buildOrderLines(items, total),
        minutes: parseNumber(readColumn(row, columns.minutes)),
        paid,
        payments,
        refunded: parseBoolean(readColumn(row, columns.refunded)) || status === 'Возврат',
        status,
        table: normalizeText(readColumn(row, columns.table)) || 'Касса',
        total,
        type: normalizeText(readColumn(row, columns.type)) || 'Продажа'
      };
    })
    .filter((order) => order.id && (order.items.length || order.total > 0));
}

export async function createOrdersWorkbook(orders, methods = paymentColumns) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  const worksheet = workbook.addWorksheet('Заказы');
  const paymentMethods = normalizePaymentColumns(methods);
  const columnWidths = [
    10, 14, 14, 14, 10, 12, 42, 18, 28, 10,
    ...paymentMethods.map(() => 12),
    24, 10, 10
  ];

  ordersToRows(orders, paymentMethods).forEach((row) => worksheet.addRow(row));
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
  worksheet.getColumn(7).alignment = { wrapText: true };

  return workbook.xlsx.writeBuffer();
}

export async function parseOrdersWorkbook(arrayBuffer) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('В XLSX-файле нет листов');
  }

  const rows = [];
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = [];
    for (let columnNumber = 1; columnNumber <= Math.max(worksheet.columnCount, orderHeaders().length); columnNumber += 1) {
      values.push(readExcelValue(row.getCell(columnNumber).value));
    }
    rows.push(values);
  }

  return rowsToOrders(rows);
}

export { paymentColumns };
