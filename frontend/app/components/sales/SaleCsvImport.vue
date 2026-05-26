<script setup lang="ts">
const emit = defineEmits<{
  import: [csv: string]
}>()

const fileName = ref('')
const csvText = ref('')

async function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  fileName.value = file.name
  csvText.value = await file.text()
}

function submit() {
  if (!csvText.value.trim()) {
    return
  }

  emit('import', csvText.value)
}
</script>

<template>
  <div class="grid gap-3">
    <div class="grid gap-3 md:grid-cols-[1fr_auto]">
      <input
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:border-slate-700 dark:bg-slate-950 dark:file:bg-white dark:file:text-slate-900"
        type="file"
        accept=".csv,text/csv"
        @change="handleFile"
      >
      <button
        class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
        :disabled="!csvText.trim()"
        @click="submit"
      >
        Importer CSV
      </button>
    </div>

    <p class="text-xs text-slate-500">
      Colonnes attendues : date, plat, quantite, prix. Le prix est optionnel si le plat a deja un prix TTC.
    </p>

    <p
      v-if="fileName"
      class="text-sm text-slate-600 dark:text-slate-300"
    >
      Fichier pret : {{ fileName }}
    </p>
  </div>
</template>
