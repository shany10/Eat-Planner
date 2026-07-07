<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import type { ManagedUser } from '~/types/access'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'admin'
})

const authStore = useAuthStore()
const appToast = useAppToast()

const users = ref<ManagedUser[]>([])
const loading = ref(true)
const createPending = ref(false)
const savePending = ref(false)
const rowActionId = ref('')
const editingUserId = ref<string | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const createForm = reactive({
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  active: true
})

const editForm = reactive({
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  active: true
})

const adminAccount = computed(() => users.value.find(user => user.role === 'admin') ?? null)
const editingUser = computed(() => users.value.find(user => user._id === editingUserId.value) ?? null)
const managerCount = computed(() => users.value.filter(user => user.role === 'manager').length)
const inactiveCount = computed(() => users.value.filter(user => !user.active).length)

function clearFeedback() {
  errorMessage.value = ''
  successMessage.value = ''
}

function getErrorMessage(error: unknown, fallback: string) {
  return getFetchErrorMessage(error, fallback)
}

function resetCreateForm() {
  createForm.firstname = ''
  createForm.lastname = ''
  createForm.email = ''
  createForm.password = ''
  createForm.active = true
}

function cancelEdit() {
  editingUserId.value = null
  editForm.firstname = ''
  editForm.lastname = ''
  editForm.email = ''
  editForm.password = ''
  editForm.active = true
}

function startEdit(user: ManagedUser) {
  editingUserId.value = user._id
  editForm.firstname = user.firstname
  editForm.lastname = user.lastname
  editForm.email = user.email
  editForm.password = ''
  editForm.active = user.active
  clearFeedback()
}

async function fetchUsers() {
  users.value = await $fetch<ManagedUser[]>('/api/admin/users')
}

async function loadPage() {
  loading.value = true
  clearFeedback()

  try {
    await Promise.all([
      authStore.loadProfile(),
      fetchUsers()
    ])
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de charger le panel admin')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function createManager() {
  createPending.value = true
  clearFeedback()

  try {
    const managerEmail = createForm.email
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        ...createForm,
        role: 'manager'
      }
    })

    resetCreateForm()
    await fetchUsers()
    successMessage.value = 'Manager cree avec succes.'
    appToast.success('Manager cree', `${managerEmail} a ete ajoute.`)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de creer le manager')
    appToast.error('Creation impossible', errorMessage.value)
  } finally {
    createPending.value = false
  }
}

async function saveUser() {
  if (!editingUserId.value) {
    return
  }

  savePending.value = true
  clearFeedback()

  try {
    const userEmail = editForm.email
    const body: Record<string, unknown> = {
      firstname: editForm.firstname,
      lastname: editForm.lastname,
      email: editForm.email,
      active: editForm.active
    }

    if (editForm.password) {
      body.password = editForm.password
    }

    await $fetch(`/api/admin/users/${editingUserId.value}`, {
      method: 'PATCH',
      body
    })

    cancelEdit()
    await Promise.all([
      fetchUsers(),
      authStore.loadProfile()
    ])
    successMessage.value = 'Utilisateur mis a jour.'
    appToast.success('Utilisateur mis a jour', `${userEmail} a ete modifie.`)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de mettre a jour cet utilisateur')
    appToast.error('Mise a jour impossible', errorMessage.value)
  } finally {
    savePending.value = false
  }
}

async function toggleActive(user: ManagedUser) {
  rowActionId.value = `toggle-${user._id}`
  clearFeedback()

  try {
    await $fetch(`/api/admin/users/${user._id}/toggle-active`, {
      method: 'PATCH'
    })

    await Promise.all([
      fetchUsers(),
      authStore.loadProfile()
    ])
    successMessage.value = user.active ? 'Utilisateur desactive.' : 'Utilisateur reactive.'
    appToast.success(user.active ? 'Utilisateur desactive' : 'Utilisateur reactive', user.email)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de modifier le statut de ce compte')
    appToast.error('Changement de statut impossible', errorMessage.value)
  } finally {
    rowActionId.value = ''
  }
}

async function removeUser(user: ManagedUser) {
  if (import.meta.client && !window.confirm(`Supprimer le compte ${user.email} ?`)) {
    return
  }

  rowActionId.value = `delete-${user._id}`
  clearFeedback()

  try {
    await $fetch(`/api/admin/users/${user._id}`, {
      method: 'DELETE'
    })

    if (editingUserId.value === user._id) {
      cancelEdit()
    }

    await fetchUsers()
    successMessage.value = 'Utilisateur supprime.'
    appToast.success('Utilisateur supprime', user.email)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de supprimer cet utilisateur')
    appToast.error('Suppression impossible', errorMessage.value)
  } finally {
    rowActionId.value = ''
  }
}

