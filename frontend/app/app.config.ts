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
    }
  }
})
