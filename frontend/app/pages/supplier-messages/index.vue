<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import type { Supplier, SupplierMessage } from '~/types/business'
import { useAuthStore } from '~/stores/auth'
import { useSupplierMessageStore } from '~/stores/supplier-messages'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const supplierStore = useSupplierStore()
const messageStore = useSupplierMessageStore()
const appToast = useAppToast()

const form = reactive({
  supplier: '',
  subject: '',
  body: ''
})
const loading = ref(true)
const sending = ref(false)
const errorMessage = ref('')
const lastMessageId = ref('')
const mailpitUrl = 'http://localhost:8025'
let refreshTimer: ReturnType<typeof setInterval> | null = null

const isSupplierPortal = computed(() => authStore.profile?.role === 'supplier')
const suppliersWithEmail = computed(() =>
  supplierStore.items.filter(supplier => supplier.active && Boolean(supplier.email))
)
const sentCount = computed(() => messageStore.items.filter(message => message.direction !== 'inbound' && message.status === 'sent').length)
const receivedCount = computed(() => messageStore.items.filter(message => message.direction === 'inbound').length)
const failedCount = computed(() => messageStore.items.filter(message => message.status === 'failed').length)
const selectedSupplier = computed(() =>
  supplierStore.items.find(supplier => supplier._id === form.supplier)
  ?? getMessageSupplier(messageStore.items[0])
)
const canSend = computed(() => {
  const hasText = form.subject.trim().length >= 2 && form.body.trim().length >= 2 && !sending.value
  return isSupplierPortal.value ? hasText : Boolean(form.supplier && hasText)
})
const pageTitle = computed(() => isSupplierPortal.value ? 'Conversation restaurant' : 'Messagerie fournisseurs')
const pageSubtitle = computed(() =>
  isSupplierPortal.value
    ? 'Reponds au restaurant depuis le portail fournisseur.'
    : 'Contacte un fournisseur, suis les reponses et garde un historique clair.'
)

async function loadPage() {
  loading.value = true
  errorMessage.value = ''

  try {
    if (!authStore.profile) {
      await authStore.loadProfile()
    }

    const results = await Promise.allSettled([
      supplierStore.load(),
      messageStore.load()
    ])

    const firstFailure = results.find(result => result.status === 'rejected')

    if (firstFailure?.status === 'rejected') {
      errorMessage.value = getFetchErrorMessage(firstFailure.reason, 'Impossible de charger toute la messagerie fournisseurs')
      appToast.error('Chargement partiel', errorMessage.value)
    }

    form.supplier = suppliersWithEmail.value[0]?._id ?? ''
    form.subject = isSupplierPortal.value ? 'Reponse fournisseur' : ''
    lastMessageId.value = messageStore.items[0]?._id ?? ''
    startRealtimeRefresh()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger la messagerie fournisseurs')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

function startRealtimeRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }

  refreshTimer = setInterval(() => {
    void refreshMessages(true)
  }, 5000)
}

async function refreshMessages(silent = false) {
  const previousLatest = lastMessageId.value

  try {
    await messageStore.load()
  } catch {
    return
  }

  const latest = messageStore.items[0]
  if (!latest) {
    return
  }

  if (!previousLatest) {
    lastMessageId.value = latest._id
    return
  }

  if (latest._id !== previousLatest) {
    lastMessageId.value = latest._id
    if (silent && isMessageFromOtherSide(latest)) {
      appToast.info('Nouveau message', getDirectionToast(latest))
    }
  }
}

