<script setup lang="ts">
import type { Supplier } from '~/types/business'

const props = withDefaults(defineProps<{
  initialValue?: Partial<Supplier> | null
  submitLabel?: string
  showCancel?: boolean
}>(), {
  initialValue: null,
  submitLabel: 'Enregistrer le fournisseur',
  showCancel: false
})

const emit = defineEmits<{
  submit: [payload: Omit<Supplier, '_id'>]
  cancel: []
}>()

const form = reactive({
  name: '',
  contactName: '',
  email: '',
  phone: '',
  notes: '',
  active: true
})

watchEffect(() => {
  form.name = props.initialValue?.name ?? ''
  form.contactName = props.initialValue?.contactName ?? ''
  form.email = props.initialValue?.email ?? ''
  form.phone = props.initialValue?.phone ?? ''
  form.notes = props.initialValue?.notes ?? ''
  form.active = props.initialValue?.active ?? true
})

function submit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form
    class="grid gap-3"
    @submit.prevent="submit"
  >
    <div class="grid gap-3 md:grid-cols-2">
      <input
        v-model="form.name"
        class="app-input"
        placeholder="Nom du fournisseur"
        required
      >
      <input
        v-model="form.contactName"
        class="app-input"
        placeholder="Contact"
      >
      <input
        v-model="form.email"
        class="app-input"
        placeholder="Email"
        type="email"
      >
      <input
        v-model="form.phone"
        class="app-input"
        placeholder="Telephone"
      >
    </div>

    <textarea
      v-model="form.notes"
      class="app-input min-h-24"
      placeholder="Notes"
    />

    <div class="flex items-center justify-between">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          v-model="form.active"
          type="checkbox"
        >
        Fournisseur actif
      </label>

      <div class="flex gap-2">
        <button
          v-if="showCancel || initialValue"
          type="button"
          class="btn-secondary"
          @click="$emit('cancel')"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4"
          />
          Annuler
        </button>
        <button
          type="submit"
          class="btn-primary"
        >
          <UIcon
            name="i-lucide-save"
            class="size-4"
          />
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>
