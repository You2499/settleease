
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'], // Add sans for utilities
        body: [
          'var(--font-geist-sans)',
          // System fonts for Apple devices
          '-apple-system',
          'BlinkMacSystemFont',
          // Geist for other systems
          'Geist Sans',
          // Fallbacks
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol'
        ],
        headline: [
          'var(--font-geist-sans)',
          // System fonts for Apple devices
          '-apple-system',
          'BlinkMacSystemFont',
          // Geist for other systems
          'Geist Sans',
          // Fallbacks
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        code: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
        // Override default mono to use system monospace fonts
        mono: [
          'var(--font-geist-mono)',
          // Apple system monospace
          'SF Mono',
          'ui-monospace',
          // macOS fallback
          'Monaco',
          // Geist monospace variants for non-Apple devices
          'Geist Mono',
          // Windows
          'Cascadia Code',
          'Consolas',
          // Linux
          'Liberation Mono',
          'Courier New',
          // Generic fallback
          'monospace'
        ],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
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
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontSize: {
        'display-hero': ['3rem', { lineHeight: '1.08', letterSpacing: '-0.06rem', fontWeight: '300' }],
        'display-section': ['2.25rem', { lineHeight: '1.17', letterSpacing: '-0.045rem', fontWeight: '300' }],
        'display-card': ['2rem', { lineHeight: '1.13', letterSpacing: '-0.04rem', fontWeight: '300' }],
        'body-large': ['1.25rem', { lineHeight: '1.35', letterSpacing: '0', fontWeight: '400' }],
        'body-default': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0.01125rem', fontWeight: '400' }],
        'body-standard': ['1rem', { lineHeight: '1.5', letterSpacing: '0.01rem', fontWeight: '400' }],
        'body-medium': ['1rem', { lineHeight: '1.5', letterSpacing: '0.01rem', fontWeight: '500' }],
        'nav': ['0.9375rem', { lineHeight: '1.4', letterSpacing: '0.009375rem', fontWeight: '500' }],
        'button': ['0.9375rem', { lineHeight: '1.47', letterSpacing: '0', fontWeight: '500' }],
        'caption': ['0.875rem', { lineHeight: '1.45', letterSpacing: '0.00875rem', fontWeight: '400' }],
        'small': ['0.8125rem', { lineHeight: '1.38', letterSpacing: '0', fontWeight: '500' }],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
