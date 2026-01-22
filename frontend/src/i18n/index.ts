import type { PropsWithChildren } from "react"
import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { enMessages } from "./messages/en"
import { zhMessages } from "./messages/zh"
import type { I18nMessages, Language } from "./types"

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const STORAGE_KEY = "locale"
const messages: Record<Language, I18nMessages> = {
  zh: zhMessages,
  en: enMessages,
}

let currentLanguage: Language = "zh"
const listeners = new Set<(language: Language) => void>()

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const resolveMessage = (language: Language, key: string): string => {
  const keys = key.split(".")
  let value: unknown = messages[language]

  for (const segment of keys) {
    if (value && typeof value === "object" && segment in value) {
      value = (value as Record<string, unknown>)[segment]
    } else {
      return key
    }
  }

  return typeof value === "string" ? value : key
}

const formatMessage = (
  template: string,
  params?: Record<string, string | number>,
): string => {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
    const value = params[paramKey]
    return value === undefined || value === null ? match : String(value)
  })
}

const getStoredLanguage = (): Language | null => {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "zh" || stored === "en" ? stored : null
}

const isChinaTimezone = (timeZone: string): boolean => {
  const cnTimezones = new Set([
    "Asia/Shanghai",
    "Asia/Chongqing",
    "Asia/Harbin",
    "Asia/Urumqi",
  ])
  return cnTimezones.has(timeZone)
}

export const detectDefaultLanguage = (): Language => {
  const stored = getStoredLanguage()
  if (stored) return stored
  if (typeof window === "undefined") return currentLanguage

  const locale = window.navigator.language?.toLowerCase() ?? ""
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
  if (locale.startsWith("zh") || isChinaTimezone(timeZone)) {
    return "zh"
  }
  return "en"
}

export const t = (
  key: string,
  params?: Record<string, string | number>,
): string => {
  const message = resolveMessage(currentLanguage, key)
  return formatMessage(message, params)
}

export const setLanguage = (language: Language) => {
  if (language === currentLanguage) return
  currentLanguage = language

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, language)
  }

  if (typeof document !== "undefined") {
    document.documentElement.lang = language
  }

  listeners.forEach((listener) => listener(language))
}

export const getCurrentLanguage = (): Language => currentLanguage

const subscribe = (listener: (language: Language) => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const initial = detectDefaultLanguage()
    currentLanguage = initial
    return initial
  })

  useEffect(() => {
    const unsubscribe = subscribe(setLanguageState)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language
    }
  }, [language])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = t("app.title")
    }
  }, [language])

  const setLocale = useCallback((next: Language) => {
    setLanguage(next)
  }, [])

  const value = useMemo(
    () => ({
      language,
      setLanguage: setLocale,
      t,
    }),
    [language, setLocale],
  )

  return createElement(I18nContext.Provider, { value }, children)
}

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return context
}

export const useLocale = () => {
  const { language, setLanguage: updateLanguage } = useI18n()
  return { language, setLanguage: updateLanguage }
}

export type { I18nMessages, Language }
