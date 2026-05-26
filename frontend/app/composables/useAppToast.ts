type AppToastTone = 'success' | 'error' | 'info' | 'warning'

type AppToastOptions = {
  title: string
  description?: string
  tone?: AppToastTone
}

const toastIcons: Record<AppToastTone, string> = {
  success: 'i-lucide-circle-check',
  error: 'i-lucide-circle-alert',
  info: 'i-lucide-info',
  warning: 'i-lucide-triangle-alert'
}

export function useAppToast() {
  const toast = useToast()

  function showToast({ title, description, tone = 'info' }: AppToastOptions) {
    toast.add({
      title,
      description,
      color: tone,
      icon: toastIcons[tone],
      duration: tone === 'error' ? 6500 : 3800
    })
  }

  return {
    success: (title: string, description?: string) => showToast({ title, description, tone: 'success' }),
    error: (title: string, description?: string) => showToast({ title, description, tone: 'error' }),
    info: (title: string, description?: string) => showToast({ title, description, tone: 'info' }),
    warning: (title: string, description?: string) => showToast({ title, description, tone: 'warning' })
  }
}
