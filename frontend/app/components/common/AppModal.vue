<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  eyebrow?: string
  description?: string
  size?: 'md' | 'lg'
  variant?: 'default' | 'warm'
}>(), {
  eyebrow: '',
  description: '',
  size: 'md',
  variant: 'default'
})

const emit = defineEmits<{
  close: []
}>()

const panelClass = computed(() => props.size === 'lg' ? 'max-w-3xl' : 'max-w-xl')
const isWarm = computed(() => props.variant === 'warm')
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
        class="w-full text-slate-950 dark:text-slate-100"
        :class="[
          panelClass,
          isWarm
            ? 'rounded-[2.5rem] border border-[#c0c9ba]/30 bg-white shadow-[0_30px_60px_-15px_rgba(107,52,20,0.35)] dark:border-white/10 dark:bg-[#1a1c1c]'
            : 'rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950'
        ]"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header
          class="flex items-start justify-between gap-4 px-6 py-5"
          :class="isWarm
            ? 'border-b border-[#c0c9ba]/30 dark:border-white/10'
            : 'border-b border-slate-200 px-5 py-4 dark:border-slate-800'"
        >
          <div class="min-w-0">
            <p
              v-if="eyebrow"
              :class="isWarm
                ? 'text-[10px] font-bold uppercase tracking-widest text-[#6b3414]/70 dark:text-[#ffb691]/80'
                : 'app-eyebrow'"
            >
              {{ eyebrow }}
            </p>
            <h2
              class="mt-1 font-bold"
              :class="isWarm
                ? 'text-xl text-[#1a1c1c] dark:text-white font-[\'Be_Vietnam_Pro\',sans-serif]'
                : 'text-lg font-semibold text-slate-950 dark:text-white'"
            >
              {{ title }}
            </h2>
            <p
              v-if="description"
              class="mt-1 text-sm leading-5"
              :class="isWarm
                ? 'text-[#40493e] dark:text-[#c0c9ba]'
                : 'text-slate-600 dark:text-slate-300'"
            >
              {{ description }}
            </p>
          </div>

          <button
            type="button"
            class="inline-flex size-9 shrink-0 items-center justify-center transition"
            :class="isWarm
              ? 'rounded-full border border-[#c0c9ba]/40 text-[#6b3414] hover:bg-[#f3f3f3] dark:border-white/10 dark:text-[#ffb691] dark:hover:bg-[#2f3131]'
              : 'rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4"
            />
          </button>
        </header>

        <div :class="isWarm ? 'px-6 py-6' : 'px-5 py-5'">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>
