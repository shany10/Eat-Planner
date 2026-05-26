import type { Ingredient } from '~/types/business'

type IngredientPayload = {
  name: string
  category: Ingredient['category']
  unit: Ingredient['unit']
  orderUnit?: Ingredient['unit']
  purchasePrice: number
  stockQuantity?: number
  minimumStock?: number
  averageDailyUsage?: number
  minimumOrderQuantity?: number
  supplier?: string | null
  active?: boolean
}

export const useIngredientStore = defineStore('ingredients', () => {
  const items = ref<Ingredient[]>([])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<Ingredient[]>('/api/ingredients')
    } finally {
      pending.value = false
    }
  }

  async function create(payload: IngredientPayload) {
    await $fetch('/api/ingredients', { method: 'POST', body: payload })
    await load()
  }

  async function update(id: string, payload: Partial<IngredientPayload>) {
    await $fetch(`/api/ingredients/${id}`, { method: 'PATCH', body: payload })
    await load()
  }

  async function remove(id: string) {
    await $fetch(`/api/ingredients/${id}`, { method: 'DELETE' })
    await load()
  }

  return { items, pending, load, create, update, remove }
})
