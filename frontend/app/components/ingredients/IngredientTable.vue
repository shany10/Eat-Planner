<script setup lang="ts">
import type { Ingredient } from '~/types/business'
import DataTable, { type DataTableColumn } from '~/components/common/DataTable.vue'
import TableRowActions from '~/components/common/TableRowActions.vue'
import AppBadge from '~/components/common/AppBadge.vue'

withDefaults(defineProps<{
  items: Ingredient[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'Aucun ingrédient pour le moment. Crée ta première matière première pour activer le calcul des plats.'
})

defineEmits<{
  edit: [item: Ingredient]
  remove: [item: Ingredient]
}>()

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Ingrédient' },
  { key: 'category', label: 'Catégorie' },
  { key: 'price', label: 'Prix', align: 'right' },
  { key: 'stock', label: 'Stock', align: 'right' },
  { key: 'threshold', label: 'Seuil', align: 'right' },
  { key: 'reco', label: 'Reco 7j', align: 'right' },
  { key: 'supplier', label: 'Fournisseur' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

function getSupplierName(item: Ingredient) {
  return typeof item.supplier === 'object' ? item.supplier?.name ?? '—' : '—'
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

function isLowStock(item: Ingredient) {
  return item.stockQuantity <= item.minimumStock
}
</script>

<template>
  <DataTable
    :columns="columns"
    :rows="items"
    empty-title="Aucun ingrédient"
    :empty-message="emptyMessage"
    empty-icon="i-lucide-carrot"
  >
    <template #cell-name="{ row }">
      <span class="ep-cell-strong">{{ row.name }}</span>
      <span class="ep-cell-sub">Achat en {{ row.orderUnit || row.unit }}</span>
    </template>

    <template #cell-category="{ row }">
      <span class="text-[color:var(--ep-text-muted)]">{{ row.category }}</span>
    </template>

    <template #cell-price="{ row }">
      {{ row.purchasePrice.toFixed(2) }} € / {{ row.unit }}
    </template>

    <template #cell-stock="{ row }">
      <span
        v-if="isLowStock(row)"
        class="inline-flex items-center gap-1.5"
      >
        {{ formatQuantity(row.stockQuantity, row.unit) }}
        <AppBadge variant="warning">Bas</AppBadge>
      </span>
      <span v-else>{{ formatQuantity(row.stockQuantity, row.unit) }}</span>
    </template>

    <template #cell-threshold="{ row }">
      {{ formatQuantity(row.minimumStock, row.unit) }}
    </template>

    <template #cell-reco="{ row }">
      <span class="ep-cell-strong">{{ formatQuantity(getRecommendedQuantity(row), row.unit) }}</span>
    </template>

    <template #cell-supplier="{ row }">
      {{ getSupplierName(row) }}
    </template>

    <template #cell-actions="{ row }">
      <TableRowActions
        @edit="$emit('edit', row)"
        @remove="$emit('remove', row)"
      />
    </template>
  </DataTable>
</template>
