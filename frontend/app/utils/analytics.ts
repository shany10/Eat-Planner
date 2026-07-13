// Suivi d'événements Umami côté navigateur.
//
// Umami injecte `window.umami` quand le script de tracking est chargé
// (NUXT_PUBLIC_UMAMI_SRC + NUXT_PUBLIC_UMAMI_WEBSITE_ID configurés). Il est
// absent en SSR, en dev sans analytics, ou si un bloqueur coupe le script :
// on no-op silencieusement pour ne jamais casser un flux applicatif.

type UmamiTracker = {
  track: (eventName: string, eventData?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}

export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.umami) {
    return
  }

  try {
    window.umami.track(name, data)
  } catch {
    // Analytics best-effort : une erreur de tracking ne doit rien interrompre.
  }
}
