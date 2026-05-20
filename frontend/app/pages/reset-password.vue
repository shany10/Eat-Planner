<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'guest'
})

const route = useRoute()
const authStore = useAuthStore()
const appToast = useAppToast()

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})

const form = reactive({
  password: '',
  confirmPassword: ''
})

const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function getErrorMessage(error: unknown, fallback: string) {
  return getFetchErrorMessage(error, fallback)
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!token.value) {
    errorMessage.value = 'Token de reinitialisation manquant'
    appToast.error('Lien invalide', errorMessage.value)
    return
  }

  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Les deux mots de passe ne correspondent pas'
    appToast.warning('Mots de passe differents', errorMessage.value)
    return
  }

  pending.value = true

  try {
    const response = await authStore.resetPassword({
      token: token.value,
      password: form.password
    })
    successMessage.value = response.message
    appToast.success('Mot de passe mis a jour', response.message)
    form.password = ''
    form.confirmPassword = ''
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de reinitialiser le mot de passe')
    appToast.error('Reinitialisation impossible', errorMessage.value)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h1 class="text-2xl font-semibold">
      Nouveau mot de passe
    </h1>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Definis ici un nouveau mot de passe pour ton compte.
    </p>

    <p
      v-if="errorMessage"
      class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage"
      class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      {{ successMessage }}
    </p>

    <div
      v-if="!token"
      class="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      Le lien de reinitialisation est incomplet ou invalide.
    </div>

    <form
      v-else
      class="mt-4 space-y-4"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label
          for="reset-password"
          class="mb-1 block text-sm font-medium"
        >Nouveau mot de passe</label>
        <input
          id="reset-password"
          v-model="form.password"
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-primary-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          type="password"
          minlength="8"
          required
        >
      </div>

      <div>
        <label
          for="reset-password-confirm"
          class="mb-1 block text-sm font-medium"
        >Confirmer le mot de passe</label>
        <input
          id="reset-password-confirm"
          v-model="form.confirmPassword"
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-primary-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          type="password"
          minlength="8"
          required
        >
      </div>

      <button
        class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        :disabled="pending"
      >
        {{ pending ? 'Mise a jour...' : 'Enregistrer le nouveau mot de passe' }}
      </button>
    </form>

    <p class="mt-4 text-sm text-slate-600 dark:text-slate-300">
      Retour a la connexion ?
      <NuxtLink
        to="/login"
        class="font-medium text-primary-700 underline"
      >
        Login
      </NuxtLink>
    </p>
  </main>
</template>
