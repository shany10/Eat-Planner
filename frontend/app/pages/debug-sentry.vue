<script setup lang="ts">
// Page de test du monitoring d'erreurs (GlitchTip). Trois déclencheurs pour
// couvrir les trois pipelines : navigateur (Sentry client), serveur Nuxt
// (SENTRY_SERVER_DSN) et backend Express (SENTRY_DSN).
definePageMeta({
  middleware: 'auth'
})

const appToast = useAppToast()
const runningServer = ref(false)
const runningBackend = ref(false)

function triggerClientError() {
  // Erreur non gérée côté navigateur → captée par @sentry/nuxt (projet frontend).
  throw new Error('Sentry test — client navigateur (Eat Planner)')
}

async function triggerServerError() {
  runningServer.value = true
  try {
    await $fetch('/api/debug/error')
    appToast.warning('Aucune erreur', 'La route n\'a pas levé d\'erreur (dev désactivé ?).')
  } catch {
    appToast.info('Erreur serveur Nuxt déclenchée', 'Regarde le projet frontend dans GlitchTip.')
  } finally {
    runningServer.value = false
  }
}

async function triggerBackendError() {
  runningBackend.value = true
  try {
    await $fetch('/api/debug/backend-error')
    appToast.warning('Aucune erreur', 'Le backend n\'a pas levé d\'erreur (prod ?).')
  } catch {
    appToast.info('Erreur backend déclenchée', 'Regarde le projet backend dans GlitchTip.')
  } finally {
    runningBackend.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Monitoring"
      title="Test GlitchTip"
      subtitle="Déclenche une erreur volontaire pour vérifier que la capture d'erreurs remonte bien dans GlitchTip."
    />

    <p class="app-alert-error">
      <UIcon
        name="i-lucide-triangle-alert"
        class="mt-0.5 size-4 shrink-0"
      />
      <span>
        Ces boutons provoquent de vraies erreurs (sans données perdues). Les erreurs
        n'apparaissent dans GlitchTip que si les DSN sont configurés dans le
        <code>.env</code> et l'app relancée. Les routes serveur/backend sont désactivées en production.
      </span>
    </p>

    <section class="app-section grid gap-4 sm:grid-cols-3">
      <div class="space-y-3">
        <h2 class="app-section-title">
          Navigateur
        </h2>
        <p class="text-sm text-[color:var(--ep-text-muted)]">
          Erreur JS non gérée → projet <strong>frontend</strong> (DSN <code>NUXT_PUBLIC_SENTRY_DSN</code>).
        </p>
        <AppButton
          variant="secondary"
          icon="i-lucide-bug"
          @click="triggerClientError"
        >
          Erreur client
        </AppButton>
      </div>

      <div class="space-y-3">
        <h2 class="app-section-title">
          Serveur Nuxt
        </h2>
        <p class="text-sm text-[color:var(--ep-text-muted)]">
          Erreur SSR/Nitro → projet <strong>frontend</strong> (DSN <code>SENTRY_SERVER_DSN</code>).
        </p>
        <AppButton
          variant="secondary"
          icon="i-lucide-server-crash"
          :loading="runningServer"
          :disabled="runningServer"
          @click="triggerServerError"
        >
          Erreur serveur Nuxt
        </AppButton>
      </div>

      <div class="space-y-3">
        <h2 class="app-section-title">
          Backend Express
        </h2>
        <p class="text-sm text-[color:var(--ep-text-muted)]">
          Erreur API → projet <strong>backend</strong> (DSN <code>SENTRY_DSN</code>).
        </p>
        <AppButton
          variant="secondary"
          icon="i-lucide-database-zap"
          :loading="runningBackend"
          :disabled="runningBackend"
          @click="triggerBackendError"
        >
          Erreur backend
        </AppButton>
      </div>
    </section>
  </div>
</template>
