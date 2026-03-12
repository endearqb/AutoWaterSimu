import type {
  UDMModelDetailPublic,
  UDMModelPublic,
} from "@/client/types.gen"
import { enMessages } from "@/i18n/messages/en"
import { zhMessages } from "@/i18n/messages/zh"
import type { I18nMessages, Language } from "@/i18n/types"

type Translator = (key: string, params?: Record<string, string | number>) => string

type TutorialMetaCarrier = {
  meta?: unknown
  tags?: string[] | null
}

const STATIC_MESSAGES: Record<Language, I18nMessages> = {
  zh: zhMessages,
  en: enMessages,
}

const LESSON_KEY_PATTERN = /^chapter-\d+$/i

const resolveStaticMessage = (language: Language, key: string): string => {
  const keys = key.split(".")
  let value: unknown = STATIC_MESSAGES[language]

  for (const segment of keys) {
    if (value && typeof value === "object" && segment in value) {
      value = (value as Record<string, unknown>)[segment]
    } else {
      return key
    }
  }

  return typeof value === "string" ? value : key
}

const getStaticTranslator = (language: Language): Translator => (key, params) => {
  const template = resolveStaticMessage(language, key)
  if (!params) return template

  return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
    const value = params[paramKey]
    return value === undefined || value === null ? match : String(value)
  })
}

const translateIfExists = (
  t: Translator,
  key: string,
  params?: Record<string, string | number>,
): string | undefined => {
  const value = t(key, params)
  return value === key ? undefined : value
}

