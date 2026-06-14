<script setup lang="ts">
const {
  sections,
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
  handleLogout
} = useBusinessNav()

const { collapsed } = useSidebar()
</script>

<template>
  <aside class="flex h-full flex-col">
    <div
      class="border-b border-slate-200 p-4 dark:border-slate-800"
      :class="collapsed ? 'flex flex-col items-center gap-3' : ''"
    >
      <div
        class="flex items-start gap-3"
        :class="collapsed ? 'w-full justify-center' : ''"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white">
          {{ avatarInitial }}
        </div>
        <div
          v-if="!collapsed"
          class="min-w-0"
        >
          <h2 class="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {{ displayName }}
          </h2>
          <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {{ accountHint }}
          </p>
        </div>
      </div>

      <div
        v-if="!collapsed"
        class="mt-4 grid gap-2 text-xs"
      >
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

    <div
      class="flex-1 overflow-y-auto py-4"
      :class="collapsed ? 'px-2' : 'px-3'"
    >
      <div
        v-if="!collapsed"
        class="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm dark:border-teal-900/60 dark:bg-teal-950/30"
      >
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
        <p
          v-if="!collapsed"
          class="mb-2 px-2 text-xs font-semibold uppercase text-slate-400"
        >
          {{ section.title }}
        </p>
        <div class="grid gap-1">
          <UTooltip
            v-for="link in section.links"
            :key="link.to"
            :text="link.label"
            :content="{ side: 'right' }"
            :disabled="!collapsed"
          >
            <NuxtLink
              :to="link.to"
              class="group flex items-center gap-3 rounded-md py-2.5 text-sm transition"
              :class="[
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive(link.to)
                  ? 'bg-slate-950 font-semibold text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
              ]"
            >
              <UIcon
                :name="link.icon"
                class="size-4 shrink-0"
                :class="isActive(link.to) ? 'text-white dark:text-slate-950' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'"
              />
              <span
                v-if="!collapsed"
                class="min-w-0 flex-1 truncate"
              >{{ link.label }}</span>
            </NuxtLink>
          </UTooltip>
        </div>
      </section>
    </div>

    <div
      class="border-t border-slate-200 dark:border-slate-800"
      :class="collapsed ? 'p-2' : 'p-4'"
    >
      <p
        v-if="!collapsed"
        class="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400"
      >
        {{ accessSignal }}
      </p>
      <UTooltip
        text="Se deconnecter"
        :content="{ side: 'right' }"
        :disabled="!collapsed"
      >
        <button
          class="btn-secondary w-full"
          :class="collapsed ? '!px-2 justify-center' : ''"
          :aria-label="collapsed ? 'Se deconnecter' : undefined"
          @click="handleLogout"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-4"
          />
          <span v-if="!collapsed">Se deconnecter</span>
        </button>
      </UTooltip>
    </div>
  </aside>
</template>
