const en = require('../locales/en.json');
const uk = require('../locales/uk.json');
const pl = require('../locales/pl.json');

const locales = { en, uk, pl };

function t(lang, key) {
  const keys = key.split('.');
  let val = locales[lang] || locales.en;
  for (const k of keys) val = val?.[k];
  // fallback to en if key not found
  if (!val) {
    let fallback = locales.en;
    for (const k of keys) fallback = fallback?.[k];
    return fallback || key;
  }
  return val;
}

module.exports = { t };
