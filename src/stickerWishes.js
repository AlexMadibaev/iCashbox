const wishStarts = [
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

const wishMiddles = [
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

const wishEndings = [
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

function buildStickerWishBank() {
  const wishes = [];

  for (const start of wishStarts) {
    for (const middle of wishMiddles) {
      for (const ending of wishEndings) {
        wishes.push(`${start} ${middle}${ending}`);
      }
    }
  }

  return wishes;
}

function hashString(value) {
  let hash = 0;
  const text = String(value || '');

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export const stickerWishBank = buildStickerWishBank();
export const STICKER_WISH_BANK_SIZE = stickerWishBank.length;

export function pickStickerWish() {
  return stickerWishBank[Math.floor(Math.random() * stickerWishBank.length)];
}

export function stickerWishForSeed(seed) {
  return stickerWishBank[hashString(seed) % stickerWishBank.length];
}
