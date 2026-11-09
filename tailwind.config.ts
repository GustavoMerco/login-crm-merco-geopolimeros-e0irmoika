/* Tailwind config for the frontend react app. This is where the app theme should be defined: https://v2.tailwindcss.com/docs/configuration. */
import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Manrope', 'Inter var', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
      colors: {
        // Design system Mercogeo: tokens com tema claro/escuro (src/main.css).
        mg: {
          'canvas': 'rgb(var(--mg-canvas) / <alpha-value>)',
          'surface': 'rgb(var(--mg-surface) / <alpha-value>)',
          'surface-2': 'rgb(var(--mg-surface-2) / <alpha-value>)',
          'ink': 'rgb(var(--mg-ink) / <alpha-value>)',
          'muted': 'rgb(var(--mg-muted) / <alpha-value>)',
          'line': 'rgb(var(--mg-line) / <alpha-value>)',
          'line-strong': 'rgb(var(--mg-line-strong) / <alpha-value>)',
          'brand': 'rgb(var(--mg-brand) / <alpha-value>)',
          'brand-strong': 'rgb(var(--mg-brand-strong) / <alpha-value>)',
          'brand-fill': 'rgb(var(--mg-brand-fill) / <alpha-value>)',
          'brand-soft': 'rgb(var(--mg-brand-soft) / <alpha-value>)',
          'brand-soft-2': 'rgb(var(--mg-brand-soft-2) / <alpha-value>)',
          'action': 'rgb(var(--mg-action) / <alpha-value>)',
          'action-hover': 'rgb(var(--mg-action-hover) / <alpha-value>)',
          'accent': 'rgb(var(--mg-accent) / <alpha-value>)',
          'sidebar': 'rgb(var(--mg-sidebar) / <alpha-value>)',
          'sidebar-ink': 'rgb(var(--mg-sidebar-ink) / <alpha-value>)',
          'ok': 'rgb(var(--mg-ok) / <alpha-value>)',
          'ok-bg': 'rgb(var(--mg-ok-bg) / <alpha-value>)',
          'warn': 'rgb(var(--mg-warn) / <alpha-value>)',
          'warn-bg': 'rgb(var(--mg-warn-bg) / <alpha-value>)',
          'warn-line': 'rgb(var(--mg-warn-line) / <alpha-value>)',
          'crit': 'rgb(var(--mg-crit) / <alpha-value>)',
          'crit-bg': 'rgb(var(--mg-crit-bg) / <alpha-value>)',
          'crit-line': 'rgb(var(--mg-crit-line) / <alpha-value>)',
          'neutral': 'rgb(var(--mg-neutral) / <alpha-value>)',
          'neutral-bg': 'rgb(var(--mg-neutral-bg) / <alpha-value>)',
        },
        merco: {
          canvas: '#F6F8F7',
          surface: '#FFFFFF',
          ink: '#0F1F1C',
          muted: '#5B6B66',
          line: '#E1E8E5',
          emerald: {
            DEFAULT: '#10B981',
            hover: '#059669',
            pressed: '#047857',
            deep: '#064E3B',
            darkest: '#022C22',
            light: '#34D399',
            accent: '#52E0A4',
          },
          orange: {
            DEFAULT: '#F97316',
            light: '#FB923C',
            dark: '#EA580C',
          },
          error: {
            DEFAULT: '#DC2626',
            bg: '#FEF2F2',
          },
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        elevation: '0 4px 20px rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
