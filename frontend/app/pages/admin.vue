<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import StatCard from '~/components/common/StatCard.vue'
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
  return role === 'admin' ? 'Admin principal' : 'Manager'
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
  <div class="space-y-8">
    <section class="app-page-header">
      <p class="app-eyebrow">
        Administration
      </p>
      <h1 class="app-title mt-3">
        Panel admin
      </h1>
      <p class="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
        Ici tu geres les comptes de la plateforme. Les nouvelles inscriptions deviennent managers automatiquement et le compte admin principal reste unique.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink
          to="/account"
          class="btn-secondary"
        >
          Retour au compte
        </NuxtLink>
        <a
          href="#create-manager"
          class="btn-primary"
        >
          Creer un manager
        </a>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage"
      class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      {{ successMessage }}
    </p>

    <div
      v-if="loading"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
      />
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Utilisateurs"
          :value="users.length"
          hint="Tous les comptes de la plateforme"
        />
        <StatCard
          title="Managers"
          :value="managerCount"
          hint="Comptes metier avec acces complet produit"
        />
        <StatCard
          title="Admin"
          :value="adminAccount ? 1 : 0"
          hint="Compte admin principal unique"
        />
        <StatCard
          title="Inactifs"
          :value="inactiveCount"
          hint="Comptes suspendus"
        />
      </div>

      <section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div
          id="create-manager"
          class="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 class="text-xl font-semibold">
            Creer un manager
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Les comptes crees ici sont des managers. Le role admin n est pas duplique dans l interface pour garantir un seul admin principal.
          </p>

          <form
            class="mt-5 space-y-4"
            @submit.prevent="createManager"
          >
            <div class="grid gap-4 md:grid-cols-2">
              <input
                v-model.trim="createForm.firstname"
                class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                type="text"
                placeholder="Prenom"
                required
              >
              <input
                v-model.trim="createForm.lastname"
                class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                type="text"
                placeholder="Nom"
                required
              >
            </div>

            <input
              v-model.trim="createForm.email"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              type="email"
              placeholder="email@restaurant.com"
              required
            >

            <input
              v-model="createForm.password"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              type="password"
              minlength="8"
              placeholder="Mot de passe initial"
              required
            >

            <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                v-model="createForm.active"
                type="checkbox"
              >
              Compte actif des la creation
            </label>

            <button
              class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
              :disabled="createPending"
            >
              {{ createPending ? 'Creation...' : 'Creer le manager' }}
            </button>
          </form>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 class="text-xl font-semibold">
            Compte admin principal
          </h2>

          <div
            v-if="adminAccount"
            class="mt-5 grid gap-3 md:grid-cols-2"
          >
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Nom
              </p>
              <p class="mt-2 font-medium">
                {{ adminAccount.firstname }} {{ adminAccount.lastname }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Email
              </p>
              <p class="mt-2 font-medium">
                {{ adminAccount.email }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Statut
              </p>
              <p class="mt-2 font-medium">
                {{ adminAccount.active ? 'Actif' : 'Inactif' }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                2FA
              </p>
              <p class="mt-2 font-medium">
                {{ adminAccount.twoFactorEnabled ? 'Activee' : 'Inactive' }}
              </p>
            </div>
          </div>

          <p class="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Ce compte peut etre modifie, mais il ne peut pas etre duplique, desactive ou supprime depuis le panel pour garder une porte d administration permanente.
          </p>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">
                Utilisateurs
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                Liste complete des comptes, avec gestion du statut et des informations.
              </p>
            </div>
            <span class="text-sm text-slate-500">
              {{ users.length }} comptes
            </span>
          </div>

          <div class="mt-5 overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead class="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-slate-500">
                    Utilisateur
                  </th>
                  <th class="px-4 py-3 text-left font-medium text-slate-500">
                    Role
                  </th>
                  <th class="px-4 py-3 text-left font-medium text-slate-500">
                    Acces
                  </th>
                  <th class="px-4 py-3 text-left font-medium text-slate-500">
                    Creation
                  </th>
                  <th class="px-4 py-3 text-right font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                <tr
                  v-for="user in users"
                  :key="user._id"
                >
                  <td class="px-4 py-3">
                    <p class="font-medium">
                      {{ user.firstname }} {{ user.lastname }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ user.email }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ user.authProvider }} - 2FA {{ user.twoFactorEnabled ? 'on' : 'off' }}
                    </p>
                  </td>
                  <td class="px-4 py-3">
                    {{ formatRole(user.role) }}
                  </td>
                  <td class="px-4 py-3">
                    {{ user.active ? 'Actif' : 'Suspendu' }}
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500">
                    {{ formatDate(user.created_at) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-2">
                      <button
                        class="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700"
                        @click="startEdit(user)"
                      >
                        Editer
                      </button>
                      <button
                        :disabled="user.role === 'admin' || rowActionId === `toggle-${user._id}`"
                        class="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
                        @click="toggleActive(user)"
                      >
                        {{ user.active ? 'Suspendre' : 'Activer' }}
                      </button>
                      <button
                        :disabled="user.role === 'admin' || rowActionId === `delete-${user._id}`"
                        class="rounded-lg bg-red-600 px-3 py-1.5 text-white disabled:cursor-not-allowed disabled:opacity-50"
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

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 class="text-xl font-semibold">
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
                class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                type="text"
                placeholder="Prenom"
                required
              >
              <input
                v-model.trim="editForm.lastname"
                class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                type="text"
                placeholder="Nom"
                required
              >
            </div>

            <input
              v-model.trim="editForm.email"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              type="email"
              placeholder="Email"
              required
            >

            <input
              v-model="editForm.password"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              type="password"
              minlength="8"
              placeholder="Nouveau mot de passe (optionnel)"
            >

            <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                v-model="editForm.active"
                :disabled="editingUser?.role === 'admin'"
                type="checkbox"
              >
              Compte actif
            </label>

            <p
              v-if="editingUser?.role === 'admin'"
              class="text-xs leading-6 text-slate-500 dark:text-slate-400"
            >
              Le compte admin principal peut etre modifie, mais il reste toujours actif et unique.
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                :disabled="savePending"
              >
                {{ savePending ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700"
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
