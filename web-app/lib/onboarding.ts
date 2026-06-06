export type OnboardingStep = 'welcome' | 'upload' | 'ask' | 'complete'

export interface OnboardingState {
  step: OnboardingStep
  documentId?: string
  documentName?: string
  skipped: boolean
}

const DEFAULT_STATE: OnboardingState = {
  step: 'welcome',
  skipped: false,
}

const KEY = 'docmind_onboarding'

/** Read onboarding state from localStorage (client-side only). */
export function getLocalOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    return JSON.parse(raw) as OnboardingState
  } catch {
    return DEFAULT_STATE
  }
}

/** Write onboarding state to localStorage. */
export function setLocalOnboardingState(state: Partial<OnboardingState>): void {
  if (typeof window === 'undefined') return
  const current = getLocalOnboardingState()
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...state }))
}

/** Mark onboarding as complete locally and persist to server. */
export async function completeOnboarding(): Promise<void> {
  setLocalOnboardingState({ step: 'complete' })
  await fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => null)
}

/** Skip onboarding locally and persist to server. */
export async function skipOnboarding(): Promise<void> {
  setLocalOnboardingState({ step: 'complete', skipped: true })
  await fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => null)
}

/** Returns true if onboarding should be shown. */
export function shouldShowOnboarding(state: OnboardingState, serverCompleted: boolean): boolean {
  if (serverCompleted) return false
  return state.step !== 'complete'
}
