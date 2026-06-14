<script setup lang="ts">
import type { Sale } from '~/types/business'

withDefaults(defineProps<{
  items: Sale[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'Aucune vente enregistree. Cree ton premier ticket pour commencer a alimenter les previsions.'
})

defineEmits<{
  remove: [item: Sale]
}>()
</script>

<template>
  <div
    v-if="items.length === 0"
    class="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
  >
    {{ emptyMessage }}
  </div>

  <div
    v-else
    class="space-y-4"
  >
    <article
      v-for="sale in items"
      :key="sale._id"
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
            {{ sale.serviceDate.slice(0, 10) }}
          </p>
          <h3 class="mt-1 text-lg font-semibold">
            {{ sale.totalAmount.toFixed(2) }} EUR
          </h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {{ sale.notes || 'Aucune note de service.' }}
          </p>
        </div>

        <button
          class="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white"
          @click="$emit('remove', sale)"
        >
          Supprimer
        </button>
      </div>

      <div class="mt-4 grid gap-2">
        <div
          v-for="(item, index) in sale.items"
          :key="`${sale._id}-${index}`"
          class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950"
        >
          <span>{{ typeof item.dish === 'object' ? item.dish.name : item.dish }}</span>
          <span>{{ item.quantity }} x {{ item.unitPrice.toFixed(2) }} EUR</span>
        </div>
      </div>
    </article>
  </div>
</template>
