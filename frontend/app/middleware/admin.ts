import { useAuthStore } from '~/stores/auth'

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

  if (authStore.profile?.role !== 'admin') {
    return navigateTo('/')
  }
})
