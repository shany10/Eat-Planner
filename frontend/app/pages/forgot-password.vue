<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'guest'
})

const authStore = useAuthStore()
const appToast = useAppToast()

const email = ref('')
const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function getErrorMessage(error: unknown, fallback: string) {
  return getFetchErrorMessage(error, fallback)
}

async function handleSubmit() {
  pending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await authStore.requestPasswordReset({ email: email.value })
    successMessage.value = response.message
    appToast.success('Email envoye', response.message)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible d envoyer le mail de reinitialisation')
    appToast.error('Envoi impossible', errorMessage.value)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h1 class="text-2xl font-semibold">
      Mot de passe oublie
    </h1>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Saisis ton email et on t enverra un lien pour definir un nouveau mot de passe.
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

    <form
      class="mt-4 space-y-4"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label
          for="forgot-email"
          class="mb-1 block text-sm font-medium"
        >Email</label>
        <input
          id="forgot-email"
          v-model.trim="email"
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-primary-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          type="email"
          required
        >
      </div>

      <button
        class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        :disabled="pending"
      >
        {{ pending ? 'Envoi...' : 'Envoyer le lien de reinitialisation' }}
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
