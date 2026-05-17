import { useReducer, useCallback } from 'react'
import { AsyncState } from '../types'
import { assertNever } from '../types'
import { CancellationError } from '../lib/async'

type Action<T> =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: T }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' }

function asyncReducer<T>(state: AsyncState<T>, action: Action<T>): AsyncState<T> {
  switch (action.type) {
    case 'LOADING': return { status: 'loading' }
    case 'SUCCESS': return { status: 'success', data: action.payload }
    case 'ERROR':   return { status: 'error', error: action.payload }
    case 'RESET':   return { status: 'idle' }
    default:        return assertNever(action, 'Unhandled action type')
  }
}

export function useAsyncState<T>(): {
  state: AsyncState<T>
  execute: (fn: () => Promise<T>) => Promise<void>
  reset: () => void
} {
  // useReducer instead of multiple useState — prevents impossible states like
  // { loading: true, error: true } which multiple booleans allow
  const [state, dispatch] = useReducer(
    asyncReducer as (state: AsyncState<T>, action: Action<T>) => AsyncState<T>,
    { status: 'idle' }
  )

  // execute never throws — all errors are caught and put into state
  // Components should never need try/catch when calling execute()
  // The error surface is always state.error, not a thrown exception
  const execute = useCallback(async (fn: () => Promise<T>) => {
    dispatch({ type: 'LOADING' })
    try {
      const result = await fn()
      dispatch({ type: 'SUCCESS', payload: result })
    } catch (err) {
      // Cancellation is intentional — reset to idle, not error
      if (err instanceof CancellationError) {
        dispatch({ type: 'RESET' })
        return
      }
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      dispatch({ type: 'ERROR', payload: message })
    }
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return { state, execute, reset }
}