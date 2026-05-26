import type { Dish, DishIngredientLine } from '~/types/business'

type DishPayload = {
  name: string
  category: string
  description?: string
  targetMarginRate: number | null
  actualPriceIncludingTax: number
  estimatedDailyServings: number
  active?: boolean
  ingredients: DishIngredientLine[]
}

export const useDishStore = defineStore('dishes', () => {
  const items = ref<Dish[]>([])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      items.value = await $fetch<Dish[]>('/api/dishes')
    } finally {
      pending.value = false
    }
  }

  async function create(payload: DishPayload) {
    await $fetch('/api/dishes', { method: 'POST', body: payload })
    await load()
  }

  async function update(id: string, payload: Partial<DishPayload>) {
    await $fetch(`/api/dishes/${id}`, { method: 'PATCH', body: payload })
    await load()
  }

  async function remove(id: string) {
    await $fetch(`/api/dishes/${id}`, { method: 'DELETE' })
    await load()
  }

  return { items, pending, load, create, update, remove }
})
