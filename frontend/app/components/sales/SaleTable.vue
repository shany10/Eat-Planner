<script setup lang="ts">
import type { Sale } from '~/types/business'
import DataTable, { type DataTableColumn } from '~/components/common/DataTable.vue'
import TableRowActions from '~/components/common/TableRowActions.vue'

withDefaults(defineProps<{
  items: Sale[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'Aucune vente enregistrée. Crée ton premier ticket pour commencer à alimenter les prévisions.'
})

defineEmits<{
  remove: [item: Sale]
}>()

const columns: DataTableColumn[] = [
  { key: 'date', label: 'Date service' },
  { key: 'amount', label: 'Montant', align: 'right' },
  { key: 'lines', label: 'Articles', align: 'right' },
  { key: 'notes', label: 'Note' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

function dishName(dish: Sale['items'][number]['dish']) {
  return typeof dish === 'object' ? dish.name : dish
}
</script>

<template>
  <DataTable
    :columns="columns"
    :rows="items"
    expandable
    empty-title="Aucune vente"
    :empty-message="emptyMessage"
    empty-icon="i-lucide-receipt-euro"
  >
    <template #cell-date="{ row }">
      <span class="ep-cell-strong">{{ row.serviceDate.slice(0, 10) }}</span>
    </template>

    <template #cell-amount="{ row }">
      <span class="ep-cell-strong">{{ row.totalAmount.toFixed(2) }} €</span>
    </template>

    <template #cell-lines="{ row }">
      {{ row.items.length }}
    </template>

    <template #cell-notes="{ row }">
      <span class="text-[color:var(--ep-text-muted)]">{{ row.notes || '—' }}</span>
    </template>

    <template #cell-actions="{ row }">
      <TableRowActions
        :show-edit="false"
        @remove="$emit('remove', row)"
      />
    </template>

    <template #expanded="{ row }">
      <div class="py-2">
        <p class="app-eyebrow mb-2">
          Détail du ticket
        </p>
        <div class="grid gap-1.5">
          <div
            v-for="(item, index) in row.items"
            :key="`${row._id}-${index}`"
            class="flex items-center justify-between gap-3 rounded-md bg-[color:var(--ep-surface)] px-3 py-2 text-sm"
          >
            <span>{{ dishName(item.dish) }}</span>
            <span class="text-[color:var(--ep-text-muted)] ep-num">
              {{ item.quantity }} × {{ item.unitPrice.toFixed(2) }} €
            </span>
          </div>
        </div>
      </div>
    </template>
  </DataTable>
</template>
