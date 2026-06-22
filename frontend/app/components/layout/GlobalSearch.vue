<script setup lang="ts">
import type { SearchEntry } from '~/composables/useGlobalSearch'

const { search, refresh } = useGlobalSearch()

const query = ref('')
const open = ref(false)

const groups = computed(() => search(query.value))
const flatResults = computed(() => groups.value.flatMap(group => group.items))
const showPanel = computed(() => open.value && query.value.trim().length > 0)

async function goTo(entry: SearchEntry) {
  open.value = false
  query.value = ''
  await navigateTo(entry.to)
}

function onEnter() {
  const first = flatResults.value[0]
  if (first) {
    goTo(first)
  }
}

function close() {
  open.value = false
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="relative">
    <UIcon
      name="i-lucide-search"
      class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#40493e]/60 dark:text-[#c0c9ba]/60"
    />
    <input
      v-model="query"
      type="search"
      placeholder="Rechercher..."
      aria-label="Rechercher"
      class="w-56 rounded-full border border-transparent bg-[#f3f3f3] py-2 pl-10 pr-4 text-sm text-[#1a1c1c] transition placeholder:text-[#40493e]/50 focus:outline-none focus:ring-2 focus:ring-[#feb236] lg:w-72 dark:bg-[#2f3131] dark:text-white dark:placeholder:text-[#c0c9ba]/50"
      @focus="open = true"
      @input="open = true"
      @keydown.enter.prevent="onEnter"
      @keydown.esc="close"
    >

    <div
      v-if="showPanel"
      class="fixed inset-0 z-40"
      @click="close"
    />

    <div
      v-if="showPanel"
      class="absolute right-0 z-50 mt-2 max-h-[28rem] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[1.5rem] border border-[#c0c9ba]/30 bg-white shadow-[0_30px_60px_-15px_rgba(107,52,20,0.35)] dark:border-white/10 dark:bg-[#1a1c1c]"
    >
      <p
        v-if="flatResults.length === 0"
        class="px-4 py-8 text-center text-sm text-[#40493e] dark:text-[#c0c9ba]"
      >
        Aucun resultat pour "{{ query }}".
      </p>

      <div
        v-for="group in groups"
        :key="group.key"
        class="border-b border-[#c0c9ba]/15 last:border-0 dark:border-white/5"
      >
        <p class="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#6b3414]/70 dark:text-[#ffb691]/80">
          {{ group.label }}
        </p>
        <button
          v-for="entry in group.items"
          :key="entry.id"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131]"
          @click="goTo(entry)"
        >
          <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8e8e8] text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
            <UIcon
              :name="entry.icon"
              class="size-4"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-bold text-[#1a1c1c] dark:text-white">{{ entry.label }}</span>
            <span class="block truncate text-xs text-[#40493e] dark:text-[#c0c9ba]">{{ entry.sublabel }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
