<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

type NavLink = {
  to: string
  label: string
  hint: string
}

type NavSection = {
  title: string
  links: NavLink[]
}

const route = useRoute()
const authStore = useAuthStore()

const sections = computed<NavSection[]>(() => {
  const baseSections: NavSection[] = [
    {
      title: 'Pilotage',
      links: [
        { to: '/', label: 'Dashboard', hint: 'Vue globale du restaurant' },
        { to: '/forecasts', label: 'Previsions', hint: 'Production et besoins matieres' }
      ]
    },
    {
      title: 'Operations',
      links: [
        { to: '/ingredients', label: 'Ingredients', hint: 'Fournisseurs et matieres premieres' },
        { to: '/dishes', label: 'Plats', hint: 'Recettes et prix conseilles' },
        { to: '/charges', label: 'Charges', hint: 'Couts fixes et variables' },
        { to: '/sales', label: 'Ventes', hint: 'Tickets et historique' }
      ]
    },
    {
      title: 'Compte',
      links: [
        { to: '/account', label: 'Mon compte', hint: 'Profil, acces et statut du compte' },
        { to: '/security', label: 'Securite 2FA', hint: 'Google, TOTP et double authentification' }
      ]
    }
  ]

  if (authStore.profile?.role === 'admin') {
    baseSections.push({
      title: 'Administration',
      links: [
        { to: '/admin', label: 'Panel admin', hint: 'Utilisateurs, acces et roles' }
      ]
    })
  }

  return baseSections
})

const displayName = computed(() => {
  if (!authStore.profile) {
    return 'Compte connecte'
  }

  return `${authStore.profile.firstname} ${authStore.profile.lastname}`
})

const accountHint = computed(() => {
  if (!authStore.profile) {
    return 'Chargement du profil...'
  }

  return authStore.profile.email
})

const securityBadge = computed(() => {
  if (!authStore.profile) {
    return 'Profil'
  }

  return authStore.profile.twoFactorEnabled ? '2FA activee' : '2FA inactive'
})

const providerBadge = computed(() => {
  if (!authStore.profile) {
    return 'Connexion'
  }

  return authStore.profile.authProvider === 'google' ? 'Google' : 'Local'
})

const roleBadge = computed(() => {
  if (!authStore.profile) {
    return 'Role'
  }

  return authStore.profile.role === 'admin' ? 'Admin principal' : 'Manager'
})

const focusLink = computed<NavLink>(() => {
  if (authStore.profile?.role === 'admin') {
    return { to: '/admin', label: 'Panel admin', hint: 'Utilisateurs et acces critiques' }
  }

  return { to: '/forecasts', label: 'Prevision du jour', hint: 'Volumes et besoins matieres' }
})

const currentLink = computed(() => {
  return sections.value
    .flatMap(section => section.links)
    .find(link => isActive(link.to)) ?? null
})

const accessSignal = computed(() => {
  if (!authStore.profile) {
    return 'Chargement du contexte connecte...'
  }

  return authStore.profile.twoFactorEnabled
    ? 'Acces securise et session prete.'
    : 'Pense a activer la 2FA pour un rendu plus pro.'
})

function isActive(path: string) {
  return route.path === path
}

async function handleLogout() {
  authStore.logout()
  await navigateTo('/login')
}

onMounted(async () => {
  if (!authStore.isAuthenticated || authStore.profile) {
    return
  }

  try {
    await authStore.loadProfile()
  } catch {
    authStore.logout()
    await navigateTo('/login')
  }
})
</script>

<template>
  <aside class="flex h-full min-h-[calc(100vh-76px)] flex-col bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_18%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_18%,#020617_100%)]">
    <div class="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
      <div class="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(145deg,#fff7ed_0%,#eff6ff_55%,#f8fafc_100%)] p-5 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(145deg,#111827_0%,#0f172a_50%,#020617_100%)]">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Console connectee
        </p>
        <h2 class="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
          {{ displayName }}
        </h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {{ accountHint }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2 text-xs">
          <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
            {{ roleBadge }}
          </span>
          <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
            {{ securityBadge }}
          </span>
          <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
            {{ providerBadge }}
          </span>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <NuxtLink
            to="/"
            class="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-700 dark:bg-slate-950/60 dark:hover:bg-slate-950"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              Dashboard
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Revenir a la vue d ensemble.
            </p>
          </NuxtLink>

          <NuxtLink
            :to="focusLink.to"
            class="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-700 dark:bg-slate-950/60 dark:hover:bg-slate-950"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ focusLink.label }}
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {{ focusLink.hint }}
            </p>
          </NuxtLink>
        </div>

        <button
          class="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          @click="handleLogout"
        >
          Se deconnecter
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-5">
      <div class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
          Ou tu te trouves
        </p>
        <p class="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          {{ currentLink?.label || 'Navigation connectee' }}
        </p>
        <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {{ currentLink?.hint || 'Choisis une zone pour continuer a structurer le produit.' }}
        </p>
      </div>

      <div class="space-y-6">
        <section
          v-for="section in sections"
          :key="section.title"
          class="pt-6"
        >
          <p class="mb-3 text-xs uppercase tracking-[0.25em] text-slate-400">
            {{ section.title }}
          </p>
          <div class="space-y-2">
            <NuxtLink
              v-for="link in section.links"
              :key="link.to"
              :to="link.to"
              class="block rounded-2xl border px-4 py-3 transition"
              :class="isActive(link.to)
                ? 'border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-200 bg-white/80 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900'"
            >
              <p class="text-sm font-medium">
                {{ link.label }}
              </p>
              <p
                class="mt-1 text-xs"
                :class="isActive(link.to) ? 'text-white/70 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'"
              >
                {{ link.hint }}
              </p>
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>

    <div class="border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <p>Navigation principale de l application connectee.</p>
      <p class="mt-1">
        {{ accessSignal }}
      </p>
    </div>
  </aside>
</template>
