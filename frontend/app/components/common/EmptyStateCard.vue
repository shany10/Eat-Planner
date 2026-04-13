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
  <section class="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-900/60">
    <p
      v-if="eyebrow"
      class="text-xs uppercase tracking-[0.3em] text-slate-500"
    >
      {{ eyebrow }}
    </p>
    <h3 class="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
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
        class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {{ actionLabel }}
      </NuxtLink>

      <NuxtLink
        v-if="secondaryTo && secondaryLabel"
        :to="secondaryTo"
        class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {{ secondaryLabel }}
      </NuxtLink>
    </div>
  </section>
</template>
