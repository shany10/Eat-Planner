import type { DishIngredientLine } from '~/types/business'

export type DishPayload = {
  name: string
  category: string
  description?: string
  targetMarginRate: number | null
  actualPriceIncludingTax: number
  estimatedDailyServings: number
  active?: boolean
  ingredients: DishIngredientLine[]
}

export type PageStat = {
  title: string
  value: string | number
  hint: string
}
