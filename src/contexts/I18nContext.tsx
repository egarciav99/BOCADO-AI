import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import es from "../locales/es.json";
import en from "../locales/en.json";
import { useAuthStore } from "../stores/authStore";
import { useUserProfile, useUpdateUserProfile } from "../hooks/useUser";

type Locale = "es" | "en";

interface Translation {
  [key: string]: any;
}

const translations: Record<Locale, Translation> = {
  es,
  en,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, any>) => string;
  isLoadingLocale: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "bocado-locale";

function getBrowserLocale(): Locale {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("es")) return "es";
  return "en";
}

function getStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "es" || stored === "en") return stored;
  return getBrowserLocale();
}

/**
 * I18nProvider
 *
 * Sincroniza el idioma con:
 * 1. Firebase (users/{uid}/language) - Single Source of Truth
 * 2. localStorage - Fallback y respaldo local
 * 3. Navegador - Valor por defecto si no hay usuario autenticado
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const { data: profile } = useUserProfile(user?.uid);
  const updateProfileMutation = useUpdateUserProfile();

  const [locale, setLocaleState] = useState<Locale>(getStoredLocale());
  const [isLoadingLocale, setIsLoadingLocale] = useState(true);
  const hasLoadedFromFirebase = useRef(false);

  // Al cargar, prioridad: Firebase > localStorage > navegador
  // Solo se ejecuta UNA VEZ cuando se carga el perfil del usuario
  useEffect(() => {
    if (!user) {
      // Sin usuario: usar localStorage o navegador
      setIsLoadingLocale(false);
      hasLoadedFromFirebase.current = false;
      return;
    }

    // Si ya cargamos desde Firebase, no hacer nada más
    if (hasLoadedFromFirebase.current) {
      return;
    }

    if (profile?.language) {
      // Usuario con perfil: usar idioma de Firebase SOLO si es diferente al actual
      if (locale !== profile.language) {
        setLocaleState(profile.language);
        localStorage.setItem(LOCALE_STORAGE_KEY, profile.language);
      }
      hasLoadedFromFirebase.current = true;
      setIsLoadingLocale(false);
    } else if (profile !== undefined && !profile?.language) {
      // Perfil cargado pero sin idioma: usar localStorage
      hasLoadedFromFirebase.current = true;
      setIsLoadingLocale(false);
    }
  }, [user?.uid, profile, locale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

      // Sincronizar con Firebase si hay usuario autenticado
      if (user?.uid) {
        updateProfileMutation.mutate({
          userId: user.uid,
          data: { language: newLocale },
        });
      }
    },
    [user?.uid, updateProfileMutation],
  );

  const t = useCallback(
    (key: string, variables?: Record<string, any>): string => {
      const keys = key.split(".");
      let value: any = translations[locale];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          if (import.meta.env.DEV)
            console.warn(`Translation key not found: ${key}`);
          return key;
        }
      }

      if (typeof value !== "string") {
        return key;
      }

      // Interpolación de variables: reemplazar {variableName} con el valor correspondiente
      if (variables) {
        return value.replace(/\{(\w+)\}/g, (match, varName) => {
          return variables[varName] !== undefined
            ? String(variables[varName])
            : match;
        });
      }

      return value;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isLoadingLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return context;
}
