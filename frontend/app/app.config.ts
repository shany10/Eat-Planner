export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },
    tooltip: {
      slots: {
        // z-[60] : au-dessus de la topbar/barre du bas (z-30), sous les toasts (z-100).
        // Couleurs explicites pour garantir le contraste en mode sombre.
        content: 'z-[60] bg-white text-slate-900 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
      }
    },
    toast: {
      slots: {
        // Fond 100% opaque (sinon les toasts laissent voir le contenu derriere),
        // ring net et ombre portee pour un rendu propre en clair comme en sombre.
        root: 'bg-white dark:bg-[#1a1c1c] ring-1 ring-slate-200 dark:ring-white/10 shadow-xl backdrop-blur-none',
        title: 'text-slate-900 dark:text-white font-semibold',
        description: 'text-slate-600 dark:text-slate-300'
      }
    }
  }
})
