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

  return { forecast, pending, load }
})
