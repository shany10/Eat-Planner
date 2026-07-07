<script setup lang="ts">
/** Small status pill. Neutral by default, or tinted for a semantic state. */
withDefaults(defineProps<{
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'error'
  icon?: string
}>(), {
  variant: 'neutral'
})
</script>

<template>
  <span
    class="ep-badge"
    :class="variant !== 'neutral' ? `ep-badge--${variant}` : ''"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      class="size-3"
    />
    <slot />
  </span>
</template>
