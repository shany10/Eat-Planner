import type { Sale } from '~/types/business'

type SalePayload = {
  serviceDate: string
  notes?: string
  items: Array<{
    dish: string
    quantity: number
    unitPrice?: number
  }>
}

export const useSaleStore = defineStore('sales', () => {
  const items = ref<Sale[]>([])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<Sale[]>('/api/sales')
    } finally {
      pending.value = false
    }
  }

  async function create(payload: SalePayload) {
    await $fetch('/api/sales', { method: 'POST', body: payload })
    await load()
  }

  async function remove(id: string) {
    await $fetch(`/api/sales/${id}`, { method: 'DELETE' })
    await load()
  }

  const recentRevenue = computed(() => items.value.slice(0, 7).reduce((sum, sale) => sum + sale.totalAmount, 0))

  return { items, pending, load, create, remove, recentRevenue }
})