const humanizeCanonicalName = (value: string): string => {
  const normalized = String(value || "").trim()
  if (!normalized) return ""
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export const formatAliasWithCanonical = (
  alias: string | undefined,
  canonical: string,
): string => {
  const normalizedAlias = String(alias || "").trim()
  const normalizedCanonical = String(canonical || "").trim()
  if (!normalizedAlias) return normalizedCanonical
  if (!normalizedCanonical || normalizedAlias === normalizedCanonical) {
    return normalizedAlias
  }
  return `${normalizedAlias} (${normalizedCanonical})`
}

export const extractLessonKeyFromTags = (
  tags?: string[] | null,
): string | undefined =>
  (tags || []).find((tag) => LESSON_KEY_PATTERN.test(String(tag || "").trim()))

export const extractLessonKeyFromMeta = (meta: unknown): string | undefined => {
  if (!meta || typeof meta !== "object") return undefined

  const metaRecord = meta as Record<string, unknown>
  const learning =
    metaRecord.learning && typeof metaRecord.learning === "object"
      ? (metaRecord.learning as Record<string, unknown>)
      : metaRecord

  const lessonKey = String(
    learning.lessonKey || learning.lesson_key || learning.chapter || "",
  ).trim()
  return LESSON_KEY_PATTERN.test(lessonKey) ? lessonKey : undefined
}

export const extractLessonKeyFromModelSummary = (
  model?: UDMModelPublic | null,
): string | undefined => extractLessonKeyFromTags(model?.tags)

export const extractLessonKeyFromModelDetail = (
  detail?: UDMModelDetailPublic | null,
): string | undefined => {
  if (!detail) return undefined
  return (
    extractLessonKeyFromMeta(detail.latest_version?.meta) ||
    extractLessonKeyFromTags(detail.tags)
  )
}

export const extractLessonKeyFromCarrier = (
  carrier?: TutorialMetaCarrier | null,
): string | undefined =>
  extractLessonKeyFromMeta(carrier?.meta) || extractLessonKeyFromTags(carrier?.tags)

const resolveAliasKey = (
  lessonKey: string | undefined,
  section: "components" | "processes" | "parameters" | "models" | "templates",
  canonical: string,
  field: "label" | "description" | "name",
) =>
  lessonKey
    ? `flow.tutorial.aliases.lessons.${lessonKey}.${section}.${canonical}.${field}`
    : undefined

export const resolveTutorialModelDisplayName = (
  t: Translator,
  lessonKey: string | undefined,
  fallbackName: string,
): string =>
  translateIfExists(
    t,
    resolveAliasKey(lessonKey, "models", "default", "name") ||
      "__missing_model_alias__",
  ) ||
  (lessonKey
    ? translateIfExists(t, `flow.tutorial.chapters.${lessonKey}.title`)
    : undefined) ||
  fallbackName

export const resolveTutorialModelDescription = (
  t: Translator,
  lessonKey: string | undefined,
  fallbackDescription?: string | null,
): string =>
  translateIfExists(
    t,
    resolveAliasKey(lessonKey, "models", "default", "description") ||
      "__missing_model_description__",
  ) ||
  (lessonKey
    ? translateIfExists(t, `flow.tutorial.chapters.${lessonKey}.subtitle`)
    : undefined) ||
  fallbackDescription ||
  ""

export const resolveTutorialTemplateDisplay = (
  t: Translator,
  templateKey: string,
  fallbackName: string,
  fallbackDescription?: string | null,
) => ({
  name:
    translateIfExists(
      t,
      `flow.tutorial.aliases.templates.${templateKey}.name`,
    ) || fallbackName,
  description:
    translateIfExists(
      t,
      `flow.tutorial.aliases.templates.${templateKey}.description`,
    ) || fallbackDescription || "",
})

export const resolveTutorialComponentDisplay = (
  t: Translator,
  lessonKey: string | undefined,
  componentName: string,
  fallbackLabel?: string | null,
) => {
  const aliasDescription =
    translateIfExists(
      t,
      resolveAliasKey(lessonKey, "components", componentName, "description") ||
        "__missing_component_description__",
    ) || undefined

  return {
    label: String(fallbackLabel || "").trim() || componentName,
    description: aliasDescription,
  }
}

export const resolveTutorialParameterDisplay = (
  t: Translator,
  lessonKey: string | undefined,
  parameterName: string,
) => {
  const aliasLabel =
    translateIfExists(
      t,
      resolveAliasKey(lessonKey, "parameters", parameterName, "label") ||
        "__missing_parameter_alias__",
    ) || undefined
  const aliasDescription =
    translateIfExists(
      t,
      resolveAliasKey(lessonKey, "parameters", parameterName, "description") ||
        "__missing_parameter_description__",
    ) || undefined

  return {
    label: aliasLabel || humanizeCanonicalName(parameterName),
    description: aliasDescription,
  }
}

export const resolveTutorialProcessDisplay = (
  t: Translator,
  lessonKey: string | undefined,
  processName: string,
) => {
  const aliasLabel =
    translateIfExists(
      t,
      resolveAliasKey(lessonKey, "processes", processName, "label") ||
        "__missing_process_label__",
    ) || undefined

  const aliasDescription =
    translateIfExists(
      t,
      resolveAliasKey(lessonKey, "processes", processName, "description") ||
        "__missing_process_description__",
    ) || undefined

  return {
    label: aliasLabel || humanizeCanonicalName(processName),
    description: aliasDescription,
  }
}

export const resolveTutorialVariableLabel = (
  t: Translator,
  lessonKey: string | undefined,
  variableName: string,
  fallbackLabel?: string | null,
) =>
  resolveTutorialComponentDisplay(t, lessonKey, variableName, fallbackLabel).label

export const matchesTutorialComponentDescription = (
  note: string | null | undefined,
  lessonKey: string | undefined,
  componentName: string,
  fallbackLabel?: string | null,
): boolean => {
  const normalizedNote = String(note || "").trim()
  if (!normalizedNote || !lessonKey) return false

  const descriptionVariants = (["zh", "en"] as const)
    .map((language) =>
      resolveTutorialComponentDisplay(
        getStaticTranslator(language),
        lessonKey,
        componentName,
        fallbackLabel,
      ).description?.trim(),
    )
    .filter((value): value is string => Boolean(value))

  return new Set(descriptionVariants).has(normalizedNote)
}
