<script setup lang="ts">
import type { Charge } from '~/types/business'
import DataTable, { type DataTableColumn } from '~/components/common/DataTable.vue'
import TableRowActions from '~/components/common/TableRowActions.vue'

withDefaults(defineProps<{
  items: Charge[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'Aucune charge enregistrée. Ajoute tes coûts fixes et variables pour affiner le prix conseillé.'
})

defineEmits<{
  edit: [item: Charge]
  remove: [item: Charge]
}>()

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Charge' },
  { key: 'category', label: 'Catégorie' },
  { key: 'amount', label: 'Montant', align: 'right' },
  { key: 'period', label: 'Période' },
  { key: 'actions', label: 'Actions', align: 'right' }
]
</script>

<template>
  <DataTable
    :columns="columns"
    :rows="items"
    empty-title="Aucune charge"
    :empty-message="emptyMessage"
    empty-icon="i-lucide-receipt"
  >
    <template #cell-name="{ row }">
      <span class="ep-cell-strong">{{ row.name }}</span>
    </template>

    <template #cell-category="{ row }">
      <span class="text-[color:var(--ep-text-muted)]">{{ row.category }}</span>
    </template>

    <template #cell-amount="{ row }">
      {{ row.amount.toFixed(2) }} €
    </template>

    <template #cell-period="{ row }">
      <span class="text-[color:var(--ep-text-muted)]">{{ row.period }}</span>
    </template>

    <template #cell-actions="{ row }">
      <TableRowActions
        @edit="$emit('edit', row)"
        @remove="$emit('remove', row)"
      />
    </template>
  </DataTable>
</template>
