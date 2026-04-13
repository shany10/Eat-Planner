<script setup lang="ts">
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import StatCard from '~/components/common/StatCard.vue'
import IngredientForm from '~/components/ingredients/IngredientForm.vue'
import IngredientTable from '~/components/ingredients/IngredientTable.vue'
import SupplierForm from '~/components/suppliers/SupplierForm.vue'
import SupplierTable from '~/components/suppliers/SupplierTable.vue'
import type { Ingredient, Supplier } from '~/types/business'
import { useIngredientStore } from '~/stores/ingredients'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'auth'
})

const ingredientStore = useIngredientStore()
const supplierStore = useSupplierStore()

const editingIngredient = ref<Ingredient | null>(null)
const editingSupplier = ref<Supplier | null>(null)
const errorMessage = ref('')
const loading = ref(true)

type PageStat = {
  title: string
  value: string | number
  hint: string
}

const ingredientCount = computed(() => ingredientStore.items.length)
const activeIngredientCount = computed(() => ingredientStore.items.filter(item => item.active).length)
const supplierCount = computed(() => supplierStore.items.length)
const activeSupplierCount = computed(() => supplierStore.items.filter(item => item.active).length)
const linkedIngredientCount = computed(() => ingredientStore.items.filter(item => Boolean(item.supplier)).length)
const ingredientCoverage = computed(() => {
  if (ingredientCount.value === 0) {
    return 0
  }

  return Math.round((linkedIngredientCount.value / ingredientCount.value) * 100)
})

const averagePurchasePrice = computed(() => {
  if (ingredientCount.value === 0) {
    return 0
  }

  return ingredientStore.items.reduce((sum, item) => sum + item.purchasePrice, 0) / ingredientCount.value
})

const supplierlessIngredients = computed(() => ingredientStore.items.filter(item => !item.supplier).length)

const stats = computed<PageStat[]>(() => [
  { title: 'Ingredients actifs', value: activeIngredientCount.value, hint: 'Base exploitable tout de suite' },
  { title: 'Fournisseurs actifs', value: activeSupplierCount.value, hint: 'Partenaires references' },
  { title: 'Ingredients relies', value: `${ingredientCoverage.value}%`, hint: 'Avec fournisseur associe' },
  { title: 'Prix achat moyen', value: formatCurrency(averagePurchasePrice.value), hint: 'Lecture rapide de la base' }
])

const setupSignal = computed(() => {
  if (ingredientCount.value === 0) {
    return 'Ajoute les premieres references pour lancer tout le reste du produit.'
  }

  if (supplierlessIngredients.value > 0) {
    return `${supplierlessIngredients.value} ingredient(s) n ont pas encore de fournisseur relie.`
  }

  return 'La base matiere est suffisamment structuree pour soutenir recettes et achats.'
})

const nextAction = computed(() => {
  if (supplierCount.value === 0) {
    return {
      label: 'Creer un fournisseur',
      to: '/ingredients#supplier-form'
    }
  }

  return {
    label: 'Ajouter un ingredient',
    to: '/ingredients#ingredient-form'
  }
})

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([ingredientStore.load(), supplierStore.load()])
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Impossible de charger les ingredients'
  } finally {
    loading.value = false
  }
}

