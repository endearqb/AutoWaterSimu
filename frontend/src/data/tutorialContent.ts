import type { Language } from "@/i18n/types"

export interface LocalizedText {
  zh: string
  en: string
}

export const localizedText = (zh: string, en: string): LocalizedText => ({
  zh,
  en,
})

export const resolveLocalizedText = (
  language: Language,
  value: LocalizedText | undefined | null,
): string => {
  if (!value) return ""
  return value[language] || value.zh || value.en || ""
}
