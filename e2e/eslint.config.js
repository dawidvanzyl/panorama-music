import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import playwright from 'eslint-plugin-playwright';
import prettierConfig from 'eslint-config-prettier';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**'],
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      playwright,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...playwright.configs['flat/recommended'].rules,

      '@typescript-eslint/no-explicit-any': 'error',

      // Some assertions belong in a named helper rather than inline: where a
      // negative must always be read alongside a positive on the same surface,
      // keeping the pair in one function is what stops a scenario drifting
      // into asserting only the absence. Name those helpers here so the rule
      // still catches a test that genuinely asserts nothing.
      'playwright/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'expectWaitingListTabOffersOnlyTheAnchor',
            'expectEnrolModalOffersOnlyTheAnchor',
          ],
        },
      ],
    },
  },

  prettierConfig,
];
