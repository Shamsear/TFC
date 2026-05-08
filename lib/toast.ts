/**
 * Simple toast notification utility for client-side error and success messages
 * Can be replaced with a more sophisticated library like react-hot-toast or sonner
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  duration?: number
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'
}

class ToastManager {
  private container: HTMLElement | null = null
  private toasts: Map<string, HTMLElement> = new Map()

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'toast-container'
      this.container.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
      `
      document.body.appendChild(this.container)
    }
    return this.container
  }

  private createToast(message: string, type: ToastType): HTMLElement {
    const toast = document.createElement('div')
    toast.style.cssText = `
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
      word-wrap: break-word;
    `

    // Set colors based on type
    const colors = {
      success: { bg: '#10b981', text: '#ffffff' },
      error: { bg: '#ef4444', text: '#ffffff' },
      warning: { bg: '#f59e0b', text: '#ffffff' },
      info: { bg: '#3b82f6', text: '#ffffff' }
    }

    const color = colors[type]
    toast.style.backgroundColor = color.bg
    toast.style.color = color.text

    toast.textContent = message

    return toast
  }

  show(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
    const { duration = 5000 } = options
    const container = this.ensureContainer()
    const toast = this.createToast(message, type)
    const id = `toast-${Date.now()}-${Math.random()}`

    container.appendChild(toast)
    this.toasts.set(id, toast)

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(id)
    }, duration)

    return id
  }

  remove(id: string) {
    const toast = this.toasts.get(id)
    if (toast) {
      toast.style.animation = 'slideOut 0.3s ease-in'
      setTimeout(() => {
        toast.remove()
        this.toasts.delete(id)
      }, 300)
    }
  }

  success(message: string, options?: ToastOptions) {
    return this.show(message, 'success', options)
  }

  error(message: string, options?: ToastOptions) {
    return this.show(message, 'error', options)
  }

  warning(message: string, options?: ToastOptions) {
    return this.show(message, 'warning', options)
  }

  info(message: string, options?: ToastOptions) {
    return this.show(message, 'info', options)
  }
}

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)
}

export const toast = new ToastManager()
