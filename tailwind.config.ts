import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        'background-alt': '#12121A',
        foreground: '#FAFAFA',
        muted: {
          DEFAULT: '#1A1A24',
          foreground: '#71717A',
        },
        accent: {
          DEFAULT: '#F59E0B',
          foreground: '#0A0A0F',
          muted: 'rgba(245, 158, 11, 0.15)',
        },
        'surface-border': 'rgba(255, 255, 255, 0.08)',
        'surface-border-hover': 'rgba(255, 255, 255, 0.15)',
        card: {
          DEFAULT: 'rgba(26, 26, 36, 0.6)',
          solid: '#1A1A24',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(245, 158, 11, 0.15)',
        'glow-md': '0 0 40px rgba(245, 158, 11, 0.2)',
        'glow-lg': '0 0 60px rgba(245, 158, 11, 0.25)',
        'glow-btn': '0 0 20px rgba(245, 158, 11, 0.4)',
        'border-glow': '0 0 0 1px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.15)',
        'card-hover': '0 10px 15px rgba(0, 0, 0, 0.3)',
      },
    },
  },
} satisfies Config
