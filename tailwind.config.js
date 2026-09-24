const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

/**
 * Brand scales are CSS variables, set per partner at render time (see
 * src/lib/theme.ts and convex/lib/partners.ts). Values are "r g b" channels
 * so opacity modifiers like `shadow-accent-500/30` keep working.
 */
function brandScale(name) {
  return Object.fromEntries(
    SHADES.map((shade) => [shade, `rgb(var(--${name}-${shade}) / <alpha-value>)`]),
  );
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Partner brand colours: headings, tabs, links…
        primary: brandScale('primary'),
        // …and call-to-action buttons.
        accent: brandScale('accent'),
        // Text on primary-500 / accent-500 — white or near-black, whichever
        // reads (a partner may bring a light brand colour).
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        // Brand colour for text on white: the base, or the first shade dark
        // enough to read when the base is too light (e.g. yellow).
        'primary-ink': 'rgb(var(--primary-ink) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
};
