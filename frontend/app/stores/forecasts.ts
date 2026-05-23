import type { ForecastResponse } from '~/types/business'

export const useForecastStore = defineStore('forecasts', () => {
  const forecast = ref<ForecastResponse | null>(null)
  const pending = ref(false)

  async function load(date?: string) {
    pending.value = true
    try {
      const query = date ? `?date=${encodeURIComponent(date)}` : ''
      forecast.value = await $fetch<ForecastResponse>(`/api/forecasts/daily${query}`)
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
