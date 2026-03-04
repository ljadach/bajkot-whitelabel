import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'eslint.config.js',
      'convex/_generated',
      'postcss.config.js',
      'tailwind.config.js',
      'vite.config.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json', './convex/tsconfig.json'],
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // All of these overrides ease getting into
      // TypeScript, and can be removed for stricter
      // linting down the line.

      // Only warn on unused variables, and ignore variables starting with `_`
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],

      // Allow escaping the compiler
      '@typescript-eslint/ban-ts-comment': 'error',

      // Warn on explicit `any`s (convex/ override below suppresses generated types)
      '@typescript-eslint/no-explicit-any': 'warn',

      // START: Allow implicit `any`s
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // END: Allow implicit `any`s

      // Allow async functions without await
      // for consistency (esp. Convex `handler`s)
      '@typescript-eslint/require-await': 'off',
    },
  },
  // Route modules export meta/loader/action alongside default component — this is expected
  {
    files: ['src/routes/**/*.{ts,tsx}', 'src/entry.*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Convex override: generated types use `any` extensively
  {
    files: ['convex/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Public pages: enforce hooks, no direct auth imports, file size
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'MemberExpression[object.name="pathname"][property.name="match"]',
          message: 'Use useLangFromUrl() hook — not pathname.match().',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['convex/*', 'convex/react', '@clerk/*', '@clerk/clerk-react'],
              message: 'Use lazy-loaded wrappers instead of direct imports.',
            },
          ],
        },
      ],
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  // HomePage exception: uses <SignIn> from Clerk for auth conditional rendering
  {
    files: ['src/pages/HomePage.tsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // App.tsx file size limit
  {
    files: ['src/App.tsx'],
    rules: {
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
);
