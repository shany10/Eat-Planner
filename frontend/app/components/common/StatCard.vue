<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <article class="app-card">
    <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
      {{ title }}
    </p>
    <p class="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
      {{ value }}
    </p>
    <p
      v-if="hint"
      class="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300"
    >
      {{ hint }}
    </p>
  </article>
</template>
