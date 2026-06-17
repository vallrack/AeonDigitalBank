
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface I18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKey;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    const savedLang = localStorage.getItem('aeon_lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('aeon_lang', lang);
  };

  const t = translations[language];

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}
