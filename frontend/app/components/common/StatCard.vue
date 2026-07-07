<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <article class="app-card">
    <p class="app-eyebrow">
      {{ title }}
    </p>
    <p class="my-1 text-2xl font-bold text-[color:var(--ep-text)]">
      {{ value }}
    </p>
    <p
      v-if="hint"
      class="text-xs leading-5 text-[color:var(--ep-text-muted)]"
    >
      {{ hint }}
    </p>
  </article>
</template>