function formatRole(role: ManagedUser['role']) {
  if (role === 'admin') {
    return 'Admin principal'
  }

  return role === 'supplier' ? 'Fournisseur' : 'Manager'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

onMounted(loadPage)
</script>

<template>
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Administration</span>
      <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif] mt-1">
        Panel admin
      </h1>
      <p class="mt-2 max-w-3xl text-sm text-[#40493e] dark:text-[#c0c9ba]">
        Ici tu geres les comptes de la plateforme. Les nouvelles inscriptions deviennent managers automatiquement et le compte admin principal reste unique.
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <NuxtLink
          to="/account"
          class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
        >
          Retour au compte
        </NuxtLink>
        <a
          href="#create-manager"
          class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
        >
          Creer un manager
        </a>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      {{ successMessage }}
    </p>

    <div
      v-if="loading"
      class="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="h-36 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800"
      />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
          <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">Utilisateurs</span>
          <div class="text-3xl font-black text-[#1a1c1c] dark:text-white my-1">{{ users.length }}</div>
          <div class="text-xs text-[#40493e] dark:text-[#c0c9ba]">Tous les comptes de la plateforme</div>
        </div>
        <div class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
          <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">Managers</span>
          <div class="text-3xl font-black text-[#1a1c1c] dark:text-white my-1">{{ managerCount }}</div>
          <div class="text-xs text-[#40493e] dark:text-[#c0c9ba]">Comptes metier avec acces complet produit</div>
        </div>
        <div class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
          <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">Admin</span>
          <div class="text-3xl font-black text-[#1a1c1c] dark:text-white my-1">{{ adminAccount ? 1 : 0 }}</div>
          <div class="text-xs text-[#40493e] dark:text-[#c0c9ba]">Compte admin principal unique</div>
        </div>
        <div class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
          <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">Inactifs</span>
          <div class="text-3xl font-black text-[#1a1c1c] dark:text-white my-1">{{ inactiveCount }}</div>
          <div class="text-xs text-[#40493e] dark:text-[#c0c9ba]">Comptes suspendus</div>
        </div>
      </div>

      <section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div
          id="create-manager"
          class="scroll-mt-28 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm"
        >
          <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
            Creer un manager
          </h2>
          <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            Les comptes crees ici sont des managers. Le role admin n est pas duplique dans l interface pour garantir un seul admin principal.
          </p>

          <form
            class="mt-5 space-y-4"
            @submit.prevent="createManager"
          >
            <div class="grid gap-4 md:grid-cols-2">
              <input
                v-model.trim="createForm.firstname"
                class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                type="text"
                placeholder="Prenom"
                required
              >
              <input
                v-model.trim="createForm.lastname"
                class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                type="text"
                placeholder="Nom"
                required
              >
            </div>

            <input
              v-model.trim="createForm.email"
              class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
              type="email"
              placeholder="email@restaurant.com"
              required
            >

            <input
              v-model="createForm.password"
              class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
              type="password"
              minlength="8"
              placeholder="Mot de passe initial"
              required
            >

            <label class="flex items-center gap-2 text-sm font-medium text-[#40493e] dark:text-[#c0c9ba]">
              <input
                v-model="createForm.active"
                type="checkbox"
                class="size-4 rounded accent-[#005013]"
              >
              Compte actif des la creation
            </label>

            <button
              class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="createPending"
            >
              {{ createPending ? 'Creation...' : 'Creer le manager' }}
            </button>
          </form>
        </div>

        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
            Compte admin principal
          </h2>

          <div
            v-if="adminAccount"
            class="mt-5 grid gap-3 md:grid-cols-2"
          >
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Nom
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ adminAccount.firstname }} {{ adminAccount.lastname }}
              </p>
            </div>
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Email
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white break-all">
                {{ adminAccount.email }}
              </p>
            </div>
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Statut
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ adminAccount.active ? 'Actif' : 'Inactif' }}
              </p>
            </div>
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                2FA
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ adminAccount.twoFactorEnabled ? 'Activee' : 'Inactive' }}
              </p>
            </div>
          </div>

          <p class="mt-5 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            Ce compte peut etre modifie, mais il ne peut pas etre duplique, desactive ou supprime depuis le panel pour garder une porte d administration permanente.
          </p>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
                Utilisateurs
              </h2>
              <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Liste complete des comptes, avec gestion du statut et des informations.
              </p>
            </div>
            <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">
              {{ users.length }} comptes
            </span>
          </div>

          <div class="mt-5 overflow-x-auto rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5">
            <table class="min-w-full text-sm">
              <thead class="bg-[#f3f3f3] dark:bg-[#2f3131]">
                <tr class="text-left text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
                  <th class="px-4 py-3">
                    Utilisateur
                  </th>
                  <th class="px-4 py-3">
                    Role
                  </th>
                  <th class="px-4 py-3">
                    Acces
                  </th>
                  <th class="px-4 py-3">
                    Creation
                  </th>
                  <th class="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#c0c9ba]/20 dark:divide-white/5">
                <tr
                  v-for="user in users"
                  :key="user._id"
                >
                  <td class="px-4 py-3">
                    <p class="font-bold text-[#1a1c1c] dark:text-white">
                      {{ user.firstname }} {{ user.lastname }}
                    </p>
                    <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
                      {{ user.email }}
                    </p>
                    <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
                      {{ user.authProvider }} - 2FA {{ user.twoFactorEnabled ? 'on' : 'off' }}
                    </p>
                  </td>
                  <td class="px-4 py-3 text-[#1a1c1c] dark:text-white">
                    {{ formatRole(user.role) }}
                  </td>
                  <td class="px-4 py-3 text-[#1a1c1c] dark:text-white">
                    {{ user.active ? 'Actif' : 'Suspendu' }}
                  </td>
                  <td class="px-4 py-3 text-xs text-[#40493e] dark:text-[#c0c9ba]">
                    {{ formatDate(user.created_at) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-2">
                      <button
                        class="rounded-full border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white px-3 py-1.5 text-xs font-bold hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all"
                        @click="startEdit(user)"
                      >
                        Editer
                      </button>
                      <button
                        :disabled="user.role === 'admin' || rowActionId === `toggle-${user._id}`"
                        class="rounded-full border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white px-3 py-1.5 text-xs font-bold hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        @click="toggleActive(user)"
                      >
                        {{ user.active ? 'Suspendre' : 'Activer' }}
                      </button>
                      <button
                        :disabled="user.role === 'admin' || rowActionId === `delete-${user._id}`"
                        class="rounded-full border border-[#ba1a1a]/40 text-[#ba1a1a] dark:text-[#ff897d] px-3 py-1.5 text-xs font-bold hover:bg-[#ba1a1a]/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        @click="removeUser(user)"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
            Edition
          </h2>

          <EmptyStateCard
            v-if="!editingUserId"
            class="mt-5"
            eyebrow="Selection"
            title="Choisis un utilisateur a modifier."
            description="Tu peux mettre a jour son nom, son email, son mot de passe ou son statut actif."
          />

          <form
            v-else
            class="mt-5 space-y-4"
            @submit.prevent="saveUser"
          >
            <div class="grid gap-4 md:grid-cols-2">
              <input
                v-model.trim="editForm.firstname"
                class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                type="text"
                placeholder="Prenom"
                required
              >
              <input
                v-model.trim="editForm.lastname"
                class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                type="text"
                placeholder="Nom"
                required
              >
            </div>

            <input
              v-model.trim="editForm.email"
              class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
              type="email"
              placeholder="Email"
              required
            >

            <input
              v-model="editForm.password"
              class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
              type="password"
              minlength="8"
              placeholder="Nouveau mot de passe (optionnel)"
            >

            <label class="flex items-center gap-2 text-sm font-medium text-[#40493e] dark:text-[#c0c9ba]">
              <input
                v-model="editForm.active"
                :disabled="editingUser?.role === 'admin'"
                type="checkbox"
                class="size-4 rounded accent-[#005013]"
              >
              Compte actif
            </label>

            <p
              v-if="editingUser?.role === 'admin'"
              class="text-xs leading-6 text-[#40493e]/80 dark:text-[#c0c9ba]/80"
            >
              Le compte admin principal peut etre modifie, mais il reste toujours actif et unique.
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="savePending"
              >
                {{ savePending ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button
                type="button"
                class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all"
                @click="cancelEdit"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </section>
    </template>
  </div>
</template>
