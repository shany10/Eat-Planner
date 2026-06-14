<script setup lang="ts">
import type { Charge } from '~/types/business'

withDefaults(defineProps<{
  items: Charge[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'Aucune charge enregistree. Ajoute tes couts fixes et variables pour affiner le prix conseille.'
})

defineEmits<{
  edit: [item: Charge]
  remove: [item: Charge]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
    <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
      <thead class="bg-slate-50 dark:bg-slate-900/60">
        <tr>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Charge
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Categorie
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Montant
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Periode
          </th>
          <th class="px-4 py-3 text-right font-medium text-slate-500">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
        <tr
          v-for="item in items"
          :key="item._id"
        >
          <td class="px-4 py-3 font-medium">
            {{ item.name }}
          </td>
          <td class="px-4 py-3">
            {{ item.category }}
          </td>
          <td class="px-4 py-3">
            {{ item.amount.toFixed(2) }} EUR
          </td>
          <td class="px-4 py-3">
            {{ item.period }}
          </td>
          <td class="px-4 py-3">
            <div class="flex justify-end gap-2">
              <button
                class="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700"
                @click="$emit('edit', item)"
              >
                Editer
              </button>
              <button
                class="rounded-lg bg-red-600 px-3 py-1.5 text-white"
                @click="$emit('remove', item)"
              >
                Supprimer
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="items.length === 0">
          <td
            colspan="5"
            class="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
          >
            {{ emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
