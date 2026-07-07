<script setup lang="ts" generic="Row extends Record<string, unknown>">
/**
 * Generic data table shell. Handles the presentation only — the wrapper,
 * headers, zebra rows, hover, right-aligned numeric cells and the empty state.
 * Each column is customised through a `cell-<key>` scoped slot, so callers keep
 * full control over formatting while sharing one coherent look.
 *
 * Set `expandable` to reveal a per-row detail panel (the `expanded` scoped
 * slot). A chevron toggle column is added automatically on the left.
 */
export type DataTableColumn = {
  key: string
  label: string
  align?: 'left' | 'right'
  headerClass?: string
  cellClass?: string
}

const props = withDefaults(defineProps<{
  columns: DataTableColumn[]
  rows: Row[]
  rowKey?: string
  expandable?: boolean
  emptyTitle?: string
  emptyMessage?: string
  emptyIcon?: string
}>(), {
  rowKey: '_id',
  expandable: false,
  emptyTitle: 'Aucune donnée',
  emptyMessage: '',
  emptyIcon: 'i-lucide-inbox'
})

const expanded = ref<Set<string>>(new Set())

function rowId(row: Row, index: number) {
  const value = row[props.rowKey]
  return value === undefined || value === null ? String(index) : String(value)
}

function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expanded.value = next
}

const totalCols = computed(() => props.columns.length + (props.expandable ? 1 : 0))
</script>

<template>
  <div class="ep-table-wrap">
    <table class="ep-table">
      <thead>
        <tr>
          <th
            v-if="expandable"
            class="w-10"
          >
            <span class="sr-only">Détail</span>
          </th>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="[column.align === 'right' ? 'ep-num' : '', column.headerClass]"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td
            :colspan="totalCols"
            class="ep-table-empty"
          >
            <div class="flex flex-col items-center gap-2">
              <UIcon
                :name="emptyIcon"
                class="size-8 text-[color:var(--ep-text-subtle)]"
              />
              <p class="text-sm font-semibold text-[color:var(--ep-text)]">
                {{ emptyTitle }}
              </p>
              <p
                v-if="emptyMessage"
                class="max-w-md text-sm text-[color:var(--ep-text-muted)]"
              >
                {{ emptyMessage }}
              </p>
            </div>
          </td>
        </tr>

        <template
          v-for="(row, index) in rows"
          v-else
          :key="rowId(row, index)"
        >
          <tr class="ep-row">
            <td
              v-if="expandable"
              class="w-10"
            >
              <button
                type="button"
                class="inline-flex size-7 items-center justify-center rounded-md text-[color:var(--ep-text-muted)] transition hover:bg-[color:var(--ep-surface-muted)]"
                :aria-expanded="expanded.has(rowId(row, index))"
                :aria-label="expanded.has(rowId(row, index)) ? 'Masquer le détail' : 'Afficher le détail'"
                @click="toggle(rowId(row, index))"
              >
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 transition-transform"
                  :class="expanded.has(rowId(row, index)) ? 'rotate-90' : ''"
                />
              </button>
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
              :class="[column.align === 'right' ? 'ep-num' : '', column.cellClass]"
            >
              <slot
                :name="`cell-${column.key}`"
                :row="row"
                :value="row[column.key]"
              >
                {{ row[column.key] }}
              </slot>
            </td>
          </tr>
          <tr
            v-if="expandable && expanded.has(rowId(row, index))"
            class="ep-expanded"
          >
            <td :colspan="totalCols">
              <slot
                name="expanded"
                :row="row"
              />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
