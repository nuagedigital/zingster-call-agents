/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        pulseRing: {
          '0%':   { transform: 'scale(1)',   opacity: '0.8' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        micPulse: {
          '0%':   { boxShadow: '0 0 0 0 rgba(239,68,68,0.7)' },
          '70%':  { boxShadow: '0 0 0 14px rgba(239,68,68,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        bounceDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)',    opacity: '0.5' },
          '30%':           { transform: 'translateY(-6px)', opacity: '1' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 1.5s infinite',
        micPulse:  'micPulse 1.5s infinite',
        fadeIn:    'fadeIn 0.3s ease',
        bounceDot: 'bounceDot 1.2s infinite',
      },
    },
  },
  plugins: [],
};