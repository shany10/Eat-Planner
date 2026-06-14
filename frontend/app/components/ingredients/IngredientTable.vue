<script setup lang="ts">
import type { Ingredient } from '~/types/business'

withDefaults(defineProps<{
  items: Ingredient[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'Aucun ingredient pour le moment. Cree ta premiere matiere premiere pour activer le calcul des plats.'
})

defineEmits<{
  edit: [item: Ingredient]
  remove: [item: Ingredient]
}>()

function getSupplierName(item: Ingredient) {
  return typeof item.supplier === 'object' ? item.supplier?.name ?? '-' : '-'
}

function getRecommendedQuantity(item: Ingredient) {
  const need = (item.averageDailyUsage || 0) * 7 + (item.minimumStock || 0) - (item.stockQuantity || 0)
  if (need <= 0) {
    return 0
  }

  return Math.max(Math.ceil(need), item.minimumOrderQuantity || 0)
}

function formatQuantity(value: number, unit: Ingredient['unit']) {
  return `${Number(value || 0).toFixed(value % 1 === 0 ? 0 : 1)} ${unit}`
}
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
    <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
      <thead class="bg-slate-50 dark:bg-slate-900/60">
        <tr>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Ingredient
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Categorie
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Prix
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Stock
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Seuil
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Reco 7j
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Fournisseur
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
            <span class="block text-xs font-normal text-slate-500 dark:text-slate-400">
              Achat en {{ item.orderUnit || item.unit }}
            </span>
          </td>
          <td class="px-4 py-3 text-slate-700 dark:text-slate-200">
            {{ item.category }}
          </td>
          <td class="px-4 py-3">
            {{ item.purchasePrice.toFixed(2) }} EUR / {{ item.unit }}
          </td>
          <td
            class="px-4 py-3 font-medium"
            :class="item.stockQuantity <= item.minimumStock ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'"
          >
            {{ formatQuantity(item.stockQuantity, item.unit) }}
          </td>
          <td class="px-4 py-3 text-slate-700 dark:text-slate-200">
            {{ formatQuantity(item.minimumStock, item.unit) }}
          </td>
          <td class="px-4 py-3 font-semibold text-slate-900 dark:text-white">
            {{ formatQuantity(getRecommendedQuantity(item), item.unit) }}
          </td>
          <td class="px-4 py-3">
            {{ getSupplierName(item) }}
          </td>
          <td class="px-4 py-3">
            <div class="flex justify-end gap-2">
              <button
                class="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-700"
                @click="$emit('edit', item)"
              >
                <UIcon
                  name="i-lucide-pencil"
                  class="size-3.5"
                />
                Editer
              </button>
              <button
                class="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                @click="$emit('remove', item)"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="size-3.5"
                />
                Supprimer
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="items.length === 0">
          <td
            colspan="8"
            class="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
          >
            {{ emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
