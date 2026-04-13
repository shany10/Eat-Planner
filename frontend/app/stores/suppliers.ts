import type { Supplier } from '~/types/business'

type SupplierPayload = Omit<Supplier, '_id'>

export const useSupplierStore = defineStore('suppliers', () => {
  const items = ref<Supplier[]>([])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<Supplier[]>('/api/suppliers')
    } finally {
      pending.value = false
    }
  }

  async function create(payload: SupplierPayload) {
    await $fetch('/api/suppliers', { method: 'POST', body: payload })
    await load()
  }

  async function update(id: string, payload: Partial<SupplierPayload>) {
    await $fetch(`/api/suppliers/${id}`, { method: 'PATCH', body: payload })
    await load()
  }

  async function remove(id: string) {
    await $fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    await load()
  }

  return { items, pending, load, create, update, remove }
})
