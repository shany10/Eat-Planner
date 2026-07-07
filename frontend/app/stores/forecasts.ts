import type { ForecastResponse } from '~/types/business'

function buildEmptyForecast(date?: string): ForecastResponse {
  return {
    persisted: false,
    targetDate: date ?? new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    dishes: [],
    ingredientNeeds: [],
    totals: {
      totalProjectedRevenue: 0,
      totalProjectedPlates: 0,
      chargePerServing: 0
    },
    alerts: []
  }
}

export const useForecastStore = defineStore('forecasts', () => {
  const forecast = ref<ForecastResponse | null>(null)
  const pending = ref(false)

  async function load(date?: string) {
    pending.value = true
    try {
      const query = date ? `?date=${encodeURIComponent(date)}` : ''
      forecast.value = await $fetch<ForecastResponse>(`/api/forecasts/daily${query}`)
    } catch (error) {
      forecast.value = buildEmptyForecast(date)
      throw error
    } finally {
      pending.value = false
    }
  }

  async function save(date?: string) {
    pending.value = true
    try {
      forecast.value = await $fetch<ForecastResponse>('/api/forecasts/daily', {
        method: 'POST',
        body: { date }
      })
      return forecast.value
    } finally {
      pending.value = false
    }
  }

  async function correct(forecastId: string, dishId: string, correctionQuantity: number, correctionComment = '') {
    pending.value = true
    try {
      forecast.value = await $fetch<ForecastResponse>(`/api/forecasts/${forecastId}/recommendations/${dishId}/correction`, {
        method: 'PATCH',
        body: {
          correctionQuantity,
          correctionComment
        }
      })
      return forecast.value
    } finally {
      pending.value = false
    }
  }

  return { forecast, pending, load, save, correct }
})
