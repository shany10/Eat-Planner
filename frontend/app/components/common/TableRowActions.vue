<script setup lang="ts">
/**
 * Consistent Edit / Delete action pair for table rows. Icon-only on small
 * screens, icon + label from `sm`. Keeps every table's row actions identical.
 */
withDefaults(defineProps<{
  showEdit?: boolean
  showRemove?: boolean
  editLabel?: string
  removeLabel?: string
}>(), {
  showEdit: true,
  showRemove: true,
  editLabel: 'Éditer',
  removeLabel: 'Supprimer'
})

defineEmits<{
  edit: []
  remove: []
}>()
</script>

<template>
  <div class="flex justify-end gap-2">
    <button
      v-if="showEdit"
      type="button"
      class="btn-secondary btn-sm"
      :aria-label="editLabel"
      @click="$emit('edit')"
    >
      <UIcon
        name="i-lucide-pencil"
        class="size-3.5"
      />
      <span class="hidden sm:inline">{{ editLabel }}</span>
    </button>
    <button
      v-if="showRemove"
      type="button"
      class="btn-danger btn-sm"
      :aria-label="removeLabel"
      @click="$emit('remove')"
    >
      <UIcon
        name="i-lucide-trash-2"
        class="size-3.5"
      />
      <span class="hidden sm:inline">{{ removeLabel }}</span>
    </button>
  </div>
</template>
