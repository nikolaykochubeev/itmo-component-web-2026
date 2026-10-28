/* eslint-disable */
import React, { useState } from "react";

const LANGUAGES = [
  { label: "Английский", value: "en" },
  { label: "Немецкий", value: "de" },
  { label: "Французский", value: "fr" },
  { label: "Испанский", value: "es" },
  { label: "Итальянский", value: "it" },
  { label: "Турецкий", value: "tr" },
  { label: "Польский", value: "pl" },
  { label: "Украинский", value: "uk" }
];

const Languages = ({ language, onLanguageChange }) => {
  if (language === undefined) {
    language = "en";
  }
  const languageConfig = LANGUAGES.find((l) => l.value === language);
  if (!languageConfig) {
    throw new Error(`Unknown language code '${language}'`);
  }

  const [open, setOpen] = useState(false);

  const onSelect = (language) => {
    setOpen(false);
    onLanguageChange(language);
  };

  return (
    <div>
      <label className="label">Введите язык</label>
      <div className={`dropdown ${open && "is-active"}`}>
        <div className="dropdown-trigger">
          <button className="button" onClick={() => setOpen(!open)}>
            <span>{languageConfig.label}</span>
            <span className="icon is-small">
              <i className="fas fa-angle-down" />
            </span>
          </button>
        </div>
        <div className="dropdown-menu">
          <div className="dropdown-content">
            {LANGUAGES.map(({ label, value }) => {
              return (
                <a
                  key={Math.random()}
                  href="#"
                  onClick={() => onSelect(value)}
                  className="dropdown-item"
                >
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Languages;
