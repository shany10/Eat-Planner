<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <article class="app-card">
    <p class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
      {{ title }}
    </p>
    <p class="my-1 text-3xl font-black text-[#1a1c1c] dark:text-white">
      {{ value }}
    </p>
    <p
      v-if="hint"
      class="text-xs leading-5 text-[#40493e] dark:text-[#c0c9ba]"
    >
      {{ hint }}
    </p>
  </article>
</template>
