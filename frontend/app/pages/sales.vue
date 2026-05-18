<script setup lang="ts">
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import StatCard from '~/components/common/StatCard.vue'
import SaleForm from '~/components/sales/SaleForm.vue'
import SaleTable from '~/components/sales/SaleTable.vue'
import type { Sale } from '~/types/business'
import { useDishStore } from '~/stores/dishes'
import { useSaleStore } from '~/stores/sales'

definePageMeta({
  middleware: 'auth'
})

const saleStore = useSaleStore()
const dishStore = useDishStore()
const errorMessage = ref('')
const loading = ref(true)

type PageStat = {
  title: string
  value: string | number
  hint: string
}

const ticketCount = computed(() => saleStore.items.length)
const totalRevenue = computed(() => saleStore.items.reduce((sum, sale) => sum + sale.totalAmount, 0))
const totalUnitsSold = computed(() =>
  saleStore.items.reduce((sum, sale) => sum + sale.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0)
)

const averageTicket = computed(() => {
  if (ticketCount.value === 0) {
    return 0
  }

  return totalRevenue.value / ticketCount.value
})

const latestSale = computed(() =>
  [...saleStore.items].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0] ?? null
)

const todayRevenue = computed(() => {
  const today = toDateKey(new Date())

  return saleStore.items
    .filter(sale => toDateKey(sale.serviceDate) === today)
    .reduce((sum, sale) => sum + sale.totalAmount, 0)
})

const stats = computed<PageStat[]>(() => [
  { title: 'Tickets', value: ticketCount.value, hint: 'Historique saisi' },
  { title: 'CA cumule', value: formatCurrency(totalRevenue.value), hint: 'Tous tickets confondus' },
  { title: 'Ticket moyen', value: formatCurrency(averageTicket.value), hint: 'Repere commercial rapide' },
  { title: 'Quantites vendues', value: totalUnitsSold.value, hint: 'Somme des portions saisies' }
])

const salesSignal = computed(() => {
  if (dishStore.items.length === 0) {
    return 'Ajoute des plats pour rendre la saisie commerciale possible.'
  }

  if (ticketCount.value === 0) {
    return 'Les premiers tickets vont donner de la matiere au dashboard et aux previsions.'
  }

  if (latestSale.value) {
    return `Derniere vente enregistree le ${formatDate(latestSale.value.serviceDate)}.`
  }

  return 'Le flux commercial commence a devenir lisible.'
})

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([saleStore.load(), dishStore.load()])
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Impossible de charger les ventes'
  } finally {
    loading.value = false
  }
}

async function saveSale(payload: {
  serviceDate: string
  notes?: string
  items: Array<{ dish: string, quantity: number, unitPrice?: number }>
}) {
  try {
    await saleStore.create(payload)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Echec lors de l enregistrement de la vente'
  }
}

async function removeSale(item: Sale) {
  try {
    await saleStore.remove(item._id)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Suppression impossible'
  }
}

function toDateKey(value: Date | string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#fee2e2_0%,#fffbeb_45%,#f8fafc_100%)] p-8 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(135deg,#0f172a_0%,#3f1d38_45%,#020617_100%)]">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -left-12 top-0 h-40 w-40 rounded-full bg-rose-300/20 dark:bg-rose-500/10" />
        <div class="absolute right-0 top-10 h-52 w-52 rounded-full bg-amber-300/20 dark:bg-amber-500/10" />
      </div>

      <div class="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Historique commercial
          </p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ ticketCount }} ticket(s)
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ dishStore.items.length }} plat(s) disponible(s)
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ loading ? 'Historique en chargement' : 'Flux a jour' }}
            </span>
          </div>

          <h1 class="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Saisie des ventes
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Les ventes alimentent la prevision de production. Meme une saisie simple donne deja un vrai rythme au produit et rend la partie connectee beaucoup plus credible.
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <a
              href="#sale-form"
              class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Ajouter une vente
            </a>
            <NuxtLink
              to="/dishes"
              class="rounded-full border border-slate-300 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950"
            >
              Gerer les plats
            </NuxtLink>
          </div>
        </div>

        <div class="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_25px_60px_-35px_rgba(15,23,42,0.85)] dark:border-white/10">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            Vue commerciale
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                CA cumule
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ formatCurrency(totalRevenue) }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                Tous tickets enregistres
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                CA du jour
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ formatCurrency(todayRevenue) }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                Signal rapide sur la journee
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                Ticket moyen
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ formatCurrency(averageTicket) }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                Repere commercial instantane
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-sm font-semibold text-white">
              Signal ventes
            </p>
            <p class="mt-2 text-sm leading-6 text-white/70">
              {{ salesSignal }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div>

      <section class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
            Rythme recommande
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight">
            Une saisie simple mais reguliere
          </h2>
          <div class="mt-5 grid gap-3">
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                1. Enregistrer la date
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Un historique propre commence par une date de service fiable.
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                2. Saisir les lignes utiles
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Quelques plats et quantites suffisent deja a nourrir les previsions.
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                3. Garder un rythme quotidien
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                La constance donne beaucoup plus de valeur que des tickets parfaits mais trop rares.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
            Lecture commerciale
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight">
            Les signaux a lire vite
          </h2>
          <div class="mt-5 grid gap-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Derniere vente
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {{ latestSale ? formatCurrency(latestSale.totalAmount) : 'Aucune' }}
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ latestSale ? formatDate(latestSale.serviceDate) : 'Ajoute un ticket pour lancer le flux commercial.' }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Quantites vendues
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {{ totalUnitsSold }}
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Volume total saisi sur les tickets.
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Lecture produit
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Ces donnees rendent ensuite le dashboard et la prevision beaucoup plus vivants.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmptyStateCard
        v-if="dishStore.items.length === 0"
        eyebrow="Prerequis manquant"
        title="Impossible de saisir une vente sans plat."
        description="Ajoute au moins un plat a la carte pour pouvoir enregistrer un ticket et alimenter les previsions."
        action-label="Creer un plat"
        action-to="/dishes"
        secondary-label="Completer les ingredients"
        secondary-to="/ingredients"
      />

      <section
        v-else
        id="sale-form"
        class="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              Formulaire
            </p>
            <h2 class="mt-3 text-xl font-semibold">
              Nouveau ticket
            </h2>
          </div>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            Saisie rapide
          </span>
        </div>
        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Enregistre les informations utiles sans alourdir le geste. L objectif ici est la regularite, pas un ticket parfait a chaque fois.
        </p>
        <div class="mt-5">
          <SaleForm
            :dishes="dishStore.items"
            @submit="saveSale"
          />
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              Table
            </p>
            <h2 class="mt-3 text-xl font-semibold">
              Tickets enregistres
            </h2>
          </div>
          <span class="text-sm text-slate-500">{{ saleStore.items.length }} vente(s)</span>
        </div>
        <SaleTable
          :items="saleStore.items"
          @remove="removeSale"
        />
      </section>
    </template>
  </div>
</template>
