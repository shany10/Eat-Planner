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
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Achats</span>
          <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif]">
            Fournisseurs
          </h1>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm mt-1">
            Les partenaires et contacts sont separes des ingredients pour garder chaque table simple a lire.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            @click="openCreateSupplier"
          >
            <UIcon name="i-lucide-plus" class="size-5" />
            Ajouter fournisseur
          </button>
          <NuxtLink
            to="/ingredients"
            class="bg-[#6b3414] text-white hover:bg-[#884b29] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <UIcon name="i-lucide-wheat" class="size-5" />
            Ingredients
          </NuxtLink>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 py-4">
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ activeSupplierCount }} fournisseur(s) actif(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ contactCoverage }}% contacts</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ suppliersWithEmail }} email(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ loading ? 'Synchronisation' : 'Base a jour' }}</span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <div v-for="stat in stats" :key="stat.title" class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-2xl border border-[#c0c9ba]/20 dark:border-white/5">
           <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">{{ stat.title }}</span>
           <div class="text-3xl font-black text-[#1a1c1c] dark:text-white my-1">{{ stat.value }}</div>
           <div class="text-xs text-[#40493e] dark:text-[#c0c9ba]">{{ stat.hint }}</div>
         </div>
      </div>

      <div class="bg-[#005013]/5 dark:bg-[#8ad986]/10 rounded-2xl p-6 border border-[#005013]/20 dark:border-[#8ad986]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <UIcon name="i-lucide-megaphone" class="text-[#005013] dark:text-[#8ad986] size-7 shrink-0" />
          <div>
            <span class="text-[10px] font-bold uppercase text-[#005013]/70 dark:text-[#8ad986]/70">Signal achats</span>
            <p class="font-bold text-[#1a1c1c] dark:text-[#e2e2e2] mt-0.5">
              {{ setupSignal }}
            </p>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">{{ supplierCount }} fournisseur(s)</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">{{ inactiveSupplierCount }} inactif(s)</span>
        </div>
      </div>

      <section
        v-if="supplierStore.items.length === 0"
        class="bg-white dark:bg-[#1a1c1c] rounded-2xl p-10 md:p-16 border-2 border-dashed border-[#c0c9ba] dark:border-[#40493e] flex flex-col items-center text-center space-y-6"
      >
        <div class="space-y-3">
          <span class="text-[10px] font-bold uppercase text-[#40493e]/50 dark:text-[#c0c9ba]/50">Premier setup</span>
          <h3 class="text-2xl font-bold text-[#1a1c1c] dark:text-white">
            Ajoute ton premier fournisseur.
          </h3>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm max-w-md mx-auto">
            Une fiche fournisseur simple suffit pour rattacher ensuite les ingredients et rendre la base achats plus lisible.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex justify-center items-center gap-2"
            @click="openCreateSupplier"
          >
            <UIcon name="i-lucide-plus" class="size-5" />
            Creer un fournisseur
          </button>
          <NuxtLink
            to="/ingredients"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-3 px-8 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex justify-center items-center"
          >
            Voir les ingredients
          </NuxtLink>
        </div>
      </section>

      <div
        v-else
        class="bg-white dark:bg-[#1a1c1c] rounded-2xl overflow-hidden border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm"
      >
        <div class="p-6 border-b border-[#c0c9ba]/20 dark:border-white/5 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center bg-[#f3f3f3]/50 dark:bg-[#2f3131]/50">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Table</span>
            <h4 class="font-bold text-[#1a1c1c] dark:text-white mt-1">
              Base fournisseurs
            </h4>
          </div>
          <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">{{ supplierStore.items.length }} ligne(s)</span>
        </div>
        <div class="p-0">
          <SupplierTable
            :items="supplierStore.items"
            @edit="openEditSupplier"
            @remove="removeSupplier"
          />
        </div>
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
