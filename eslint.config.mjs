import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next/**',
      '.next-*/**',
      'node_modules/**',
      'next-env.d.ts',
      'lib/database.types.ts',
      'supabase/**',
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // New in eslint-plugin-react-hooks 7 (Next.js 16). The existing UI components break these
      // rules in harmless ways; they are warnings until the redesign rewrites those components.
      // Back to errors once `npm run lint` shows none.
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/refs': 'error',
    },
  },
];

export default config;
