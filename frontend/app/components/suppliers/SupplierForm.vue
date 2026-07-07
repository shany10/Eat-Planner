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
  productTypes: '',
  deliveryLeadTimeDays: 2,
  deliveryFee: 0,
  minimumOrderAmount: 0,
  contactName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  active: true
})

watchEffect(() => {
  form.name = props.initialValue?.name ?? ''
  form.productTypes = props.initialValue?.productTypes?.join(', ') ?? ''
  form.deliveryLeadTimeDays = props.initialValue?.deliveryLeadTimeDays ?? 2
  form.deliveryFee = props.initialValue?.deliveryFee ?? 0
  form.minimumOrderAmount = props.initialValue?.minimumOrderAmount ?? 0
  form.contactName = props.initialValue?.contactName ?? ''
  form.email = props.initialValue?.email ?? ''
  form.phone = props.initialValue?.phone ?? ''
  form.address = props.initialValue?.address ?? ''
  form.notes = props.initialValue?.notes ?? ''
  form.active = props.initialValue?.active ?? true
})

function submit() {
  emit('submit', {
    name: form.name,
    productTypes: form.productTypes.split(',').map(type => type.trim()).filter(Boolean),
    deliveryLeadTimeDays: Number(form.deliveryLeadTimeDays),
    deliveryFee: Number(form.deliveryFee),
    minimumOrderAmount: Number(form.minimumOrderAmount),
    contactName: form.contactName,
    email: form.email,
    phone: form.phone,
    address: form.address,
    notes: form.notes,
    active: form.active
  })
}

const fieldClass = 'app-input'
const textareaClass = 'app-input min-h-24'
const primaryBtn = 'btn-primary'
const secondaryBtn = 'btn-secondary'
</script>

<template>
  <form
    class="grid gap-4"
    @submit.prevent="submit"
  >
    <div class="grid gap-3 md:grid-cols-2">
      <input
        v-model="form.name"
        :class="fieldClass"
        placeholder="Nom du fournisseur"
        required
      >
      <input
        v-model="form.contactName"
        :class="fieldClass"
        placeholder="Contact"
      >
      <input
        v-model="form.email"
        :class="fieldClass"
        placeholder="Email"
        type="email"
      >
      <input
        v-model="form.phone"
        :class="fieldClass"
        placeholder="Telephone"
      >
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <input
        v-model="form.productTypes"
        :class="[fieldClass, 'md:col-span-2']"
        placeholder="Types de produits (separes par virgules)"
      >
      <input
        v-model.number="form.deliveryLeadTimeDays"
        :class="fieldClass"
        placeholder="Delai livraison"
        type="number"
        min="0"
        step="1"
      >
      <input
        v-model.number="form.deliveryFee"
        :class="fieldClass"
        placeholder="Frais livraison"
        type="number"
        min="0"
        step="0.01"
      >
      <input
        v-model.number="form.minimumOrderAmount"
        :class="fieldClass"
        placeholder="Minimum commande"
        type="number"
        min="0"
        step="0.01"
      >
      <input
        v-model="form.address"
        :class="[fieldClass, 'md:col-span-3']"
        placeholder="Adresse fournisseur"
      >
    </div>

    <textarea
      v-model="form.notes"
      :class="textareaClass"
      placeholder="Notes"
    />

    <div class="flex items-center justify-between gap-4 pt-2">
      <label class="flex items-center gap-2 text-sm font-medium text-[#40493e] dark:text-[#c0c9ba]">
        <input
          v-model="form.active"
          type="checkbox"
          class="size-4 rounded accent-[#005013]"
        >
        Fournisseur actif
      </label>

      <div class="flex gap-2">
        <button
          v-if="showCancel || initialValue"
          type="button"
          :class="secondaryBtn"
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
          :class="primaryBtn"
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
