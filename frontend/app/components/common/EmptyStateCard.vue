<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  secondaryLabel?: string
  secondaryTo?: string
}>(), {
  eyebrow: ''
})
</script>

<template>
  <section class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
    <p
      v-if="eyebrow"
      class="app-eyebrow"
    >
      {{ eyebrow }}
    </p>
    <h3 class="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
      {{ title }}
    </h3>
    <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ description }}
    </p>

    <div
      v-if="actionTo || secondaryTo"
      class="mt-5 flex flex-wrap gap-3"
    >
      <NuxtLink
        v-if="actionTo && actionLabel"
        :to="actionTo"
        class="btn-primary"
      >
        {{ actionLabel }}
      </NuxtLink>

      <NuxtLink
        v-if="secondaryTo && secondaryLabel"
        :to="secondaryTo"
        class="btn-secondary"
      >
        {{ secondaryLabel }}
      </NuxtLink>
    </div>
  </section>
</template>
