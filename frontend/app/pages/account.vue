<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const appToast = useAppToast()
const loading = ref(true)
const errorMessage = ref('')

const profile = computed(() => authStore.profile)
const fullName = computed(() => {
  if (!profile.value) {
    return 'Compte utilisateur'
  }

  return `${profile.value.firstname} ${profile.value.lastname}`
})

const securityStatus = computed(() => {
  return profile.value?.twoFactorEnabled ? 'Activee' : 'Inactive'
})

function getErrorMessage(error: unknown, fallback: string) {
  return getFetchErrorMessage(error, fallback)
}

async function loadPage() {
  loading.value = true
  errorMessage.value = ''

  try {
    await authStore.loadProfile()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de charger le profil')
    appToast.error('Profil indisponible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-8">
    <section class="app-page-header">
      <p class="app-eyebrow">
        Profil
      </p>
      <h1 class="app-title mt-3">
        Mon compte
      </h1>
      <p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Retrouve ici les informations de connexion du compte, son niveau de securite et les raccourcis utiles pour le gerer proprement.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink
          to="/security"
          class="btn-primary"
        >
          Gerer la 2FA
        </NuxtLink>
      </div>
    </section>

    <div
      v-if="loading"
      class="grid gap-4 lg:grid-cols-3"
    >
      <div class="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div class="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div class="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>

    <template v-else>
      <p
        v-if="errorMessage"
        class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      >
        {{ errorMessage }}
      </p>

      <section class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-slate-500">
                Identite
              </p>
              <h2 class="mt-2 text-2xl font-semibold">
                {{ fullName }}
              </h2>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {{ profile?.email || 'Email indisponible' }}
              </p>
            </div>
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-semibold text-white dark:bg-white dark:text-slate-900">
              {{ profile?.firstname?.[0] || 'U' }}{{ profile?.lastname?.[0] || '' }}
            </div>
          </div>

          <div class="mt-6 grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Role
              </p>
              <p class="mt-2 font-medium">
                {{ profile?.role || '-' }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Fournisseur de connexion
              </p>
              <p class="mt-2 font-medium">
                {{ profile?.authProvider || '-' }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Compte actif
              </p>
              <p class="mt-2 font-medium">
                {{ profile?.active ? 'Oui' : 'Non' }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Double authentification
              </p>
              <p class="mt-2 font-medium">
                {{ securityStatus }}
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="text-xl font-semibold">
              Raccourcis compte
            </h2>
            <div class="mt-5 grid gap-3">
              <NuxtLink
                to="/security"
                class="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
              >
                Configurer la securite 2FA
              </NuxtLink>
              <NuxtLink
                to="/login"
                class="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
              >
                Retester le parcours de connexion
              </NuxtLink>
              <NuxtLink
                to="/"
                class="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
              >
                Revenir au dashboard
              </NuxtLink>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="text-xl font-semibold">
              Niveau de securite
            </h2>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ profile?.twoFactorEnabled
                ? 'Ton compte est deja protege par un code TOTP en plus du mot de passe.'
                : 'Ton compte peut encore etre renforce avec une double authentification TOTP.' }}
            </p>
            <NuxtLink
              to="/security"
              class="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {{ profile?.twoFactorEnabled ? 'Voir la securite' : 'Activer la 2FA' }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <EmptyStateCard
        v-if="profile && !profile.twoFactorEnabled"
        eyebrow="Protection recommandee"
        title="La 2FA n est pas encore activee sur ce compte."
        description="Tu peux ajouter une verification TOTP pour proteger les connexions locales et Google. Le flow est deja pret dans la page securite."
        action-label="Configurer la 2FA"
        action-to="/security"
      />
    </template>
  </div>
</template>
