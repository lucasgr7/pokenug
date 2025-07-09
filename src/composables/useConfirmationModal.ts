import { ref } from 'vue'

interface ConfirmationModalConfig {
  title: string
  message: string
  subtitle?: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
}

export function useConfirmationModal() {
  const isVisible = ref(false)
  const config = ref<ConfirmationModalConfig>({
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  })
  
  let resolvePromise: ((value: boolean) => void) | null = null

  const showModal = (modalConfig: ConfirmationModalConfig): Promise<boolean> => {
    config.value = { ...modalConfig }
    isVisible.value = true
    
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  const confirm = () => {
    isVisible.value = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  const cancel = () => {
    isVisible.value = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  return {
    isVisible,
    config,
    showModal,
    confirm,
    cancel
  }
}
