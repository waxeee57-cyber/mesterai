import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F0F',
        surface: '#1A1A1A',
        surface2: '#242424',
        accent: '#F97316',
        'accent-hover': '#FB923C',
        'accent-muted': '#F9731620',
        success: '#22C55E',
        error: '#EF4444',
        warning: '#EAB308',
        border: '#2A2A2A',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '16px', btn: '12px', input: '8px' },
    },
  },
  plugins: [],
};

export default config;