async function saveSupplier(payload: Omit<Supplier, '_id'>) {
  try {
    if (editingSupplier.value) {
      await supplierStore.update(editingSupplier.value._id, payload)
      editingSupplier.value = null
    } else {
      await supplierStore.create(payload)
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Echec lors de l enregistrement du fournisseur'
  }
}

async function saveIngredient(payload: { name: string, unit: Ingredient['unit'], purchasePrice: number, supplier?: string | null, active?: boolean }) {
  try {
    if (editingIngredient.value) {
      await ingredientStore.update(editingIngredient.value._id, payload)
      editingIngredient.value = null
    } else {
      await ingredientStore.create(payload)
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Echec lors de l enregistrement de l ingredient'
  }
}

async function removeSupplier(item: Supplier) {
  try {
    await supplierStore.remove(item._id)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Suppression impossible'
  }
}

async function removeIngredient(item: Ingredient) {
  try {
    await ingredientStore.remove(item._id)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Suppression impossible'
  }
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#fefce8_0%,#ecfeff_45%,#f8fafc_100%)] p-8 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(135deg,#0f172a_0%,#082f49_45%,#020617_100%)]">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -left-12 top-0 h-40 w-40 rounded-full bg-amber-300/20 dark:bg-amber-500/10" />
        <div class="absolute right-0 top-12 h-48 w-48 rounded-full bg-cyan-300/20 dark:bg-cyan-500/10" />
      </div>

      <div class="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Base produits
          </p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ activeIngredientCount }} ingredient(s) actif(s)
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ activeSupplierCount }} fournisseur(s) actif(s)
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ loading ? 'Synchronisation' : 'Base a jour' }}
            </span>
          </div>

          <h1 class="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Ingredients et fournisseurs
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Ici on construit la base de couts. Plus les prix d achat et les fournisseurs sont propres, plus les recettes et les prix conseilles paraissent solides ensuite.
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <NuxtLink
              :to="nextAction.to"
              class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {{ nextAction.label }}
            </NuxtLink>
            <a
              href="#ingredient-form"
              class="rounded-full border border-slate-300 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950"
            >
              Aller au formulaire ingredient
            </a>
          </div>
        </div>

        <div class="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_25px_60px_-35px_rgba(15,23,42,0.85)] dark:border-white/10">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            A retenir
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                Ingredients
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ ingredientCount }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                References deja en base
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                Couverture
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ ingredientCoverage }}%
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                Ingredients relies aux fournisseurs
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                Achat moyen
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ formatCurrency(averagePurchasePrice) }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                Signal rapide sur la qualite prix
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-sm font-semibold text-white">
              Signal base
            </p>
            <p class="mt-2 text-sm leading-6 text-white/70">
              {{ setupSignal }}
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

      <EmptyStateCard
        v-if="supplierStore.items.length === 0 && ingredientStore.items.length === 0"
        eyebrow="Premier setup"
        title="Commence par enregistrer tes fournisseurs et tes ingredients."
        description="Le fournisseur reste optionnel, donc tu peux aussi commencer directement par l ingredient si tu veux aller vite."
        action-label="Creer un fournisseur"
        action-to="/ingredients#supplier-form"
        secondary-label="Creer un ingredient"
        secondary-to="/ingredients#ingredient-form"
      />

      <section class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
            Ordre recommande
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight">
            Une base propre en trois mouvements
          </h2>
          <div class="mt-5 grid gap-3">
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                1. Poser les fournisseurs
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Les contacts et emails rendent la base plus credible et plus facile a maintenir.
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                2. Fixer les prix d achat
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Meme une premiere estimation rend les calculs plats beaucoup plus concrets.
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                3. Relier les ingredients
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                L association fournisseur + ingredient donne un rendu plus professionnel a toute la chaine de pilotage.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
            Qualite de base
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight">
            Ce que ton equipe doit comprendre tout de suite
          </h2>
          <div class="mt-5 grid gap-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Ingredients sans fournisseur
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {{ supplierlessIngredients }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                References fournisseurs
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {{ supplierCount }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Lecture produit
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Une base prix propre donne ensuite des pages recettes et ventes beaucoup plus convaincantes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-2">
        <div
          id="supplier-form"
          class="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
                Formulaire
              </p>
              <h2 class="mt-3 text-xl font-semibold">
                Fournisseurs
              </h2>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {{ editingSupplier ? 'Edition en cours' : 'Nouveau fournisseur' }}
            </span>
          </div>
          <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Renseigne le minimum utile: nom, contact et email si possible. C est deja suffisant pour donner de la tenue a la base.
          </p>
          <div class="mt-5">
            <SupplierForm
              :initial-value="editingSupplier"
              :submit-label="editingSupplier ? 'Mettre a jour' : 'Ajouter le fournisseur'"
              @submit="saveSupplier"
              @cancel="editingSupplier = null"
            />
          </div>
        </div>

        <div
          id="ingredient-form"
          class="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
                Formulaire
              </p>
              <h2 class="mt-3 text-xl font-semibold">
                Ingredients
              </h2>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {{ editingIngredient ? 'Edition en cours' : 'Nouvel ingredient' }}
            </span>
          </div>
          <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Priorise le nom, l unite et un prix d achat fiable. Le lien fournisseur reste optionnel mais il professionnalise tout de suite la base.
          </p>
          <div class="mt-5">
            <IngredientForm
              :suppliers="supplierStore.items"
              :initial-value="editingIngredient"
              :submit-label="editingIngredient ? 'Mettre a jour' : 'Ajouter l ingredient'"
              @submit="saveIngredient"
              @cancel="editingIngredient = null"
            />
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
                Table
              </p>
              <h2 class="mt-3 text-xl font-semibold">
                Liste fournisseurs
              </h2>
            </div>
            <span class="text-sm text-slate-500">{{ supplierStore.items.length }} element(s)</span>
          </div>
          <SupplierTable
            :items="supplierStore.items"
            @edit="editingSupplier = $event"
            @remove="removeSupplier"
          />
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
                Table
              </p>
              <h2 class="mt-3 text-xl font-semibold">
                Liste ingredients
              </h2>
            </div>
            <span class="text-sm text-slate-500">{{ ingredientStore.items.length }} element(s)</span>
          </div>
          <IngredientTable
            :items="ingredientStore.items"
            @edit="editingIngredient = $event"
            @remove="removeIngredient"
          />
        </div>
      </section>
    </template>
  </div>
</template>
