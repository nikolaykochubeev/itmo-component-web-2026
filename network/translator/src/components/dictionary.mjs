export function createLookupParams(text, languageCode, key) {
  if (!key) throw new Error('Требуется личный ключ Yandex Dictionary API.');
  return { key, ...createProxyParams(text, languageCode) };
}

export function createProxyParams(text, languageCode) {
  return { lang: `ru-${languageCode}`, text, ui: 'ru' };
}

export function readLookupResult(data) {
  const translation = data && data.def && data.def[0] && data.def[0].tr && data.def[0].tr[0];
  return translation && translation.text ? translation.text : 'Перевод не найден.';
}
