<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import type { PricingAlert, PricingAlertSeverity, PricingAlertType } from '~/types/business'
import { useDishStore } from '~/stores/dishes'
import { usePricingAlertStore } from '~/stores/pricing-alerts'

const props = withDefaults(defineProps<{
  limit?: number
}>(), {
  limit: 0
})

const pricingAlertStore = usePricingAlertStore()
const dishStore = useDishStore()
const appToast = useAppToast()

const applyingId = ref<string | null>(null)

const visibleAlerts = computed(() =>
  props.limit > 0
    ? pricingAlertStore.alerts.slice(0, props.limit)
    : pricingAlertStore.alerts
)

const hiddenCount = computed(() => pricingAlertStore.alerts.length - visibleAlerts.value.length)

const typeLabels: Record<PricingAlertType, string> = {
  missing_price: 'Prix manquant',
  selling_at_loss: 'Vendu a perte',
  low_margin: 'Marge insuffisante',
  star_reprice: 'Best-seller a repricer',
  slow_mover: 'Faible rotation'
}

const typeIcons: Record<PricingAlertType, string> = {
  missing_price: 'i-lucide-tag',
  selling_at_loss: 'i-lucide-trending-down',
  low_margin: 'i-lucide-percent',
  star_reprice: 'i-lucide-star',
  slow_mover: 'i-lucide-moon'
}

function severityClass(severity: PricingAlertSeverity) {
  if (severity === 'critical') {
    return 'bg-[#ba1a1a]/10 text-[#ba1a1a] dark:bg-[#ff897d]/15 dark:text-[#ff897d]'
  }

  if (severity === 'warning') {
    return 'bg-[#feb236]/15 text-[#6d4700] dark:bg-[#feb236]/15 dark:text-[#ffb94e]'
  }

  return 'bg-[#005013]/10 text-[#005013] dark:bg-[#8ad986]/15 dark:text-[#8ad986]'
}

function canApplySuggestedPrice(alert: PricingAlert) {
  return alert.type !== 'slow_mover'
    && alert.suggestedPriceIncludingTax > 0
    && alert.suggestedPriceIncludingTax !== alert.actualPriceIncludingTax
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} €`
}

async function applySuggestedPrice(alert: PricingAlert) {
  applyingId.value = alert.dishId
  try {
    await dishStore.update(alert.dishId, { actualPriceIncludingTax: alert.suggestedPriceIncludingTax })
    await pricingAlertStore.load()
    appToast.success('Prix mis a jour', `${alert.dishName} passe a ${formatCurrency(alert.suggestedPriceIncludingTax)}.`)
  } catch (error) {
    appToast.error('Mise a jour impossible', getFetchErrorMessage(error, 'Le prix conseille n a pas pu etre applique'))
  } finally {
    applyingId.value = null
  }
}

onMounted(() => {
  if (!pricingAlertStore.report && !pricingAlertStore.pending) {
    void pricingAlertStore.load()
  }
})
</script>

<template>
  <article class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
          Rentabilite
        </p>
        <h2 class="mt-1 text-lg font-bold text-[#1a1c1c] dark:text-white">
          Alertes prix & marges
        </h2>
      </div>
      <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
        {{ pricingAlertStore.alerts.length }} alerte(s)
      </span>
    </div>

    <div
      v-if="pricingAlertStore.pending && !pricingAlertStore.report"
      class="mt-4 grid gap-2"
    >
      <div
        v-for="index in 2"
        :key="index"
        class="h-16 animate-pulse rounded-xl bg-[#e8e8e8] dark:bg-[#2f3131]"
      />
    </div>

    <div
      v-else-if="pricingAlertStore.alerts.length === 0"
      class="mt-4 rounded-xl border border-[#005013]/20 bg-[#005013]/5 px-4 py-3 text-sm font-bold text-[#005013] dark:border-[#8ad986]/20 dark:bg-[#8ad986]/10 dark:text-[#8ad986]"
    >
      Tous les plats tiennent leur objectif de marge.
    </div>

    <div
      v-else
      class="mt-4 grid gap-2"
    >
      <div
        v-for="alert in visibleAlerts"
        :key="alert.dishId"
        class="flex flex-col gap-3 rounded-xl border border-[#c0c9ba]/20 bg-[#f3f3f3] px-4 py-3 sm:flex-row sm:items-center dark:border-white/5 dark:bg-[#2f3131]"
      >
        <span
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-full"
          :class="severityClass(alert.severity)"
        >
          <UIcon
            :name="typeIcons[alert.type]"
            class="size-4"
          />
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-bold text-[#1a1c1c] dark:text-white">{{ alert.dishName }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
              :class="severityClass(alert.severity)"
            >
              {{ typeLabels[alert.type] }}
            </span>
          </div>
          <p class="mt-0.5 text-xs leading-5 text-[#40493e] dark:text-[#c0c9ba]">
            {{ alert.message }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
            <span v-if="alert.actualPriceIncludingTax > 0">{{ formatCurrency(alert.actualPriceIncludingTax) }}</span>
            <span v-if="alert.actualPriceIncludingTax > 0 && canApplySuggestedPrice(alert)"> → </span>
            <span
              v-if="canApplySuggestedPrice(alert)"
              class="font-bold text-[#1a1c1c] dark:text-white"
            >{{ formatCurrency(alert.suggestedPriceIncludingTax) }}</span>
          </p>
          <button
            v-if="canApplySuggestedPrice(alert)"
            type="button"
            class="rounded-full border border-[#707a6d] px-3 py-1 text-xs font-bold text-[#1a1c1c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#c0c9ba] dark:text-white dark:hover:bg-[#1a1c1c]"
            :disabled="applyingId === alert.dishId"
            @click="applySuggestedPrice(alert)"
          >
            {{ applyingId === alert.dishId ? 'Application…' : 'Appliquer' }}
          </button>
        </div>
      </div>

      <NuxtLink
        v-if="hiddenCount > 0"
        to="/dishes"
        class="rounded-xl border border-dashed border-[#c0c9ba] px-4 py-2 text-center text-xs font-bold text-[#40493e] transition hover:bg-[#f3f3f3] dark:border-[#40493e] dark:text-[#c0c9ba] dark:hover:bg-[#2f3131]"
      >
        Voir les {{ hiddenCount }} autre(s) alerte(s) sur la page plats
      </NuxtLink>
    </div>
  </article>
</template>
