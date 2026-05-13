import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0F0F1A',
        parchment: '#FAF8F2',
        gold: '#C9A84C',
        cream: '#E8E0CC',
        ink: '#1C1A14',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        mono: ['var(--font-inter)', 'monospace'],
      },
      boxShadow: {
        parchment: '0 4px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(201,168,76,0.1)',
        glow: '0 0 24px rgba(201,168,76,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
