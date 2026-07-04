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

const KEY_PREFIX = 'prometheon_onboarding'

// Scope by user: a shared browser must not let user A's completed onboarding
// hide the flow from user B's brand-new account.
function keyFor(email?: string | null): string {
  return email ? `${KEY_PREFIX}:${email}` : KEY_PREFIX
}

/** Read onboarding state from localStorage (client-side only). */
export function getLocalOnboardingState(email?: string | null): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(keyFor(email))
    if (!raw) return DEFAULT_STATE
    return JSON.parse(raw) as OnboardingState
  } catch {
    return DEFAULT_STATE
  }
}

/** Write onboarding state to localStorage. */
export function setLocalOnboardingState(
  state: Partial<OnboardingState>,
  email?: string | null
): void {
  if (typeof window === 'undefined') return
  const current = getLocalOnboardingState(email)
  localStorage.setItem(keyFor(email), JSON.stringify({ ...current, ...state }))
}

function _postComplete(token: string | null): void {
  fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => null)
}

/** Mark onboarding as complete locally and persist to server. */
export async function completeOnboarding(
  token?: string | null,
  email?: string | null
): Promise<void> {
  setLocalOnboardingState({ step: 'complete' }, email)
  _postComplete(token ?? null)
}

/** Skip onboarding locally and persist to server. */
export async function skipOnboarding(
  token?: string | null,
  email?: string | null
): Promise<void> {
  setLocalOnboardingState({ step: 'complete', skipped: true }, email)
  _postComplete(token ?? null)
}

/** Returns true if onboarding should be shown. */
export function shouldShowOnboarding(state: OnboardingState, serverCompleted: boolean): boolean {
  if (serverCompleted) return false
  return state.step !== 'complete'
}
