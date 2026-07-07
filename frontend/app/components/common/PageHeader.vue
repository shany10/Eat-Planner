<script setup lang="ts">
/**
 * Standard page header: small eyebrow, title, one-line subtitle, and an
 * optional actions slot (aligned right on desktop). Keeps every page opening
 * on the same rhythm instead of hand-rolled markup.
 */
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  subtitle?: string
}>(), {
  eyebrow: '',
  subtitle: ''
})
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <p
        v-if="eyebrow"
        class="app-eyebrow"
      >
        {{ eyebrow }}
      </p>
      <h1 class="app-title mt-1">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="app-subtitle mt-1.5"
      >
        {{ subtitle }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center gap-2.5"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
