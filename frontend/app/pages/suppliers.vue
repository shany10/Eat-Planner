<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import StatCard from '~/components/common/StatCard.vue'
import SupplierForm from '~/components/suppliers/SupplierForm.vue'
import SupplierTable from '~/components/suppliers/SupplierTable.vue'
import type { Supplier } from '~/types/business'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'auth'
})

const supplierStore = useSupplierStore()
const appToast = useAppToast()

const editingSupplier = ref<Supplier | null>(null)
const isSupplierModalOpen = ref(false)
const errorMessage = ref('')
const loading = ref(true)

type PageStat = {
  title: string
  value: string | number
  hint: string
}

const supplierCount = computed(() => supplierStore.items.length)
const activeSupplierCount = computed(() => supplierStore.items.filter(item => item.active).length)
const inactiveSupplierCount = computed(() => supplierStore.items.filter(item => !item.active).length)
const suppliersWithContact = computed(() => supplierStore.items.filter(item => Boolean(item.contactName || item.phone || item.email)).length)
const suppliersWithEmail = computed(() => supplierStore.items.filter(item => Boolean(item.email)).length)

const contactCoverage = computed(() => {
  if (supplierCount.value === 0) {
    return 0
  }

  return Math.round((suppliersWithContact.value / supplierCount.value) * 100)
})

const stats = computed<PageStat[]>(() => [
  { title: 'Fournisseurs actifs', value: activeSupplierCount.value, hint: 'Partenaires utilisables' },
  { title: 'Contacts renseignes', value: `${contactCoverage.value}%`, hint: 'Email, telephone ou contact' },
  { title: 'Avec email', value: suppliersWithEmail.value, hint: 'Pratique pour les commandes' },
  { title: 'Inactifs', value: inactiveSupplierCount.value, hint: 'Historique conserve' }
])

const setupSignal = computed(() => {
  if (supplierCount.value === 0) {
    return 'Ajoute les fournisseurs principaux pour structurer les achats et relier tes ingredients.'
  }

  if (contactCoverage.value < 100) {
    return 'Quelques fournisseurs n ont pas encore de contact; la table reste utilisable, mais les fiches seront plus completes avec ces infos.'
  }

  return 'Les fournisseurs sont propres et prets a etre relies aux ingredients.'
})

const modalTitle = computed(() => editingSupplier.value ? 'Modifier fournisseur' : 'Nouveau fournisseur')
const modalDescription = computed(() =>
  editingSupplier.value
    ? 'Mets a jour les coordonnees sans quitter la table.'
    : 'Ajoute un fournisseur simple avec ses informations principales.'
)

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    await supplierStore.load()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les fournisseurs')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

function openCreateSupplier() {
  editingSupplier.value = null
  isSupplierModalOpen.value = true
}

function openEditSupplier(item: Supplier) {
  editingSupplier.value = item
  isSupplierModalOpen.value = true
}

function closeSupplierModal() {
  isSupplierModalOpen.value = false
  editingSupplier.value = null
}

async function saveSupplier(payload: Omit<Supplier, '_id'>) {
  try {
    if (editingSupplier.value) {
      await supplierStore.update(editingSupplier.value._id, payload)
      appToast.success('Fournisseur mis a jour', `${payload.name} a ete modifie.`)
    } else {
      await supplierStore.create(payload)
      appToast.success('Fournisseur ajoute', `${payload.name} est maintenant dans la base.`)
    }

    closeSupplierModal()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Echec lors de l enregistrement du fournisseur')
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

onMounted(loadPage)
</script>

<template>
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Achats
          </p>
          <h1 class="app-title mt-2">
            Fournisseurs
          </h1>
          <p class="app-subtitle mt-2">
            Les partenaires et contacts sont separes des ingredients pour garder chaque table simple a lire.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-primary"
            @click="openCreateSupplier"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            Ajouter fournisseur
          </button>
          <NuxtLink
            to="/ingredients"
            class="btn-secondary"
          >
            <UIcon
              name="i-lucide-wheat"
              class="size-4"
            />
            Ingredients
          </NuxtLink>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ activeSupplierCount }} fournisseur(s) actif(s)</span>
        <span class="app-pill">{{ contactCoverage }}% contacts</span>
        <span class="app-pill">{{ suppliersWithEmail }} email(s)</span>
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
              Signal achats
            </p>
            <p class="app-section-title mt-1">
              {{ setupSignal }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="app-pill">{{ supplierCount }} fournisseur(s)</span>
            <span class="app-pill">{{ inactiveSupplierCount }} inactif(s)</span>
            <span class="app-pill">{{ suppliersWithContact }} avec contact</span>
          </div>
        </div>
      </div>

      <section
        v-if="supplierStore.items.length === 0"
        class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60"
      >
        <p class="app-eyebrow">
          Premier setup
        </p>
        <h3 class="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
          Ajoute ton premier fournisseur.
        </h3>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Une fiche fournisseur simple suffit pour rattacher ensuite les ingredients et rendre la base achats plus lisible.
        </p>
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            class="btn-primary"
            @click="openCreateSupplier"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            Creer un fournisseur
          </button>
          <NuxtLink
            to="/ingredients"
            class="btn-secondary"
          >
            Voir les ingredients
          </NuxtLink>
        </div>
      </section>

      <div class="app-section">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="app-eyebrow">
              Table
            </p>
            <h2 class="app-section-title mt-1">
              Base fournisseurs
            </h2>
          </div>
          <span class="app-pill">{{ supplierStore.items.length }} ligne(s)</span>
        </div>
        <SupplierTable
          :items="supplierStore.items"
          @edit="openEditSupplier"
          @remove="removeSupplier"
        />
      </div>
    </template>

    <AppModal
      :open="isSupplierModalOpen"
      :title="modalTitle"
      :description="modalDescription"
      eyebrow="Fournisseur"
      size="lg"
      @close="closeSupplierModal"
    >
      <SupplierForm
        :initial-value="editingSupplier"
        :submit-label="editingSupplier ? 'Mettre a jour le fournisseur' : 'Ajouter le fournisseur'"
        show-cancel
        @submit="saveSupplier"
        @cancel="closeSupplierModal"
      />
    </AppModal>
  </div>
</template>
