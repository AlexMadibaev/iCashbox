const posterMenuHeaders = [
  'Название',
  'Категория',
  'Тип',
  'Себестоимость без НДС',
  'Цена',
  ''
];

const posterMenuSeedRows = [
  ['Babl tea big', 'Bubble Tea', 'Товар', 26, 26, ''],
  ['Babl tea mini', 'Bubble Tea', 'Товар', 20, 20, ''],
  ['Mango Maracuya mini', 'Bubble Tea', 'Товар', 20, 20, ''],
  ['Mango Maracuya big', 'Bubble Tea', 'Товар', 26, 26, ''],
  ['Клубничный жасмин mini', 'Bubble Tea', 'Товар', 20, 20, ''],
  ['Клубничный жасмин big', 'Bubble Tea', 'Товар', 26, 26, ''],
  ['Виноградный жасмин mini', 'Bubble Tea', 'Товар', 20, 20, ''],
  ['Виноградный жасмин big', 'Bubble Tea', 'Товар', 26, 26, ''],
  ['Фреш лимон mini', 'Фреши', 'Товар', 15, 15, ''],
  ['Фреш лимон big', 'Фреши', 'Товар', 20, 20, ''],
  ['Жасмин tea mini', 'Чай', 'Товар', 20, 20, ''],
  ['Жасмин tea big', 'Чай', 'Товар', 26, 26, ''],
  ['Matcha mini', 'Матча', 'Товар', 30, 30, ''],
  ['Matcha big', 'Матча', 'Товар', 40, 40, ''],
  ['Мороженое классическое', 'Мороженое', 'Товар', 20, 20, ''],
  ['Мороженое с тапиокой', 'Мороженое', 'Товар', 20, 20, ''],
  ['Мороженое  клубничное', 'Мороженое', 'Товар', 20, 20, ''],
  ['Мороженое манго', 'Мороженое', 'Товар', 20, 20, ''],
  ['Мороженое рожок', 'Мороженое', 'Товар', 10, 10, ''],
  ['Милкшейк МангоБанан mini', 'Милкшейки', 'Товар', 25, 25, ''],
  ['Милкшейк МангоБанан big', 'Милкшейки', 'Товар', 30, 30, ''],
  ['Милкшейк Клубничный mini', 'Милкшейки', 'Товар', 25, 25, ''],
  ['Милкшейк Клубничный big', 'Милкшейки', 'Товар', 30, 30, ''],
  ['Милкшейк Черника minni', 'Милкшейки', 'Товар', 25, 25, ''],
  ['Милкшейк Черника big', 'Милкшейки', 'Товар', 30, 30, ''],
  ['Мороженое Орео', 'Мороженое', 'Товар', 20, 20, ''],
  ['Милкшейк ПиноКолада mini', 'Милкшейки', 'Товар', 25, 25, ''],
  ['Милкшейк ПиноКолада big', 'Милкшейки', 'Товар', 30, 30, ''],
  ['Тапиока доп', 'Добавки', 'Товар', 3, 3, ''],
  ['Американо', 'Кофе и горячие напитки', 'Товар', 20, 20, ''],
  ['Дабл Эспрессо', 'Кофе и горячие напитки', 'Товар', 18, 18, ''],
  ['Горячий шоколад', 'Кофе и горячие напитки', 'Товар', 28, 28, ''],
  ['Капучино', 'Кофе и горячие напитки', 'Товар', 25, 25, ''],
  ['Эспрессо', 'Кофе и горячие напитки', 'Товар', 13, 13, ''],
  ['Латте', 'Кофе и горячие напитки', 'Товар', 25, 25, ''],
  ['Флэт Вайт', 'Кофе и горячие напитки', 'Товар', 26, 26, ''],
  ['Кокос добавка', 'Добавки', 'Товар', 3, 3, ''],
  ['Айс Американо', 'Холодный кофе', 'Товар', 28, 28, ''],
  ['Айс Латте', 'Холодный кофе', 'Товар', 30, 30, '']
];

const menuImageRules = [
  {
    pattern: /(морожен|орео|рожок)/i,
    url: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80'
  },
  {
    pattern: /(милкшейк|milkshake)/i,
    url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80'
  },
  {
    pattern: /(американо|эспрессо|капучино|латте|флэт|шоколад|coffee|matcha)/i,
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'
  },
  {
    pattern: /(tea|жасмин|манго|maracuya|виноград|лимон|babl|тапиока|кокос)/i,
    url: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80'
  }
];

const fallbackMenuImage =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

export const productSeedVersion = 'empty-menu-260521';

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase();
}

