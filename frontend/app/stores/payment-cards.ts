import type { PaymentCard } from '~/types/business'

type SavePaymentCardPayload = {
  holder: string
  cardNumber: string
  expiryMonth: number
  expiryYear: number
  label?: string
}

export const usePaymentCardStore = defineStore('payment-cards', () => {
  const items = ref<PaymentCard[]>([])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<PaymentCard[]>('/api/payment-cards')
    } finally {
      pending.value = false
    }
  }

  async function save(payload: SavePaymentCardPayload) {
    const card = await $fetch<PaymentCard>('/api/payment-cards', { method: 'POST', body: payload })
    await load()
    return card
  }

  async function remove(id: string) {
    await $fetch(`/api/payment-cards/${id}`, { method: 'DELETE' })
    await load()
  }

  return { items, pending, load, save, remove }
})
