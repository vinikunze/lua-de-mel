import next from 'eslint-config-next';
import nextTypescript from 'eslint-config-next/typescript';
import nextWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Configuração do ESLint (formato flat).
 * O `next lint` foi removido no Next 16 — o lint agora roda direto pelo eslint.
 */
const config = [
  ...next,
  ...nextWebVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/sw.js', 'next-env.d.ts'],
  },
  {
    rules: {
      // `any` implícito ou explícito é sinal de tipo faltando, não de flexibilidade.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
