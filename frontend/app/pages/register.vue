<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'guest'
})

const authStore = useAuthStore()
const appToast = useAppToast()

const form = reactive({
  firstname: '',
  lastname: '',
  email: '',
  password: ''
})

const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  pending.value = true

  try {
    await authStore.register(form)
    successMessage.value = 'Compte cree. Tu peux maintenant te connecter.'
    appToast.success('Compte cree', 'Tu peux maintenant te connecter.')
    await navigateTo('/login')
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Registration failed')
    appToast.error('Creation impossible', errorMessage.value)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
    <aside class="app-panel hidden p-6 lg:block">
      <p class="app-eyebrow">
        Nouveau compte
      </p>
      <h1 class="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">
        Creation manager
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Les comptes crees ici rejoignent l espace de pilotage avec un role manager.
      </p>

      <div class="mt-8 grid gap-3">
        <div class="app-inset">
          <p class="text-sm font-semibold text-slate-950 dark:text-white">
            Base metier
          </p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ingredients, plats, charges et ventes au meme endroit.
          </p>
        </div>
        <div class="app-inset">
          <p class="text-sm font-semibold text-slate-950 dark:text-white">
            Role unique
          </p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Le compte admin principal reste gere separement.
          </p>
        </div>
      </div>
    </aside>

    <div class="app-panel p-5 sm:p-8">
      <div class="mx-auto max-w-lg">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="app-eyebrow">
              Inscription
            </p>
            <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
              Cree ton compte
            </h2>
          </div>

          <div class="hidden h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white sm:flex dark:bg-white dark:text-slate-950">
            EP
          </div>
        </div>

        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Renseigne tes informations pour acceder a une interface plus coloree et commencer a piloter tes donnees sereinement.
        </p>

        <div class="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
          Chaque nouvelle inscription cree automatiquement un compte manager. Le compte admin principal reste unique et se gere dans le panel admin.
        </div>

        <p
          v-if="errorMessage"
          class="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200"
        >
          {{ errorMessage }}
        </p>

        <p
          v-if="successMessage"
          class="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200"
        >
          {{ successMessage }}
        </p>

        <form
          class="mt-6 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label
                for="firstname"
                class="text-sm font-medium text-slate-700 dark:text-slate-200"
              >Prenom</label>
              <input
                id="firstname"
                v-model.trim="form.firstname"
                class="app-input mt-2"
                type="text"
                placeholder="Prenom"
                required
              >
            </div>

            <div>
              <label
                for="lastname"
                class="text-sm font-medium text-slate-700 dark:text-slate-200"
              >Nom</label>
              <input
                id="lastname"
                v-model.trim="form.lastname"
                class="app-input mt-2"
                type="text"
                placeholder="Nom"
                required
              >
            </div>
          </div>

          <div>
            <label
              for="email"
              class="text-sm font-medium text-slate-700 dark:text-slate-200"
            >Email</label>
            <input
              id="email"
              v-model.trim="form.email"
              class="app-input mt-2"
              type="email"
              placeholder="ton@email.com"
              required
            >
          </div>

          <div>
            <label
              for="password"
              class="text-sm font-medium text-slate-700 dark:text-slate-200"
            >Mot de passe</label>
            <input
              id="password"
              v-model="form.password"
              class="app-input mt-2"
              type="password"
              minlength="8"
              placeholder="Minimum 8 caracteres"
              required
            >

            <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              Choisis un mot de passe solide pour proteger l acces a tes prix, tes charges et tes donnees de production.
            </div>
          </div>

          <button
            class="btn-primary w-full"
            type="submit"
            :disabled="pending"
          >
            {{ pending ? 'Creation...' : 'Creer le compte' }}
          </button>
        </form>

        <p class="mt-6 text-sm text-slate-600 dark:text-slate-300">
          Deja un compte ?
          <NuxtLink
            to="/login"
            class="font-semibold text-orange-700 transition hover:text-orange-600 dark:text-orange-300 dark:hover:text-orange-200"
          >
            Se connecter
          </NuxtLink>
        </p>
      </div>
    </div>
  </section>
</template>
