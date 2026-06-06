'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { setAccessToken } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

interface FormState {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M1 5l7 5 7-5" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  )
}

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l14 14M6.5 6.6A2 2 0 0110 10" />
      <path d="M4.4 4.5C2.6 5.7 1 8 1 8s3 5 7 5c1.4 0 2.7-.5 3.8-1.3" />
      <path d="M11 11.3C13 10 15 8 15 8s-3-5-7-5c-.9 0-1.7.2-2.5.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ email: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [shake, setShake] = useState(false)

  function validate(values: FormState): FormErrors {
    const errs: FormErrors = {}
    if (!values.email) errs.email = 'Email is required'
    else if (!validateEmail(values.email)) errs.email = 'Enter a valid email address'
    if (!values.password) errs.password = 'Password is required'
    else if (values.password.length < 8) errs.password = 'Password must be at least 8 characters'
    return errs
  }

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const updated = { ...form, [field]: e.target.value }
      setForm(updated)
      if (submitted) setErrors(validate(updated))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setServerError(null)

    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.message ?? 'Sign in failed')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        return
      }
      setAccessToken(data.accessToken)
      router.push('/dashboard')
    } catch {
      setServerError('Network error. Please try again.')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — hero column (desktop only) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-foreground flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative flex flex-col justify-between h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 28 28" fill="none" className="size-7 shrink-0">
              <rect width="28" height="28" rx="7" fill="hsl(217 91% 60%)" />
              <path d="M14 5c0 0-4 4-4 8 0 2.5 1.5 4 1.5 4s-.5-2 1-3.5c.5 2 2 3.5 2 5.5 1-1 1.5-2.5 1.5-4 1 1.5 1 3.5 1 3.5S19 17 19 14c0-3-2-5.5-2-5.5s.5 3-1.5 4C14.5 10 14 5 14 5z" fill="white" opacity="0.95" />
              <circle cx="14" cy="21" r="1.5" fill="white" opacity="0.6" />
            </svg>
            <span className="text-sm font-semibold text-white tracking-tight">PrometheonAI</span>
          </div>

          {/* Feature highlights — not hero metrics, actual product value */}
          <div className="space-y-6">
            {[
              {
                icon: (
                  <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                ),
                title: 'Instant document retrieval',
                body: 'Ask anything. Get precise answers from your uploaded PDFs, with source citations.',
              },
              {
                icon: (
                  <>
                    <path d="M13 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path d="M9 13s-5 2-5 5h14c0-3-5-5-5-5" strokeLinecap="round" />
                    <path d="M16 7l2 2 3-3" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ),
                title: 'Memory across sessions',
                body: 'PrometheonAI remembers your preferences and past conversations so you never repeat yourself.',
              },
              {
                icon: (
                  <>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 19v2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M1 12h2M19 12h2M4.22 19.78l1.42-1.42M16.36 7.64l1.42-1.42" strokeLinecap="round" />
                  </>
                ),
                title: 'Agent-powered reasoning',
                body: 'Complex multi-step queries are routed to the ReAct agent with web search and calculation tools.',
              },
            ].map(({ icon, title, body }, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <svg className="size-4 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    {icon}
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-white/60 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/40">PrometheonAI — Built with Next.js, Python, ChromaDB, and OpenAI.</p>
        </div>
      </div>

      {/* Right — form column */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className={cn('w-full max-w-sm', shake && 'animate-[shake_0.4s_ease-in-out]')}>
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <svg viewBox="0 0 24 24" fill="none" className="size-6 shrink-0">
              <rect width="24" height="24" rx="6" fill="hsl(217 91% 60%)" />
              <path d="M12 4c0 0-3.5 3.5-3.5 7 0 2 1.2 3.2 1.2 3.2s-.4-1.6.8-3c.4 1.6 1.6 2.8 1.6 4.5.8-.8 1.2-2 1.2-3.2.8 1.2.8 2.8.8 2.8s1.6-1.6 1.6-3.8c0-2.4-1.6-4.5-1.6-4.5s.4 2.4-1.2 3.2C12.4 7.5 12 4 12 4z" fill="white" opacity="0.95" />
              <circle cx="12" cy="18.5" r="1.2" fill="white" opacity="0.6" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">PrometheonAI</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to continue to PrometheonAI.{' '}
            <Link href="/register" className="font-medium text-brand-500 hover:text-brand-600 transition-colors">
              Create account
            </Link>
          </p>

          {/* Server error banner */}
          {serverError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3"
            >
              <svg className="size-4 shrink-0 text-destructive mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm-.75 4.5h1.5v5h-1.5v-5zm.75 7.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange('email')}
              error={submitted ? errors.email : undefined}
              placeholder="you@example.com"
              autoComplete="email"
              fullWidth
              leftElement={<MailIcon />}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange('password')}
              error={submitted ? errors.password : undefined}
              placeholder="Minimum 8 characters"
              autoComplete="current-password"
              fullWidth
              leftElement={<LockIcon />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="pointer-events-auto text-muted-foreground hover:text-foreground transition-colors"
                >
                  <EyeIcon off={showPassword} />
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-4px); }
          30%, 60%, 90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
