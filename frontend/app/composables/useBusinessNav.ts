import { useAuthStore } from '~/stores/auth'

export type NavLink = {
  to: string
  label: string
  hint: string
  icon: string
}

export type NavSection = {
  title: string
  links: NavLink[]
}

export function useBusinessNav() {
  const route = useRoute()
  const authStore = useAuthStore()
  const appToast = useAppToast()

  const sections = computed<NavSection[]>(() => {
    if (authStore.profile?.role === 'supplier') {
      return [
        {
          title: 'Portail fournisseur',
          links: [
            { to: '/supplier-messages', label: 'Messagerie', hint: 'Conversation avec le restaurant', icon: 'i-lucide-message-circle' }
          ]
        },
        {
          title: 'Compte',
          links: [
            { to: '/account', label: 'Mon compte', hint: 'Profil et statut du compte', icon: 'i-lucide-user-round' }
          ]
        }
      ]
    }

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
          { to: '/supplier-messages', label: 'Messagerie', hint: 'Emails fournisseurs via Mailpit', icon: 'i-lucide-mails' },
          { to: '/purchase-orders', label: 'Panier achats', hint: 'Commandes ingredients fournisseurs', icon: 'i-lucide-shopping-cart' },
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

  const flatLinks = computed<NavLink[]>(() => sections.value.flatMap(section => section.links))

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

    if (authStore.profile.role === 'admin') {
      return 'Admin principal'
    }

    return authStore.profile.role === 'supplier' ? 'Fournisseur' : 'Manager'
  })

  const focusLink = computed<NavLink>(() => {
    if (authStore.profile?.role === 'admin') {
      return { to: '/admin', label: 'Panel admin', hint: 'Utilisateurs et acces critiques', icon: 'i-lucide-users-round' }
    }

    if (authStore.profile?.role === 'supplier') {
      return { to: '/supplier-messages', label: 'Messagerie', hint: 'Conversation fournisseur', icon: 'i-lucide-message-circle' }
    }

    return { to: '/forecasts', label: 'Prevision du jour', hint: 'Volumes et besoins matieres', icon: 'i-lucide-chart-no-axes-combined' }
  })

  function isActive(path: string) {
    return route.path === path
  }

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

  const avatarInitial = computed(() => displayName.value.slice(0, 1))

  async function handleLogout() {
    authStore.logout()
    appToast.info('Session fermee', 'Tu es deconnecte.')
    await navigateTo('/login')
  }

  async function ensureProfileLoaded() {
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
  }

  return {
    sections,
    flatLinks,
    displayName,
    accountHint,
    securityBadge,
    providerBadge,
    roleBadge,
    focusLink,
    currentLink,
    accessSignal,
    avatarInitial,
    isActive,
    handleLogout,
    ensureProfileLoaded
  }
}
