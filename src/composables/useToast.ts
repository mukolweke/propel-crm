import { ref } from 'vue'
import type { ToastMessage } from '@/types'
import { generateId } from '@/utils/helpers'

const toasts = ref<ToastMessage[]>([])

export function useToast() {
  function show(toast: Omit<ToastMessage, 'id'>) {
    const id = generateId()
    toasts.value.push({ ...toast, id })
    setTimeout(() => dismiss(id), 4000)
  }

  function success(title: string, message?: string) {
    show({ type: 'success', title, message })
  }

  function error(title: string, message?: string) {
    show({ type: 'error', title, message })
  }

  function info(title: string, message?: string) {
    show({ type: 'info', title, message })
  }

  function warning(title: string, message?: string) {
    show({ type: 'warning', title, message })
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, show, success, error, info, warning, dismiss }
}
