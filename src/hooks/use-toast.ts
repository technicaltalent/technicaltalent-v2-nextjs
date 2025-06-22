import { useState } from 'react'

interface Toast {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (toast: Toast) => {
    // For now, just use console.log and alert for simplicity
    // In a real app, you'd want to use a proper toast library like react-hot-toast
    console.log('Toast:', toast)
    
    if (toast.variant === 'destructive') {
      alert(`Error: ${toast.title}\n${toast.description || ''}`)
    } else {
      alert(`${toast.title}\n${toast.description || ''}`)
    }
  }

  return { toast }
} 