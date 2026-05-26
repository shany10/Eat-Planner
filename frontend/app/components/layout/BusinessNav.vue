<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

type NavLink = {
  to: string
  label: string
  hint: string
  icon: string
}

type NavSection = {
  title: string
  links: NavLink[]
}

const route = useRoute()
const authStore = useAuthStore()
const appToast = useAppToast()

const sections = computed<NavSection[]>(() => {
  const baseSections: NavSection[] = [
    {
      title: 'Pilotage',
      links: [
        { to: '/', label: 'Dashboard', hint: 'Vue globale du restaurant', icon: 'i-lucide-layout-dashboard' },
        { to: '/forecasts', label: 'Previsions', hint: 'Production et besoins matieres', icon: 'i-lucide-chart-no-axes-combined' }
      ]
    },
    {
      title: 'Operations',
      links: [
        { to: '/ingredients', label: 'Ingredients', hint: 'Matieres premieres et prix achat', icon: 'i-lucide-wheat' },
        { to: '/suppliers', label: 'Fournisseurs', hint: 'Partenaires et contacts achats', icon: 'i-lucide-truck' },
        { to: '/dishes', label: 'Plats', hint: 'Recettes et prix conseilles', icon: 'i-lucide-utensils' },
        { to: '/charges', label: 'Charges', hint: 'Couts fixes et variables', icon: 'i-lucide-receipt' },
        { to: '/sales', label: 'Ventes', hint: 'Tickets et historique', icon: 'i-lucide-banknote' }
      ]
    },
    {
      title: 'Compte',
      links: [
        { to: '/account', label: 'Mon compte', hint: 'Profil, acces et statut du compte', icon: 'i-lucide-user-round' },
        { to: '/security', label: 'Securite 2FA', hint: 'Google, TOTP et double authentification', icon: 'i-lucide-shield-check' }
      ]
    }
  ]

  if (authStore.profile?.role === 'admin') {
    baseSections.push({
      title: 'Administration',
      links: [
        { to: '/admin', label: 'Panel admin', hint: 'Utilisateurs, acces et roles', icon: 'i-lucide-users-round' }
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
    return { to: '/admin', label: 'Panel admin', hint: 'Utilisateurs et acces critiques', icon: 'i-lucide-users-round' }
  }

  return { to: '/forecasts', label: 'Prevision du jour', hint: 'Volumes et besoins matieres', icon: 'i-lucide-chart-no-axes-combined' }
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
  appToast.info('Session fermee', 'Tu es deconnecte.')
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
    appToast.warning('Session expiree', 'Reconnecte-toi pour continuer.')
    await navigateTo('/login')
  }
})
</script>

<template>
  <aside class="flex h-full min-h-[calc(100vh-65px)] flex-col">
    <div class="border-b border-slate-200 p-4 dark:border-slate-800">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white">
          {{ displayName.slice(0, 1) }}
        </div>
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {{ displayName }}
          </h2>
          <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {{ accountHint }}
          </p>
        </div>
      </div>

      <div class="mt-4 grid gap-2 text-xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-slate-500 dark:text-slate-400">Role</span>
          <span class="font-medium text-slate-800 dark:text-slate-200">{{ roleBadge }}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-slate-500 dark:text-slate-400">Connexion</span>
          <span class="font-medium text-slate-800 dark:text-slate-200">{{ providerBadge }}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-slate-500 dark:text-slate-400">Securite</span>
          <span class="font-medium text-slate-800 dark:text-slate-200">{{ securityBadge }}</span>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-4">
      <div class="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm dark:border-teal-900/60 dark:bg-teal-950/30">
        <div class="flex items-start gap-2">
          <UIcon
            :name="focusLink.icon"
            class="mt-0.5 size-4 text-teal-700 dark:text-teal-300"
          />
          <div>
            <p class="font-semibold text-teal-950 dark:text-teal-100">
              {{ currentLink?.label || focusLink.label }}
            </p>
            <p class="mt-1 text-xs leading-5 text-teal-800 dark:text-teal-200">
              {{ currentLink?.hint || focusLink.hint }}
            </p>
          </div>
        </div>
      </div>

      <section
        v-for="section in sections"
        :key="section.title"
        class="mb-5"
      >
        <p class="mb-2 px-2 text-xs font-semibold uppercase text-slate-400">
          {{ section.title }}
        </p>
        <div class="grid gap-1">
          <NuxtLink
            v-for="link in section.links"
            :key="link.to"
            :to="link.to"
            class="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition"
            :class="isActive(link.to)
              ? 'bg-slate-950 font-semibold text-white dark:bg-white dark:text-slate-950'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'"
          >
            <UIcon
              :name="link.icon"
              class="size-4 shrink-0"
              :class="isActive(link.to) ? 'text-white dark:text-slate-950' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'"
            />
            <span class="min-w-0 flex-1 truncate">{{ link.label }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>

    <div class="border-t border-slate-200 p-4 dark:border-slate-800">
      <p class="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {{ accessSignal }}
      </p>
      <button
        class="btn-secondary w-full"
        @click="handleLogout"
      >
        <UIcon
          name="i-lucide-log-out"
          class="size-4"
        />
        Se deconnecter
      </button>
    </div>
  </aside>
</template>
