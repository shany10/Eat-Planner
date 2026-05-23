<script setup lang="ts">
import type { Ingredient } from '~/types/business'

defineProps<{
  items: Ingredient[]
}>()

defineEmits<{
  edit: [item: Ingredient]
  remove: [item: Ingredient]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
    <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
      <thead class="bg-slate-50 dark:bg-slate-900/60">
        <tr>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Ingredient
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Unite
          </th>
          <th class="px-4 py-3 text-left font-medium text-slate-500">
            Prix
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
          </td>
          <td class="px-4 py-3 uppercase">
            {{ item.unit }}
          </td>
          <td class="px-4 py-3">
            {{ item.purchasePrice.toFixed(2) }} EUR
          </td>
          <td class="px-4 py-3">
            {{ typeof item.supplier === 'object' ? item.supplier?.name : '-' }}
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
            colspan="5"
            class="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
          >
            Aucun ingredient pour le moment. Cree ta premiere matiere premiere pour activer le calcul des plats.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
