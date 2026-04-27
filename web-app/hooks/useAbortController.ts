import { useRef, useEffect, useCallback } from 'react'

export function useAbortController(): {
  signal: AbortSignal
  abort: () => void
  reset: () => void
} {
  const controllerRef = useRef<AbortController>(new AbortController())

  // Abort on unmount — prevents state updates on unmounted components.
  // Without this: if a fetch is in-flight when the user navigates away,
  // the response arrives, calls setState on an unmounted component,
  // and React logs a warning. With abort: fetch rejects immediately on unmount.
  useEffect(() => {
    return () => {
      controllerRef.current.abort()
    }
  }, [])

  const abort = useCallback(() => {
    controllerRef.current.abort()
  }, [])

  // reset() creates a fresh controller after abort.
  // An aborted signal stays aborted forever — it cannot be reused.
  // After calling abort(), you must reset() before starting a new cancellable operation.
  const reset = useCallback(() => {
    controllerRef.current = new AbortController()
  }, [])

  // Return signal as a getter — always reflects the current controller
  // after a reset(), this returns the new signal automatically
  return {
    get signal() {
      return controllerRef.current.signal
    },
    abort,
    reset,
  }
}