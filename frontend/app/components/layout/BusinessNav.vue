<script setup lang="ts">
// Source unique de la navigation : le composable useBusinessNav. La barre
// laterale (desktop) et la barre du bas (mobile, BusinessBottomNav) consomment
// donc les memes sections et le meme controle d acces par role — plus de liste
// dupliquee a garder synchronisee a la main.
const {
  sections,
  displayName,
  roleBadge,
  isActive,
  handleLogout,
  ensureProfileLoaded
} = useBusinessNav()

onMounted(ensureProfileLoaded)
</script>

<template>
  <aside class="flex flex-col h-full bg-[#6b3414] border-r border-[#c0c9ba]/10 dark:border-white/10 transition-all duration-300 font-['Be_Vietnam_Pro',sans-serif]">
    <nav class="flex-1 space-y-4 pt-6 overflow-y-auto">
      <div
        v-for="section in sections"
        :key="section.title"
      >
        <p class="mb-2 px-8 text-[10px] font-bold uppercase text-white/40 tracking-wider">
          {{ section.title }}
        </p>
        <div class="space-y-1">
          <NuxtLink
            v-for="link in section.links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 py-2.5 px-5 rounded-full mx-3 transition-all text-sm"
            :class="isActive(link.to)
              ? 'bg-[#feb236] text-[#6d4700] font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] active:scale-95'
              : 'text-white hover:bg-[#884b29] font-medium'"
          >
            <UIcon
              :name="link.icon"
              class="size-5"
            />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <div class="mt-auto px-6 py-5 border-t border-white/10 bg-black/10">
      <div
        class="flex items-center gap-3 cursor-pointer group"
        title="Se deconnecter"
        @click="handleLogout"
      >
        <div class="w-10 h-10 rounded-full bg-[#feb236] flex items-center justify-center text-[#6d4700] font-bold shrink-0">
          {{ displayName.slice(0, 2).toUpperCase() }}
        </div>
        <div class="overflow-hidden w-full">
          <p class="text-white font-bold truncate text-sm flex items-center justify-between group-hover:text-red-300 transition-colors">
            {{ displayName }}
            <UIcon
              name="i-lucide-log-out"
              class="size-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-300"
            />
          </p>
          <p class="text-white/60 text-xs truncate font-medium">
            {{ roleBadge }}
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
