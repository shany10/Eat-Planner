<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  secondaryLabel?: string
  secondaryTo?: string
}>(), {
  eyebrow: ''
})
</script>

<template>
  <section class="rounded-[2.5rem] border-2 border-dashed border-[#c0c9ba] dark:border-[#40493e] bg-white dark:bg-[#1a1c1c] p-8 md:p-12">
    <span
      v-if="eyebrow"
      class="text-[10px] font-bold uppercase tracking-widest text-[#40493e]/50 dark:text-[#c0c9ba]/50"
    >
      {{ eyebrow }}
    </span>
    <h3 class="mt-3 text-2xl font-bold text-[#1a1c1c] dark:text-white">
      {{ title }}
    </h3>
    <p class="mt-2 max-w-2xl text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
      {{ description }}
    </p>

    <div
      v-if="actionTo || secondaryTo"
      class="mt-6 flex flex-wrap gap-3"
    >
      <NuxtLink
        v-if="actionTo && actionLabel"
        :to="actionTo"
        class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
      >
        {{ actionLabel }}
      </NuxtLink>

      <NuxtLink
        v-if="secondaryTo && secondaryLabel"
        :to="secondaryTo"
        class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
      >
        {{ secondaryLabel }}
      </NuxtLink>
    </div>
  </section>
</template>
