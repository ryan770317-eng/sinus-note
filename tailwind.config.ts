import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#F5F1EB',
        surface: '#F5F1EB',
        card:    '#EDE8E0',
        ink:     '#1A1A18',
        'ink-2': '#6B6459',
        'ink-3': '#6B6459',
        'ink-4': '#D6CFC4',
        accent:  '#8B6F52',
        border:  '#D6CFC4',
        error:   '#a06050',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans:  ['"Noto Sans TC"', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        full: '0px',
      },
      maxWidth: {
        content: '960px',
      },
      letterSpacing: {
        label: '0.15em',
        wide: '0.18em',
        wider: '0.22em',
      },
    },
  },
  plugins: [],
} satisfies Config;