async function sendMessage() {
  if (!canSend.value) {
    return
  }

  sending.value = true
  errorMessage.value = ''

  try {
    const payload = {
      subject: form.subject.trim(),
      body: form.body.trim()
    }
    const message = isSupplierPortal.value
      ? await messageStore.reply(payload)
      : await messageStore.send({
          supplier: form.supplier,
          ...payload
        })

    lastMessageId.value = message._id
    appToast.success(
      isSupplierPortal.value ? 'Reponse envoyee' : 'Message envoye',
      isSupplierPortal.value ? 'Le restaurant verra la reponse dans la messagerie.' : `${getMessageSupplierName(message)} peut etre verifie dans Mailpit.`
    )
    form.body = ''
    if (!isSupplierPortal.value) {
      form.subject = ''
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Envoi impossible')
    appToast.error('Envoi impossible', errorMessage.value)
    await messageStore.load()
  } finally {
    sending.value = false
  }
}

function getMessageSupplier(message?: SupplierMessage): Supplier | null {
  if (!message) {
    return null
  }

  return typeof message.supplier === 'object'
    ? message.supplier
    : supplierStore.items.find(supplier => supplier._id === message.supplier) ?? null
}

function getMessageSupplierName(message?: SupplierMessage) {
  return getMessageSupplier(message)?.name ?? 'Fournisseur'
}

function getDirectionLabel(message: SupplierMessage) {
  if (message.direction === 'inbound') {
    return isSupplierPortal.value ? 'Vous -> restaurant' : 'Fournisseur -> restaurant'
  }

  return isSupplierPortal.value ? 'Restaurant -> vous' : 'Restaurant -> fournisseur'
}

function getMessageStatusLabel(message: SupplierMessage) {
  if (message.status === 'failed') {
    return 'Echec'
  }

  return message.direction === 'inbound' ? 'Recu' : 'Envoye'
}

function isMessageFromOtherSide(message: SupplierMessage) {
  return isSupplierPortal.value ? message.direction !== 'inbound' : message.direction === 'inbound'
}

function getDirectionToast(message: SupplierMessage) {
  return isSupplierPortal.value
    ? 'Le restaurant t a envoye un nouveau message.'
    : `${getMessageSupplierName(message)} a repondu.`
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

onMounted(loadPage)
onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<template>
  <div class="space-y-5 font-sans">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span class="app-eyebrow">{{ isSupplierPortal ? 'Portail fournisseur' : 'Fournisseurs' }}</span>
          <h1 class="app-title">
            {{ pageTitle }}
          </h1>
          <p class="app-subtitle">
            {{ pageSubtitle }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-if="!isSupplierPortal"
            to="/suppliers"
            class="btn-secondary"
          >
            <UIcon
              name="i-lucide-truck"
              class="size-4"
            />
            Fournisseurs
          </NuxtLink>
          <NuxtLink
            to="/supplier-messages/call"
            class="btn-secondary"
          >
            <UIcon
              name="i-lucide-video"
              class="size-4"
            />
            Visio
          </NuxtLink>
          <a
            v-if="!isSupplierPortal"
            :href="mailpitUrl"
            target="_blank"
            rel="noreferrer"
            class="btn-primary"
          >
            <UIcon
              name="i-lucide-inbox"
              class="size-4"
            />
            Mailpit
          </a>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ suppliersWithEmail.length }} contact(s)</span>
        <span class="app-pill">{{ sentCount }} envoye(s)</span>
        <span class="app-pill">{{ receivedCount }} recu(s)</span>
        <span class="app-pill">{{ failedCount }} echec(s)</span>
        <span class="app-pill">{{ loading ? 'Synchronisation' : 'Temps reel actif' }}</span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section class="app-section">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <span class="app-eyebrow">{{ isSupplierPortal ? 'Reponse' : 'Nouveau message' }}</span>
            <h2 class="app-section-title">
              {{ isSupplierPortal ? 'Repondre au restaurant' : 'Contacter un fournisseur' }}
            </h2>
          </div>
          <UIcon
            name="i-lucide-send"
            class="size-5 text-[#825500] dark:text-[#feb236]"
          />
        </div>

        <form
          class="space-y-4"
          @submit.prevent="sendMessage"
        >
          <label
            v-if="!isSupplierPortal"
            class="block space-y-1.5"
          >
            <span class="text-sm font-bold text-[#1a1c1c] dark:text-white">Fournisseur</span>
            <select
              v-model="form.supplier"
              class="app-input"
              :disabled="loading || suppliersWithEmail.length === 0"
            >
              <option value="">
                Selectionner un fournisseur
              </option>
              <option
                v-for="supplier in suppliersWithEmail"
                :key="supplier._id"
                :value="supplier._id"
              >
                {{ supplier.name }} - {{ supplier.email }}
              </option>
            </select>
          </label>

          <label class="block space-y-1.5">
            <span class="text-sm font-bold text-[#1a1c1c] dark:text-white">Objet</span>
            <input
              v-model="form.subject"
              class="app-input"
              maxlength="160"
              placeholder="Demande de disponibilite"
            >
          </label>

          <label class="block space-y-1.5">
            <span class="text-sm font-bold text-[#1a1c1c] dark:text-white">Message</span>
            <textarea
              v-model="form.body"
              class="app-input min-h-36 resize-y"
              maxlength="4000"
              :placeholder="isSupplierPortal ? 'Bonjour, nous confirmons la disponibilite...' : 'Bonjour, pouvez-vous confirmer vos disponibilites pour cette semaine ?'"
            />
          </label>

          <div
            v-if="selectedSupplier"
            class="app-inset flex items-start gap-3"
          >
            <UIcon
              name="i-lucide-message-circle"
              class="mt-0.5 size-4 text-[#005013] dark:text-[#8ad986]"
            />
            <div class="min-w-0 text-sm">
              <p class="font-bold text-[#1a1c1c] dark:text-white">
                {{ selectedSupplier.name }}
              </p>
              <p class="app-muted">
                {{ selectedSupplier.email || 'Conversation fournisseur' }}
              </p>
            </div>
          </div>

          <div
            v-else-if="!loading"
            class="app-inset text-sm text-[#40493e] dark:text-[#c0c9ba]"
          >
            {{ isSupplierPortal ? 'Ce compte fournisseur n est pas encore relie a une fiche.' : 'Ajoute un email dans une fiche fournisseur pour activer l envoi.' }}
          </div>

          <button
            type="submit"
            class="btn-primary w-full"
            :disabled="!canSend"
          >
            <UIcon
              name="i-lucide-send"
              class="size-4"
            />
            {{ sending ? 'Envoi...' : (isSupplierPortal ? 'Envoyer la reponse' : 'Envoyer le message') }}
          </button>
        </form>
      </section>

      <section class="app-section">
        <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span class="app-eyebrow">Fil temps reel</span>
            <h2 class="app-section-title">
              Conversation
            </h2>
          </div>
          <button
            type="button"
            class="btn-secondary px-3 py-2 text-xs"
            :disabled="messageStore.pending"
            @click="refreshMessages(false)"
          >
            <UIcon
              name="i-lucide-refresh-cw"
              class="size-4"
            />
            Actualiser
          </button>
        </div>

        <div
          v-if="loading"
          class="space-y-3"
        >
          <div
            v-for="index in 4"
            :key="index"
            class="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
          />
        </div>

        <div
          v-else-if="messageStore.items.length === 0"
          class="app-inset text-sm text-[#40493e] dark:text-[#c0c9ba]"
        >
          Aucun message pour le moment.
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <article
            v-for="message in messageStore.items"
            :key="message._id"
            class="rounded-xl border p-4"
            :class="message.direction === 'inbound'
              ? 'border-[#005013]/20 bg-[#005013]/5 dark:border-[#8ad986]/20 dark:bg-[#8ad986]/10'
              : 'border-[#c0c9ba]/20 bg-[#f9faf8] dark:border-white/10 dark:bg-[#2f3131]'"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate text-sm font-bold text-[#1a1c1c] dark:text-white">
                    {{ message.subject }}
                  </h3>
                  <span
                    class="app-pill"
                    :class="message.status === 'failed' ? 'text-error' : 'text-success'"
                  >
                    {{ getMessageStatusLabel(message) }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
                  {{ getDirectionLabel(message) }} - {{ message.from || getMessageSupplierName(message) }}
                </p>
              </div>
              <span class="text-xs font-bold text-[#40493e]/70 dark:text-[#c0c9ba]/70">
                {{ formatDate(message.sentAt || message.created_at) }}
              </span>
            </div>
            <p class="mt-3 whitespace-pre-line text-sm leading-6 text-[#1a1c1c] dark:text-[#f1f1f1]">
              {{ message.body }}
            </p>
            <p
              v-if="message.errorMessage"
              class="mt-3 text-xs font-bold text-error"
            >
              {{ message.errorMessage }}
            </p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
