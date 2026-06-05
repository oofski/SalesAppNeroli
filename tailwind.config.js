/** @type {import('tailwindcss').Config} */
// Neroli brand design tokens — palette and typography per the Build Plan (§4.2, §4.3).
// Apple-inspired structure, Aveda-inspired warmth: forest greens, warm stone, generous space.
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#2C3E35', // primary headings, active nav, primary buttons
          mid: '#4A6741', // secondary accents, hover, chart fills
          light: '#E8EDE6', // page backgrounds, card fills, tags
          warm: '#8B7355', // warm tan secondary accent
          stone: '#D4CFC8' // borders, dividers, row separators
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#6B6864'
        },
        surface: {
          white: '#FFFFFF',
          gray: '#F5F4F2'
        },
        status: {
          green: '#3A7A4A',
          amber: '#B8871A',
          red: '#C0392B'
        },
        badge: {
          'green-bg': '#E8F5E9',
          'green-fg': '#3A7A4A',
          'amber-bg': '#FFF8E1',
          'amber-fg': '#B8871A',
          'red-bg': '#FDECEA',
          'red-fg': '#C0392B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      fontSize: {
        display: ['28px', { lineHeight: '34px', fontWeight: '600' }],
        h1: ['22px', { lineHeight: '28px', fontWeight: '600' }],
        h2: ['17px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '21px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        label: ['11px', { lineHeight: '14px', fontWeight: '500', letterSpacing: '0.04em' }]
      },
      borderRadius: {
        card: '12px',
        badge: '6px',
        modal: '16px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(44, 62, 53, 0.04), 0 1px 3px rgba(44, 62, 53, 0.06)',
        elevated: '0 8px 28px rgba(44, 62, 53, 0.12)',
        modal: '0 24px 60px rgba(26, 26, 26, 0.22)'
      }
    }
  },
  plugins: []
}
