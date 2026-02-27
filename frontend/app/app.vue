<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})
</script>

<template>
  <div class="min-h-screen bg-blue-500 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-xl">
      <h1 class="text-4xl font-bold text-gray-800 mb-4">
        Test Tailwind
      </h1>
      <p class="text-xl text-gray-600">
        Coucou avec Tailwind CSS test hot reload
      </p>
      <UButton class="mt-4">
        Bouton Nuxt UI
      </UButton>
    </div>
  </div>
</template>
