import { useAuthStore } from '~/stores/auth'

// Modules restaurant : reserves aux roles operationnels (manager, employe).
// L admin gere la plateforme (utilisateurs) et n a rien a faire dans la carte,
// les plats ou les achats d un resto : on le renvoie vers son panel. Les
// fournisseurs sont renvoyes vers leur messagerie. Les donnees sont deja
// cloisonnees par `owner` cote backend ; ce garde-fou verrouille aussi l acces
// direct par URL cote front.
export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  if (!authStore.profile) {
    try {
      await authStore.loadProfile()
    } catch {
      authStore.logout()
      return navigateTo('/login')
    }
  }

  const role = authStore.profile?.role

  if (role === 'supplier') {
    return navigateTo('/supplier-messages')
  }

  if (role === 'admin') {
    return navigateTo('/admin')
  }
})
