// Route de test pour valider la remontee d'erreurs vers GlitchTip (projet
// frontend, cote serveur Nuxt/Nitro via SENTRY_SERVER_DSN). Bloquee hors dev.
export default defineEventHandler(() => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  throw new Error('Sentry test — serveur Nuxt/Nitro (Eat Planner /api/debug/error)')
})
