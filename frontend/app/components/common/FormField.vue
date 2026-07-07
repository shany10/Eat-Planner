<script setup lang="ts">
/**
 * Wraps a form control with a real <label> (accessibility), optional hint and
 * error message. The default slot receives the id to bind to the input.
 */
withDefaults(defineProps<{
  label: string
  hint?: string
  error?: string
  required?: boolean
}>(), {
  required: false
})

const fieldId = `field-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <div>
    <label
      :for="fieldId"
      class="app-label"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-[color:var(--ep-error)]"
        aria-hidden="true"
      >*</span>
    </label>

    <slot :id="fieldId" />

    <p
      v-if="error"
      class="app-field-error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      class="app-hint"
    >
      {{ hint }}
    </p>
  </div>
</template>
