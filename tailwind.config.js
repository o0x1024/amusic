/** @type {import('tailwindcss').Config} */

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,ts,tsx}'],
  safelist: [
    'btn',
    'btn-primary',
    'btn-secondary',
    'btn-accent',
    'btn-neutral',
    'btn-outline',
    'btn-ghost',
    'btn-xs',
    'btn-sm',
    'btn-square',
    'tabs',
    'tabs-boxed',
    'tabs-bordered',
    'tabs-lifted',
    'tabs-sm',
    'tab',
    'tab-active',
    'tab-content'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }]
      }
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: true
  },
  darkMode: ['class', '[data-theme="dark"]']
}
