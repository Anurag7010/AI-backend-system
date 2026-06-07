import type { Config } from 'tailwindcss'

const config: Config = {
  // 'class' strategy: dark mode toggled by adding 'dark' class to <html>.
  // Alternative 'media' follows system preference automatically — no programmatic control.
  // We use 'class' so a theme toggle button can override system preference.
  darkMode: 'class',

  // CRITICAL: Tailwind scans these files to find used class names.
  // Any class used in a file NOT listed here will be purged in production builds.
  // The class will appear to work in development (full CSS included) but vanish in prod.
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.css',
  ],

  theme: {
    // extend: adds to Tailwind's defaults without removing them.
    // Using theme: {} (without extend) would REPLACE defaults — losing all built-in utilities.
    // We almost always want extend unless we are intentionally overriding Tailwind defaults.
    extend: {
      colors: {
        // Ember Dusk palette — primary design system
        'ember-black': '#171B1F',
        'forge-dark':  '#232830',
        'stone-mid':   '#4C5560',
        'ash-gray':    '#7A7068',
        'ember':       '#D4572A',
        'parchment':   '#EDE8E0',

        // Neutral palette — backgrounds, borders, text.
        // We define our own instead of using Tailwind's gray to maintain full control.
        neutral: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },

        // Brand palette — primary actions, links, focus rings.
        // Separate from info blue — brand blue is for CTAs, info blue is for status messages.
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },

        // Semantic colors — convey meaning (success, warning, error).
        // Defined with just 50/500/600/700 — the variants actually used in practice.
        // Full 50-950 scale is overkill for semantic colors.
        success: {
          50:  '#f0fdf4',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50:  '#fffbeb',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50:  '#fef2f2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },

        // Surface + semantic colors via CSS custom properties.
        // CSS vars change in dark mode automatically — one class works in both modes.
        background:                  'hsl(var(--background))',
        foreground:                  'hsl(var(--foreground))',
        card:                        'hsl(var(--card))',
        'card-foreground':           'hsl(var(--card-foreground))',
        popover:                     'hsl(var(--popover))',
        'popover-foreground':        'hsl(var(--popover-foreground))',
        muted:                       'hsl(var(--muted))',
        'muted-foreground':          'hsl(var(--muted-foreground))',
        accent:                      'hsl(var(--accent))',
        'accent-foreground':         'hsl(var(--accent-foreground))',
        border:                      'hsl(var(--border))',
        input:                       'hsl(var(--input))',
        ring:                        'hsl(var(--ring))',
        primary:                     'hsl(var(--primary))',
        'primary-foreground':        'hsl(var(--primary-foreground))',
        secondary:                   'hsl(var(--secondary))',
        'secondary-foreground':      'hsl(var(--secondary-foreground))',
        destructive:                 'hsl(var(--destructive))',
        'destructive-foreground':    'hsl(var(--destructive-foreground))',
        'brand-css':                 'hsl(var(--brand))',
        'brand-foreground':          'hsl(var(--brand-foreground))',
        'brand-muted-css':           'hsl(var(--brand-muted))',
        'success-css':               'hsl(var(--success))',
        'success-foreground':        'hsl(var(--success-foreground))',
        'success-muted-css':         'hsl(var(--success-muted))',
        'warning-css':               'hsl(var(--warning))',
        'warning-foreground':        'hsl(var(--warning-foreground))',
        'warning-muted-css':         'hsl(var(--warning-muted))',
      },

      fontFamily: {
        // var(--font-almarai) is set by next/font/google in layout.tsx.
        sans: ['var(--font-almarai)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Menlo', 'Monaco', 'monospace'],
        // Cormorant Garamond — display/headings
        cormorant: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },

      fontSize: {
        // Tailwind's default scale covers xs through 9xl.
        // We add display sizes with preset line-height and weight.
        // Using a tuple [size, { lineHeight, fontWeight }] sets all three in one class.
        'display-sm': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }],
        'display-md': ['2.25rem',  { lineHeight: '2.5rem',  fontWeight: '600' }],
        'display-lg': ['3rem',     { lineHeight: '1',        fontWeight: '700' }],
      },

      borderRadius: {
        // Semantic radius names — match the design token decisions:
        // sm: inputs, badges (tight radius)
        // md: buttons, cards (standard)
        // lg: modals, drawers (prominent)
        // xl/2xl: large panels, hero sections
        sm:   '0.25rem',
        md:   '0.5rem',
        lg:   '0.75rem',
        xl:   '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },

      boxShadow: {
        xs:  '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        sm:  '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        md:  '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        lg:  '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        xl:  '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
      },

      transitionDuration: {
        // Animation duration affects perceived responsiveness.
        // fast: hover states, micro-interactions (feels instant)
        // normal: most UI transitions (feels responsive)
        // slow: modals, drawers, page transitions (feels deliberate)
        fast:   '100ms',
        normal: '200ms',
        slow:   '300ms',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        // Combines movement and fade — more natural than either alone
        'slide-in-from-bottom': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },

      animation: {
        'fade-in':        'fade-in 200ms ease-out',
        'fade-out':       'fade-out 200ms ease-in',
        'slide-in-right': 'slide-in-from-right 300ms ease-out',
        'slide-in-bottom': 'slide-in-from-bottom 200ms ease-out',
      },

      zIndex: {
        // Explicit z-index scale prevents z-index wars (z-index: 9999 etc.).
        // Every layer has a name — no magic numbers.
        base:            '0',
        dropdown:        '10',
        sticky:          '20',
        'modal-backdrop': '30',
        modal:           '40',
        toast:           '50',
        tooltip:         '60',
      },
    },
  },

  plugins: [
    // @tailwindcss/typography: adds prose classes for rendering markdown/AI response content.
    // Without it: AI responses (which are markdown) render as unstyled plain text.
    require('@tailwindcss/typography'),

    // @tailwindcss/forms: resets browser default form styles consistently across browsers.
    // Without it: inputs look different on Chrome vs Safari vs Firefox.
    require('@tailwindcss/forms'),
  ],
}

export default config