function parseMoney(value, fallback = 0) {
  const numeric = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function parseOptionalMoney(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const numeric = Number(text.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? Math.max(0, numeric) : '';
}

function inferMenuImage(name, category) {
  const haystack = `${name} ${category}`;
  return menuImageRules.find((rule) => rule.pattern.test(haystack))?.url || fallbackMenuImage;
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function dedupeId(baseId, usedIds) {
  let candidate = baseId || `product-${usedIds.size + 1}`;
  let counter = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${counter}`;
    counter += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function createProductId(posterProductId, name, rowIndex, usedIds) {
  const normalizedPosterId = normalizeText(posterProductId);
  const baseId = normalizedPosterId
    ? `poster-${normalizedPosterId}`
    : `product-${slugify(name) || rowIndex + 1}`;

  return dedupeId(baseId, usedIds);
}

function findHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.includes('название') && headers.includes('цена');
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
  return {
    category: findColumn(headerRow, ['Категория', 'category']),
    costWithoutVat: findColumn(headerRow, ['Себестоимость без НДС', 'cost']),
    markup: findColumn(headerRow, ['Наценка', 'markup']),
    name: findColumn(headerRow, ['Название', 'name']),
    posterModifierId: findColumn(headerRow, ['PosterID modificator_id', 'modificator_id', 'modifier_id']),
    posterProductId: findColumn(headerRow, ['PosterID product_id', 'product_id']),
    price: findColumn(headerRow, ['Цена', 'price']),
    type: findColumn(headerRow, ['Тип', 'type'])
  };
}

function readColumn(row, index) {
  return index >= 0 ? row[index] : '';
}

function readExcelValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || '').join('');
  if (value.result != null) return readExcelValue(value.result);
  if (value.text != null) return value.text;
  return value;
}

function isModifierRow(type, posterModifierId, posterProductId) {
  const normalizedType = normalizeHeader(type);
  if (normalizedType.includes('модифик') || normalizedType.includes('modifier')) return true;
  return Boolean(normalizeText(posterModifierId)) && !normalizeText(posterProductId);
}

function appendModifier(product, modifierName) {
  const name = normalizeText(modifierName);
  if (!name || product.modifiers.includes(name)) return;
  product.modifiers.push(name);
}

function posterRowsToProducts(rows) {
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) {
    throw new Error('Не найден заголовок меню Poster');
  }

  const columns = buildColumnMap(rows[headerIndex]);
  if (columns.name < 0 || columns.price < 0) {
    throw new Error('В файле должны быть колонки "Название" и "Цена"');
  }

  const products = [];
  const productByPosterId = new Map();
  const usedIds = new Set();
  let lastProduct = null;

  rows.slice(headerIndex + 1).forEach((row, rowIndex) => {
    const name = normalizeText(readColumn(row, columns.name));
    if (!name) return;

    const category = normalizeText(readColumn(row, columns.category)) || 'Меню';
    const type = normalizeText(readColumn(row, columns.type)) || 'Товар';
    const posterProductId = normalizeText(readColumn(row, columns.posterProductId));
    const posterModifierId = normalizeText(readColumn(row, columns.posterModifierId));

    if (isModifierRow(type, posterModifierId, posterProductId)) {
      const target = productByPosterId.get(posterProductId) || lastProduct;
      if (target) appendModifier(target, name);
      return;
    }

    const product = {
      active: true,
      category,
      costWithoutVat: parseOptionalMoney(readColumn(row, columns.costWithoutVat)),
      id: createProductId(posterProductId, name, rowIndex, usedIds),
      image: inferMenuImage(name, category),
      markup: parseOptionalMoney(readColumn(row, columns.markup)),
      modifiers: [],
      name,
      posterProductId,
      price: parseMoney(readColumn(row, columns.price)),
      size: '',
      type
    };

    products.push(product);
    lastProduct = product;
    if (posterProductId) productByPosterId.set(posterProductId, product);
  });

  return products;
}

function productsToPosterRows(products) {
  const rows = [posterMenuHeaders];

  products.forEach((product) => {
    const price = parseMoney(product.price);
    const costWithoutVat = product.costWithoutVat === '' ? price : parseMoney(product.costWithoutVat, price);

    rows.push([
      normalizeText(product.name) || 'Без названия',
      normalizeText(product.category) || 'Меню',
      'Товар',
      costWithoutVat,
      price,
      ''
    ]);

    (product.modifiers || []).forEach((modifier, modifierIndex) => {
      rows.push([
        normalizeText(modifier),
        normalizeText(product.category) || 'Меню',
        'Модификатор',
        '',
        '',
        ''
      ]);
    });
  });

  return rows;
}

export const menuTemplateProducts = posterRowsToProducts([posterMenuHeaders, ...posterMenuSeedRows]);
export const productSeed = [];

export async function parsePosterMenuWorkbook(arrayBuffer) {
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
    for (let columnNumber = 1; columnNumber <= Math.max(worksheet.columnCount, 10); columnNumber += 1) {
      values.push(readExcelValue(row.getCell(columnNumber).value));
    }
    rows.push(values);
  }

  return posterRowsToProducts(rows);
}

export async function createPosterMenuWorkbook(products) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  const worksheet = workbook.addWorksheet('Экспорт товаров');
  const columnWidths = [34, 24, 14, 24, 12, 4];

  productsToPosterRows(products).forEach((row) => worksheet.addRow(row));
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  return workbook.xlsx.writeBuffer();
}
