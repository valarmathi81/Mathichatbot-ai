/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#080916',
        'midnight-2': '#0b0d1f',
        'midnight-3': '#11132b',
        neon: {
          purple: '#762BFF',
          blue: '#2563FF',
          cyan: '#00D9FF',
          pink: '#FF42B3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-glow':
          'linear-gradient(rgba(118,43,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(118,43,255,0.06) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '44px 44px',
      },
      animation: {
        'orb-rotate': 'orbRotate 18s linear infinite',
        'orb-pulse': 'orbPulse 4s ease-in-out infinite',
        'orb-float': 'orbFloat 7s ease-in-out infinite',
        'spin-slow': 'spin 14s linear infinite',
        'spin-rev': 'spinRev 20s linear infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
        'marquee': 'marquee 26s linear infinite',
      },
      keyframes: {
        orbRotate: { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        spinRev: { '0%': { transform: 'rotate(360deg)' }, '100%': { transform: 'rotate(0deg)' } },
        orbPulse: {
          '0%,100%': { opacity: '0.85', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        orbFloat: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 22px rgba(118,43,255,0.35), 0 0 60px rgba(38,99,255,0.2)' },
          '50%': { boxShadow: '0 0 34px rgba(118,43,255,0.55), 0 0 90px rgba(0,217,255,0.3)' },
        },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
    },
  },
  plugins: [],
};
