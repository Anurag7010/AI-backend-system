import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAbortController } from '../../hooks/useAbortController'

describe('useAbortController', () => {

  it('initial signal is not aborted', () => {
    // Proving controller starts in clean state — signal is usable on mount
    const { result } = renderHook(() => useAbortController())
    expect(result.current.signal.aborted).toBe(false)
  })

  it('abort() aborts the signal', () => {
    // Proving abort() correctly triggers the underlying AbortController
    const { result } = renderHook(() => useAbortController())

    act(() => { result.current.abort() })

    expect(result.current.signal.aborted).toBe(true)
  })

  it('reset() after abort gives a fresh unaborted signal', () => {
    // Proving reset() creates a genuinely new controller.
    // An aborted signal cannot be un-aborted — reset() is the only way
    // to get a usable signal after abort() is called.
    const { result } = renderHook(() => useAbortController())

    // Hold reference to the original signal before reset
    const originalSignal = result.current.signal

    act(() => { result.current.abort() })
    expect(originalSignal.aborted).toBe(true)

    act(() => { result.current.reset() })

    // New signal is fresh
    expect(result.current.signal.aborted).toBe(false)
    // Old signal reference is still aborted — reset does not clear it
    expect(originalSignal.aborted).toBe(true)
    // They are different signal objects
    expect(result.current.signal).not.toBe(originalSignal)
  })

  it('automatically aborts signal on unmount', () => {
    // Proving cleanup fires on unmount and cancels any in-flight requests.
    // Without this: a fetch started in a component could resolve after unmount,
    // call setState on an unmounted component, and cause a React warning or stale update.
    const { result, unmount } = renderHook(() => useAbortController())

    const signal = result.current.signal
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })

})