<script setup lang="ts">
/**
 * Single button primitive for the whole app. Renders a <NuxtLink> when `to`
 * is provided, otherwise a <button>. Variants map to the .btn-* token classes
 * so hover / focus / disabled states stay consistent everywhere.
 */
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  to?: string
  type?: 'button' | 'submit' | 'reset'
  icon?: string
  trailingIcon?: string
  block?: boolean
  disabled?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  block: false,
  disabled: false
})
</script>

<template>
  <component
    :is="to ? resolveComponent('NuxtLink') : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled"
    :class="[
      `btn-${variant}`,
      size === 'sm' ? 'btn-sm' : '',
      block ? 'w-full' : ''
    ]"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      class="size-4 shrink-0"
    />
    <slot />
    <UIcon
      v-if="trailingIcon"
      :name="trailingIcon"
      class="size-4 shrink-0"
    />
  </component>
</template>
