import type { PricingAlertsReport } from '~/types/business'

export const usePricingAlertStore = defineStore('pricing-alerts', () => {
  const report = ref<PricingAlertsReport | null>(null)
  const pending = ref(false)

  const alerts = computed(() => report.value?.alerts ?? [])
  const criticalCount = computed(() => report.value?.counts.critical ?? 0)
  const warningCount = computed(() => report.value?.counts.warning ?? 0)

  async function load() {
    pending.value = true
    try {
      report.value = await $fetch<PricingAlertsReport>('/api/dishes/alerts')
    } finally {
      pending.value = false
    }
  }

  return { report, alerts, criticalCount, warningCount, pending, load }
})
