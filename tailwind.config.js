/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Enterprise palette
        bg: {
          DEFAULT: '#ffffff',
          subtle: '#fafafa',
          muted: '#f5f5f5',
        },
        ink: {
          DEFAULT: '#0f0f0f',
          secondary: '#525252',
        },
        muted: '#737373',
        line: {
          DEFAULT: '#e5e5e5',
          subtle: '#f0f0f0',
        },
        accent: {
          DEFAULT: '#ff6b35',
          hover: '#e55a2b',
          subtle: '#fff5f0',
          dark: '#cc4a1a',
        },
        success: '#16a34a',
        // Topic landing page palette (calm blue + magic gold)
        calm: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        magic: {
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Legacy compatibility
        primary: '#ff6b35',
        'primary-hover': '#e55a2b',
        secondary: '#737373',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        container: '12px',
        chip: '999px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        hero: ['2rem', { letterSpacing: '-0.025em' }],
        'body-tight': ['0.9375rem', {}],
      },
      maxWidth: {
        content: '1100px',
        article: '740px',
        toc: '220px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      width: {
        toc: '220px',
      },
      spacing: {
        section: '2rem',
      },
    },
  },
  plugins: [],
};
