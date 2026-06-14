<script setup lang="ts">
const { flatLinks, isActive } = useBusinessNav()
</script>

<template>
  <nav
    class="app-bottom-nav fixed inset-x-0 bottom-0 z-30 overflow-x-auto border-t border-slate-200 bg-white lg:hidden dark:border-slate-800 dark:bg-slate-950"
  >
    <div class="flex w-max min-w-full items-stretch">
      <NuxtLink
        v-for="link in flatLinks"
        :key="link.to"
        :to="link.to"
        class="flex shrink-0 flex-col items-center gap-1 px-4 py-2 text-xs transition"
        :class="isActive(link.to)
          ? 'text-teal-700 dark:text-teal-300'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
      >
        <UIcon
          :name="link.icon"
          class="size-5 shrink-0"
        />
        <span class="max-w-[5rem] truncate">{{ link.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
