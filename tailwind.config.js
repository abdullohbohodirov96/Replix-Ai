/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep:     '#09090f',
          base:     '#0f0f17',
          card:     '#141420',
          elevated: '#1a1a28',
          border:   '#22223a',
          hover:    '#1e1e30',
        },
        brand: {
          orange:     '#f97316',
          'orange-hover': '#ea6c0d',
          'orange-dim':   'rgba(249,115,22,0.1)',
          'orange-subtle':'rgba(249,115,22,0.06)',
        },
        text: {
          primary:   '#e2e2ee',
          secondary: '#9494c0',
          muted:     '#55557a',
          accent:    '#f97316',
        },
        status: {
          success: '#22c55e',
          warning: '#eab308',
          danger:  '#ef4444',
          info:    '#3b82f6',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)',  'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-syne)',   'sans-serif'],
        mono:    ['var(--font-mono)',   'monospace'],
        inter:   ['var(--font-inter)',  'sans-serif'],
        data:    ['var(--font-mono)',   'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['13px', { lineHeight: '20px' }],
        'base':['14px', { lineHeight: '22px' }],
        'lg':  ['16px', { lineHeight: '24px' }],
        'xl':  ['18px', { lineHeight: '28px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
        '4xl': ['30px', { lineHeight: '36px' }],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'panel': '0 4px 24px rgba(0,0,0,0.5)',
        'orange':'0 4px 16px rgba(249,115,22,0.15)',
        'orange-sm': '0 2px 8px rgba(249,115,22,0.12)',
        'inset-top': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn  0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'fade-up':    'fadeUp  0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeUp: {
          '0%':   { transform: 'translateY(6px)',  opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 .5h32M.5 0v32' stroke='%2322223a' stroke-width='0.4'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
