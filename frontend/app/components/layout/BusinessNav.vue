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
  <aside class="flex flex-col h-full bg-[#6b3414] border-r border-[#c0c9ba]/10 dark:border-white/10 transition-all duration-300 font-['Be_Vietnam_Pro',sans-serif]">
    <nav class="flex-1 space-y-4 pt-6 overflow-y-auto">
      <div
        v-for="section in sections"
        :key="section.title"
      >
        <p class="mb-2 px-8 text-[10px] font-bold uppercase text-white/40 tracking-wider">
          {{ section.title }}
        </p>
        <div class="space-y-1">
          <NuxtLink
            v-for="link in section.links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 py-2.5 px-5 rounded-full mx-3 transition-all text-sm"
            :class="isActive(link.to)
              ? 'bg-[#feb236] text-[#6d4700] font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] active:scale-95'
              : 'text-white hover:bg-[#884b29] font-medium'"
          >
            <UIcon
              :name="link.icon"
              class="size-5"
            />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <div class="mt-auto px-6 py-5 border-t border-white/10 bg-black/10">
      <div 
        class="flex items-center gap-3 cursor-pointer group" 
        @click="handleLogout" 
        title="Se deconnecter"
      >
        <div class="w-10 h-10 rounded-full bg-[#feb236] flex items-center justify-center text-[#6d4700] font-bold shrink-0">
          {{ displayName.slice(0, 2).toUpperCase() }}
        </div>
        <div class="overflow-hidden w-full">
          <p class="text-white font-bold truncate text-sm flex items-center justify-between group-hover:text-red-300 transition-colors">
            {{ displayName }}
            <UIcon name="i-lucide-log-out" class="size-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-300" />
          </p>
          <p class="text-white/60 text-xs truncate font-medium">{{ roleBadge }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>
