import type { SupplierMessage } from '~/types/business'

type SupplierMessagePayload = {
  supplier: string
  subject: string
  body: string
}

type SupplierReplyPayload = {
  subject: string
  body: string
}

export const useSupplierMessageStore = defineStore('supplier-messages', () => {
  const items = ref<SupplierMessage[]>([])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<SupplierMessage[]>('/api/suppliers/messages')
    } finally {
      pending.value = false
    }
  }

  async function send(payload: SupplierMessagePayload) {
    const message = await $fetch<SupplierMessage>('/api/suppliers/messages', {
      method: 'POST',
      body: payload
    })
    items.value = [message, ...items.value.filter(item => item._id !== message._id)]
    return message
  }

  async function reply(payload: SupplierReplyPayload) {
    const message = await $fetch<SupplierMessage>('/api/suppliers/messages/reply', {
      method: 'POST',
      body: payload
    })
    items.value = [message, ...items.value.filter(item => item._id !== message._id)]
    return message
  }

  return { items, pending, load, send, reply }
})
