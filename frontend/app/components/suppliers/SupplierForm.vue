<script setup lang="ts">
import type { Supplier } from '~/types/business'

const props = withDefaults(defineProps<{
  initialValue?: Partial<Supplier> | null
  submitLabel?: string
}>(), {
  initialValue: null,
  submitLabel: 'Enregistrer le fournisseur'
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
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Nom du fournisseur"
        required
      >
      <input
        v-model="form.contactName"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Contact"
      >
      <input
        v-model="form.email"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Email"
        type="email"
      >
      <input
        v-model="form.phone"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Telephone"
      >
    </div>

    <textarea
      v-model="form.notes"
      class="min-h-24 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
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
          v-if="initialValue"
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          @click="$emit('cancel')"
        >
          Annuler
        </button>
        <button
          class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>
