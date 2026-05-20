<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
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
const appToast = useAppToast()

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
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les ingredients')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function saveSupplier(payload: Omit<Supplier, '_id'>) {
  try {
    if (editingSupplier.value) {
      await supplierStore.update(editingSupplier.value._id, payload)
      editingSupplier.value = null
      appToast.success('Fournisseur mis a jour', `${payload.name} a ete modifie.`)
    } else {
      await supplierStore.create(payload)
      appToast.success('Fournisseur ajoute', `${payload.name} est maintenant dans la base.`)
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Echec lors de l enregistrement du fournisseur')
    appToast.error('Enregistrement impossible', errorMessage.value)
  }
}

async function saveIngredient(payload: { name: string, unit: Ingredient['unit'], purchasePrice: number, supplier?: string | null, active?: boolean }) {
  try {
    if (editingIngredient.value) {
      await ingredientStore.update(editingIngredient.value._id, payload)
      editingIngredient.value = null
      appToast.success('Ingredient mis a jour', `${payload.name} a ete modifie.`)
    } else {
      await ingredientStore.create(payload)
      appToast.success('Ingredient ajoute', `${payload.name} est maintenant disponible.`)
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Echec lors de l enregistrement de l ingredient')
    appToast.error('Enregistrement impossible', errorMessage.value)
  }
}

async function removeSupplier(item: Supplier) {
  try {
    await supplierStore.remove(item._id)
    appToast.success('Fournisseur supprime', `${item.name} a ete retire.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Suppression impossible')
    appToast.error('Suppression impossible', errorMessage.value)
  }
}

async function removeIngredient(item: Ingredient) {
  try {
    await ingredientStore.remove(item._id)
    appToast.success('Ingredient supprime', `${item.name} a ete retire.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Suppression impossible')
    appToast.error('Suppression impossible', errorMessage.value)
  }
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Base produits
          </p>
          <h1 class="app-title mt-2">
            Ingredients et fournisseurs
          </h1>
          <p class="app-subtitle mt-2">
            Les donnees et les formulaires sont accessibles directement, sans grand bloc explicatif avant la table.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLink
            :to="nextAction.to"
            class="btn-primary"
          >
            {{ nextAction.label }}
          </NuxtLink>
          <a
            href="#ingredient-form"
            class="btn-secondary"
          >
            Ingredient
          </a>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ activeIngredientCount }} ingredient(s) actif(s)</span>
        <span class="app-pill">{{ activeSupplierCount }} fournisseur(s) actif(s)</span>
        <span class="app-pill">{{ ingredientCoverage }}% relies</span>
        <span class="app-pill">{{ loading ? 'Synchronisation' : 'Base a jour' }}</span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <template v-else>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div>

      <div class="app-section">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="app-eyebrow">
              Signal base
            </p>
            <p class="app-section-title mt-1">
              {{ setupSignal }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="app-pill">{{ supplierlessIngredients }} sans fournisseur</span>
            <span class="app-pill">{{ supplierCount }} fournisseur(s)</span>
            <span class="app-pill">{{ ingredientCount }} ingredient(s)</span>
          </div>
        </div>
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

      <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="app-section">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Table
              </p>
              <h2 class="app-section-title mt-1">
                Ingredients
              </h2>
            </div>
            <span class="app-pill">{{ ingredientStore.items.length }} ligne(s)</span>
          </div>
          <IngredientTable
            :items="ingredientStore.items"
            @edit="editingIngredient = $event"
            @remove="removeIngredient"
          />
        </div>

        <div
          id="ingredient-form"
          class="app-section scroll-mt-28"
        >
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Formulaire
              </p>
              <h2 class="app-section-title mt-1">
                {{ editingIngredient ? 'Modifier ingredient' : 'Nouvel ingredient' }}
              </h2>
            </div>
            <span class="app-pill">
              {{ editingIngredient ? 'Edition' : 'Creation' }}
            </span>
          </div>
          <IngredientForm
            :suppliers="supplierStore.items"
            :initial-value="editingIngredient"
            :submit-label="editingIngredient ? 'Mettre a jour' : 'Ajouter l ingredient'"
            @submit="saveIngredient"
            @cancel="editingIngredient = null"
          />
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="app-section">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Table
              </p>
              <h2 class="app-section-title mt-1">
                Fournisseurs
              </h2>
            </div>
            <span class="app-pill">{{ supplierStore.items.length }} ligne(s)</span>
          </div>
          <SupplierTable
            :items="supplierStore.items"
            @edit="editingSupplier = $event"
            @remove="removeSupplier"
          />
        </div>

        <div
          id="supplier-form"
          class="app-section scroll-mt-28"
        >
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Formulaire
              </p>
              <h2 class="app-section-title mt-1">
                {{ editingSupplier ? 'Modifier fournisseur' : 'Nouveau fournisseur' }}
              </h2>
            </div>
            <span class="app-pill">
              {{ editingSupplier ? 'Edition' : 'Creation' }}
            </span>
          </div>
          <SupplierForm
            :initial-value="editingSupplier"
            :submit-label="editingSupplier ? 'Mettre a jour' : 'Ajouter le fournisseur'"
            @submit="saveSupplier"
            @cancel="editingSupplier = null"
          />
        </div>
      </section>
    </template>
  </div>
</template>
