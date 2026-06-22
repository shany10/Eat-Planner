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
        class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#feb236] file:mr-4 file:rounded-full file:border-0 file:bg-[#feb236] file:px-4 file:py-1.5 file:text-sm file:font-bold file:text-[#6d4700]"
        type="file"
        accept=".csv,text/csv"
        @change="handleFile"
      >
      <button
        class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="!csvText.trim()"
        @click="submit"
      >
        Importer CSV
      </button>
    </div>

    <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
      Colonnes attendues : date, plat, quantite, prix. Le prix est optionnel si le plat a deja un prix TTC.
    </p>

    <p
      v-if="fileName"
      class="text-sm font-medium text-[#1a1c1c] dark:text-white"
    >
      Fichier pret : {{ fileName }}
    </p>
  </div>
</template>
