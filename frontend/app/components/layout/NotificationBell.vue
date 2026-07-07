<script setup lang="ts">
import type { AppNotification } from '~/composables/useNotifications'

const { notifications, unreadCount, hasUnread, isRead, markRead, markAllRead, refresh, loading } = useNotifications()

const open = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

async function openNotification(item: AppNotification) {
  markRead(item.id)
  close()
  await navigateTo(item.to)
}

function severityClass(severity: AppNotification['severity']) {
  if (severity === 'critical') {
    return 'bg-[#ba1a1a]/10 text-[#ba1a1a] dark:bg-[#ff897d]/15 dark:text-[#ff897d]'
  }

  if (severity === 'warning') {
    return 'bg-[#feb236]/15 text-[#6d4700] dark:bg-[#feb236]/15 dark:text-[#ffb94e]'
  }

  return 'bg-[#005013]/10 text-[#005013] dark:bg-[#8ad986]/15 dark:text-[#8ad986]'
}

onMounted(() => {
  refresh()
  refreshTimer = setInterval(() => {
    if (!loading.value) {
      void refresh()
    }
  }, 20000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<template>
  <ClientOnly>
    <div class="relative">
      <button
        type="button"
        aria-label="Notifications"
        class="relative inline-flex size-10 items-center justify-center rounded-full border border-[#c0c9ba]/40 text-[#40493e] transition hover:bg-[#f3f3f3] dark:border-white/10 dark:text-[#c0c9ba] dark:hover:bg-[#2f3131]"
        @click="toggle"
      >
        <UIcon
          name="i-lucide-bell"
          class="size-5"
        />
        <span
          v-if="hasUnread"
          class="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#ba1a1a] px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#1a1c1c]"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </button>

      <div
        v-if="open"
        class="fixed inset-0 z-40"
        @click="close"
      />

      <div
        v-if="open"
        class="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.5rem] border border-[#c0c9ba]/30 bg-white shadow-[0_30px_60px_-15px_rgba(107,52,20,0.35)] dark:border-white/10 dark:bg-[#1a1c1c]"
      >
        <div class="flex items-center justify-between gap-3 border-b border-[#c0c9ba]/20 px-4 py-3 dark:border-white/5">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-[#6b3414]/70 dark:text-[#ffb691]/80">Notifications</span>
            <p class="text-sm font-bold text-[#1a1c1c] dark:text-white">
              {{ unreadCount }} non lue(s)
            </p>
          </div>
          <button
            v-if="hasUnread"
            type="button"
            class="rounded-full border border-[#707a6d] px-3 py-1 text-xs font-bold text-[#1a1c1c] transition hover:bg-[#f3f3f3] dark:border-[#c0c9ba] dark:text-white dark:hover:bg-[#2f3131]"
            @click="markAllRead"
          >
            Tout lire
          </button>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <p
            v-if="notifications.length === 0"
            class="px-4 py-8 text-center text-sm text-[#40493e] dark:text-[#c0c9ba]"
          >
            Rien a signaler. Tout est a jour.
          </p>

          <button
            v-for="item in notifications"
            :key="item.id"
            type="button"
            class="flex w-full items-start gap-3 border-b border-[#c0c9ba]/15 px-4 py-3 text-left transition hover:bg-[#f3f3f3] dark:border-white/5 dark:hover:bg-[#2f3131]"
            @click="openNotification(item)"
          >
            <span
              class="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full"
              :class="severityClass(item.severity)"
            >
              <UIcon
                :name="item.icon"
                class="size-4"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-bold text-[#1a1c1c] dark:text-white">{{ item.title }}</span>
                <span
                  v-if="!isRead(item.id)"
                  class="size-2 shrink-0 rounded-full bg-[#ba1a1a]"
                />
              </span>
              <span class="mt-0.5 block text-xs leading-5 text-[#40493e] dark:text-[#c0c9ba]">
                {{ item.description }}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <template #fallback>
      <span class="inline-flex size-10 items-center justify-center rounded-full border border-[#c0c9ba]/40 text-[#40493e] dark:border-white/10 dark:text-[#c0c9ba]">
        <UIcon
          name="i-lucide-bell"
          class="size-5"
        />
      </span>
    </template>
  </ClientOnly>
</template>
