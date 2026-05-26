import type { Charge } from '~/types/business'

type ChargePayload = Omit<Charge, '_id'>

export const useChargeStore = defineStore('charges', () => {
  const items = ref<Charge[]>([])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<Charge[]>('/api/charges')
    } finally {
      pending.value = false
    }
  }

  async function create(payload: ChargePayload) {
    await $fetch('/api/charges', { method: 'POST', body: payload })
    await load()
  }

  async function update(id: string, payload: Partial<ChargePayload>) {
    await $fetch(`/api/charges/${id}`, { method: 'PATCH', body: payload })
    await load()
  }

  async function remove(id: string) {
    await $fetch(`/api/charges/${id}`, { method: 'DELETE' })
    await load()
  }

  const dailyChargeEstimate = computed(() =>
    items.value.reduce((sum, charge) => sum + (charge.period === 'daily' ? charge.amount : charge.amount / 30), 0)
  )

  return { items, pending, load, create, update, remove, dailyChargeEstimate }
})
