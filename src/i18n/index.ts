import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { en, es, pt, type TranslationKey } from './translations';

export type Locale = 'pt' | 'en' | 'es';

const STORAGE_KEY = 'farmpro.locale';
const DICTS: Record<Locale, Partial<Record<TranslationKey, string>>> = { pt, en, es };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>('pt');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'pt' || stored === 'en' || stored === 'es') setLocaleState(stored);
    });
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Não é crítico — só significa que a escolha não persiste entre sessões.
    });
  }

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale]);

  return createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale precisa estar dentro de <LocaleProvider>');
  return ctx;
}

/**
 * `t(key, vars?)` — chave ausente no idioma escolhido cai pro português
 * (a fonte da verdade), então nunca aparece uma chave crua tipo
 * "farms.title" na tela por uma tradução faltando.
 */
export type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export function useT(): TFunction {
  const { locale } = useLocale();

  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const raw = DICTS[locale][key] ?? pt[key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce((text, [k, v]) => text.replaceAll(`{{${k}}}`, String(v)), raw);
    },
    [locale]
  );
}

export type { TranslationKey };
