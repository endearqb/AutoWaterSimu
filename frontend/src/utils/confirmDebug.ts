type ConfirmDebugPayload = Record<string, unknown> | undefined

declare global {
  interface Window {
    __FLOW_CONFIRM_DEBUG__?: boolean
    __FLOW_CONFIRM_BREAK__?: boolean
  }
}

const DEBUG_FLAG_KEY = "FLOW_CONFIRM_DEBUG"

const hasWindow = () => typeof window !== "undefined"

const readDebugFlagFromStorage = () => {
  if (!hasWindow()) return false
  try {
    return window.localStorage.getItem(DEBUG_FLAG_KEY) === "1"
  } catch {
    return false
  }
}

export const isConfirmDebugEnabled = () => {
  if (!hasWindow()) return false
  if (typeof window.__FLOW_CONFIRM_DEBUG__ === "boolean") {
    return window.__FLOW_CONFIRM_DEBUG__
  }
  return readDebugFlagFromStorage()
}

const isBreakEnabled = () => {
  if (!hasWindow()) return false
  return Boolean(window.__FLOW_CONFIRM_BREAK__)
}

export const confirmDebug = (
  scope: string,
  event: string,
  payload?: ConfirmDebugPayload,
  options?: { breakpoint?: boolean },
) => {
  if (!isConfirmDebugEnabled()) return
  const now = new Date().toISOString()
  if (payload) {
    console.log(`[confirm-debug][${now}][${scope}] ${event}`, payload)
  } else {
    console.log(`[confirm-debug][${now}][${scope}] ${event}`)
  }
  if (options?.breakpoint && isBreakEnabled()) {
    debugger
  }
}
