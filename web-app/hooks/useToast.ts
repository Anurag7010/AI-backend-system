'use client'

import React, { useReducer, useCallback, useContext, createContext, ReactNode } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id:           string
  variant:      ToastVariant
  title:        string
  description?: string
  duration?:    number
}

type ToastAction =
  | { type: 'ADD';     toast: Toast }
  | { type: 'DISMISS'; id: string }
  | { type: 'DISMISS_ALL' }

// useReducer instead of useState: toast state has multiple transitions
// (add, dismiss by id, dismiss all) that are cleaner as explicit action types.
// useState would require complex functional updates to handle id-based removal.
function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      // Cap at 5 — remove oldest if exceeded
      const next = [...state, action.toast]
      return next.length > 5 ? next.slice(next.length - 5) : next

    case 'DISMISS':
      return state.filter(t => t.id !== action.id)

    case 'DISMISS_ALL':
      return []
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

interface UseToastReturn {
  toasts:     Toast[]
  toast:      ((options: Omit<Toast, 'id'>) => string) & {
    success: (title: string, description?: string) => string
    error:   (title: string, description?: string) => string
    info:    (title: string, description?: string) => string
    warning: (title: string, description?: string) => string
  }
  dismiss:    (id: string) => void
  dismissAll: () => void
}

export function useToast(): UseToastReturn {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  const dismiss    = useCallback((id: string) => dispatch({ type: 'DISMISS', id }), [])
  const dismissAll = useCallback(() => dispatch({ type: 'DISMISS_ALL' }), [])

  const addToast = useCallback((options: Omit<Toast, 'id'>): string => {
    const id = generateId()
    dispatch({ type: 'ADD', toast: { ...options, id } })
    return id
  }, [])

  // Attach convenience methods to the toast function
  const toast = Object.assign(addToast, {
    success: (title: string, description?: string) =>
      addToast({ variant: 'success', title, description }),
    error: (title: string, description?: string) =>
      addToast({ variant: 'error', title, description }),
    info: (title: string, description?: string) =>
      addToast({ variant: 'info', title, description }),
    warning: (title: string, description?: string) =>
      addToast({ variant: 'warning', title, description }),
  })

  return { toasts, toast, dismiss, dismissAll }
}

// Context for app-wide toast access
interface ToastContextValue extends UseToastReturn {}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useToast()
  return React.createElement(
    ToastContext.Provider,
    { value },
    children
  )
}

// Hook for consuming toast from anywhere in the app
export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}