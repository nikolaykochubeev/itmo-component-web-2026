import React, { useEffect, useState } from "react";
import axios from "axios";
import { createLookupParams, createProxyParams, readLookupResult } from "./dictionary.mjs";

// Укажите личный Dictionary API key в .env.local, не в репозитории.
// CRA подставляет REACT_APP_* при сборке. Строка 7 заменяет Google key.
const API_KEY = process.env.REACT_APP_YANDEX_DICTIONARY_KEY || "";
const TRANSLATE_ENDPOINT = process.env.REACT_APP_TRANSLATE_ENDPOINT || "";

const doTranslation = async (input, languageCode, cancelToken) => {
  if (!TRANSLATE_ENDPOINT && !API_KEY) {
    throw new Error("Настройте REACT_APP_TRANSLATE_ENDPOINT для серверного прокси или личный REACT_APP_YANDEX_DICTIONARY_KEY в .env.local и пересоберите приложение.");
  }
  const { data } = await axios.get(
    TRANSLATE_ENDPOINT || "https://dictionary.yandex.net/api/v1/dicservice.json/lookup",
    { params: TRANSLATE_ENDPOINT ? createProxyParams(input, languageCode) : createLookupParams(input, languageCode, API_KEY), cancelToken: cancelToken.token }
  );
  return readLookupResult(data);
};

export default ({ language, text }) => {
  const [translated, setTranslated] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTranslated("");
    setError("");
    if (!text.trim()) return;
    const cancelToken = axios.CancelToken.source();
    let active = true;
    doTranslation(text, language, cancelToken).then(
      value => { if (active) setTranslated(value); },
      err => {
        if (active && !axios.isCancel(err)) {
          setError(err.response ? ((err.response.data && err.response.data.message) || `Yandex API: HTTP ${err.response.status}. Проверьте ключ и направление перевода.`) : err.message);
        }
      }
    );
    return () => {
      active = false;
      cancelToken.cancel();
    };
  }, [text, language]);

  return (
    <div>
      <label className="label">Перевод</label>
      <h1 className="title" aria-live="polite">{translated}</h1>
      {error && <p role="alert">{error}</p>}
      <p>Реализовано с помощью сервиса <a href="https://yandex.ru/dev/dictionary/">«API Яндекс.Словарь»</a>. Вводите слова или устойчивые выражения.</p>
    </div>
  );
};
