export function createLookupParams(text, languageCode, key) {
  if (!key) throw new Error('Требуется личный ключ Yandex Dictionary API.');
  return { key, ...createProxyParams(text, languageCode) };
}

export function createProxyParams(text, languageCode) {
  return { lang: `ru-${languageCode}`, text, ui: 'ru' };
}

export function readLookupResult(data) {
  const translations = data && data.def && data.def[0] && data.def[0].tr;
  let translation = translations && translations[0];
  if (Array.isArray(translations)) {
    for (const candidate of translations.slice(1)) {
      const frequency = candidate && Number.isFinite(candidate.fr) ? candidate.fr : -Infinity;
      const selectedFrequency = translation && Number.isFinite(translation.fr) ? translation.fr : -Infinity;
      if (frequency > selectedFrequency) translation = candidate;
    }
  }
  return translation && translation.text ? translation.text : 'Перевод не найден.';
}
