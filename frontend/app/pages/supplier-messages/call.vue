<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()

const displayName = computed(() => {
  const profile = authStore.profile
  if (!profile) {
    return 'Eat Planner'
  }

  return `${profile.firstname} ${profile.lastname}`.trim() || profile.email
})

async function handleLeave() {
  await navigateTo('/supplier-messages')
}

onMounted(async () => {
  if (!authStore.profile) {
    await authStore.loadProfile()
  }
})
</script>

<template>
  <div class="space-y-5 font-sans">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span class="app-eyebrow">Messagerie fournisseurs</span>
          <h1 class="app-title">
            Appel visio fournisseur
          </h1>
          <p class="app-subtitle">
            Echange en visio avec ton fournisseur en direct.
          </p>
        </div>

        <NuxtLink
          to="/supplier-messages"
          class="btn-secondary"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Messagerie
        </NuxtLink>
      </div>
    </section>

    <ClientOnly>
      <WebRtcVideoCall
        default-room-name="eat-planner-fournisseurs"
        :display-name="displayName"
        @leave="handleLeave"
      />

      <template #fallback>
        <section class="app-section">
          <div class="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </section>
      </template>
    </ClientOnly>
  </div>
</template>
