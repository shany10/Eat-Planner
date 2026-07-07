import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    return navigateTo(authStore.profile?.role === 'supplier' ? '/supplier-messages' : '/')
  }
})
