<script setup lang="ts">
/**
 * Single button primitive for the whole app. Renders a <NuxtLink> when `to`
 * is provided, otherwise a <button>. Variants map to the .btn-* token classes
 * so hover / focus / disabled states stay consistent everywhere.
 */
const props = withDefaults(defineProps<{
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

const buttonClasses = computed(() => [
  `btn-${props.variant}`,
  props.size === 'sm' ? 'btn-sm' : '',
  props.block ? 'w-full' : '',
  props.disabled ? 'pointer-events-none opacity-60' : ''
])
</script>

<template>
  <NuxtLink
    v-if="props.to"
    :to="props.to"
    :aria-disabled="props.disabled ? 'true' : undefined"
    :tabindex="props.disabled ? -1 : undefined"
    :class="buttonClasses"
  >
    <UIcon
      v-if="props.icon"
      :name="props.icon"
      class="size-4 shrink-0"
    />
    <slot />
    <UIcon
      v-if="props.trailingIcon"
      :name="props.trailingIcon"
      class="size-4 shrink-0"
    />
  </NuxtLink>

  <button
    v-else
    :type="props.type"
    :disabled="props.disabled"
    :class="buttonClasses"
  >
    <UIcon
      v-if="props.icon"
      :name="props.icon"
      class="size-4 shrink-0"
    />
    <slot />
    <UIcon
      v-if="props.trailingIcon"
      :name="props.trailingIcon"
      class="size-4 shrink-0"
    />
  </button>
</template>
