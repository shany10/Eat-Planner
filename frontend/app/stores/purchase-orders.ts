import type { Ingredient, PaymentMethod, PurchaseOrder, PurchaseOrderStatus, PurchaseRewards } from '~/types/business'

type PurchaseOrderPayload = {
  supplier: string
  deliveryAddress?: string
  internalComment?: string
  requestedDeliveryDate?: string
  estimatedDeliveryDate?: string
  notes?: string
  status?: PurchaseOrderStatus
  vatRate?: number
  items: Array<{
    ingredient: string
    quantity: number
    unit: Ingredient['unit']
    unitPrice: number
    recommendedQuantity?: number
  }>
}

type SupplierEmailResult = {
  ok: boolean
  sent: Array<{
    supplierName: string
    to: string
    itemCount: number
  }>
  order: PurchaseOrder
}

export const usePurchaseOrderStore = defineStore('purchase-orders', () => {
  const items = ref<PurchaseOrder[]>([])
  const rewards = ref<PurchaseRewards | null>(null)
  const lastOrder = ref<PurchaseOrder | null>(null)
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<PurchaseOrder[]>('/api/purchase-orders')
    } finally {
      pending.value = false
    }
  }

  async function create(payload: PurchaseOrderPayload) {
    lastOrder.value = await $fetch<PurchaseOrder>('/api/purchase-orders', { method: 'POST', body: payload })
    await load()
    await loadRewards()
    return lastOrder.value
  }

  async function update(id: string, payload: Partial<PurchaseOrderPayload>) {
    await $fetch(`/api/purchase-orders/${id}`, { method: 'PATCH', body: payload })
    await load()
    await loadRewards()
  }

  async function updateStatus(id: string, status: PurchaseOrderStatus) {
    await $fetch(`/api/purchase-orders/${id}/status`, { method: 'PATCH', body: { status } })
    await load()
    await loadRewards()
  }

  async function pay(id: string, payload: {
    method: PaymentMethod
    holderName?: string
    cardNumber?: string
    expirationDate?: string
    cvv?: string
    billingAddress?: string
  }) {
    lastOrder.value = await $fetch<PurchaseOrder>(`/api/purchase-orders/${id}/payments/fake`, {
      method: 'POST',
      body: payload
    })
    await load()
    await loadRewards()
    return lastOrder.value
  }

  async function sendSupplierEmail(id: string) {
    const result = await $fetch<SupplierEmailResult>(`/api/purchase-orders/${id}/send-supplier-email`, {
      method: 'POST'
    })
    lastOrder.value = result.order
    await load()
    return result
  }

  async function remove(id: string) {
    await $fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
    await load()
    await loadRewards()
  }

  async function loadRewards() {
    rewards.value = await $fetch<PurchaseRewards>('/api/purchase-orders/rewards')
  }

  const openOrders = computed(() => items.value.filter(order => !['delivered', 'received', 'cancelled'].includes(order.status)))
  const draftOrders = computed(() => items.value.filter(order => order.status === 'draft'))
  const sentOrders = computed(() => items.value.filter(order => ['pending_payment', 'paid', 'delivering', 'sent'].includes(order.status)))
  const paidOrders = computed(() => items.value.filter(order => order.status === 'paid'))
  const openAmount = computed(() => openOrders.value.reduce((sum, order) => sum + (order.totalInclTax || order.totalAmount), 0))

  return {
    items,
    rewards,
    lastOrder,
    pending,
    load,
    create,
    update,
    updateStatus,
    pay,
    sendSupplierEmail,
    remove,
    loadRewards,
    openOrders,
    draftOrders,
    sentOrders,
    paidOrders,
    openAmount
  }
})
