<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
    <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
      {{ title }}
    </p>
    <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
      {{ value }}
    </p>
    <p
      v-if="hint"
      class="mt-2 text-sm text-slate-600 dark:text-slate-300"
    >
      {{ hint }}
    </p>
  </article>
</template>
