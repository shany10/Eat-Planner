<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  eyebrow?: string
  description?: string
  size?: 'md' | 'lg'
}>(), {
  eyebrow: '',
  description: '',
  size: 'md'
})

const emit = defineEmits<{
  close: []
}>()

const panelClass = computed(() => props.size === 'lg' ? 'max-w-3xl' : 'max-w-xl')
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      tabindex="-1"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <section
        class="w-full rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        :class="panelClass"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div class="min-w-0">
            <p
              v-if="eyebrow"
              class="app-eyebrow"
            >
              {{ eyebrow }}
            </p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
              {{ title }}
            </h2>
            <p
              v-if="description"
              class="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              {{ description }}
            </p>
          </div>

          <button
            type="button"
            class="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4"
            />
          </button>
        </header>

        <div class="px-5 py-5">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>
