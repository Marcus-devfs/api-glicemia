const AppSettings = require("../models/AppSettings");
const { FREE_PDF_LIMIT, PREMIUM_PRICE } = require("../config/premium");

const SETTINGS_KEY = "main";
const CACHE_TTL_MS = 15_000;

let cache = null;
let cacheAt = 0;

function roundPrice(value) {
  return Math.round(Number(value) * 100) / 100;
}

function invalidateAppSettingsCache() {
  cache = null;
  cacheAt = 0;
}

async function getAppSettingsDoc() {
  let doc = await AppSettings.findOne({ key: SETTINGS_KEY });
  if (!doc) {
    doc = await AppSettings.create({
      key: SETTINGS_KEY,
      premiumPrice: PREMIUM_PRICE,
      freePdfLimit: FREE_PDF_LIMIT,
    });
  }
  return doc;
}

async function getAppSettings() {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const doc = await getAppSettingsDoc();
  cache = {
    premiumPrice: doc.premiumPrice,
    freePdfLimit: doc.freePdfLimit,
    updatedAt: doc.updatedAt,
  };
  cacheAt = Date.now();
  return cache;
}

async function getPremiumPrice() {
  const settings = await getAppSettings();
  return settings.premiumPrice;
}

async function getFreePdfLimit() {
  const settings = await getAppSettings();
  return settings.freePdfLimit;
}

async function updateAppSettings(updates) {
  const doc = await getAppSettingsDoc();

  if (updates.premiumPrice != null) {
    doc.premiumPrice = roundPrice(updates.premiumPrice);
  }
  if (updates.freePdfLimit != null) {
    doc.freePdfLimit = Math.round(Number(updates.freePdfLimit));
  }

  await doc.save();
  invalidateAppSettingsCache();
  return getAppSettings();
}

/** Compara valor cobrado no Asaas com preço configurado (evita float). */
function pricesMatch(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

module.exports = {
  getAppSettings,
  getPremiumPrice,
  getFreePdfLimit,
  updateAppSettings,
  invalidateAppSettingsCache,
  pricesMatch,
};
