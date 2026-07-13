<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import StatCard from '~/components/common/StatCard.vue'
import SupplierForm from '~/components/suppliers/SupplierForm.vue'
import SupplierTable from '~/components/suppliers/SupplierTable.vue'
import type { Supplier } from '~/types/business'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'manager'
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
  <div class="space-y-6">
    <PageHeader
      eyebrow="Achats"
      title="Fournisseurs"
      subtitle="Centralise tes partenaires et leurs contacts pour préparer les commandes."
    >
      <template #actions>
        <AppButton
          icon="i-lucide-plus"
          @click="openCreateSupplier"
        >
          Ajouter fournisseur
        </AppButton>
        <AppButton
          variant="secondary"
          to="/ingredients"
          icon="i-lucide-wheat"
        >
          Ingrédients
        </AppButton>
      </template>
    </PageHeader>

    <p
      v-if="errorMessage"
      class="app-alert-error"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="mt-0.5 size-4 shrink-0"
      />
      <span>{{ errorMessage }}</span>
    </p>

    <template v-if="loading">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-24 animate-pulse rounded-[var(--ep-radius)] bg-[color:var(--ep-surface-muted)]"
        />
      </div>
    </template>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div>

      <section class="app-section space-y-4">
        <div class="flex items-center gap-2">
          <h2 class="app-section-title">
            Base fournisseurs
          </h2>
          <AppBadge>{{ supplierStore.items.length }}</AppBadge>
        </div>

        <SupplierTable
          :items="supplierStore.items"
          @edit="openEditSupplier"
          @remove="removeSupplier"
        />
      </section>
    </template>

    <AppModal
      :open="isSupplierModalOpen"
      :title="modalTitle"
      :description="modalDescription"
      eyebrow="Fournisseur"
      size="lg"
      variant="warm"
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
