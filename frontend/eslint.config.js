import architecture from './eslint-plugin-pm-architecture/index.js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'pm-architecture': architecture,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      '@typescript-eslint/no-explicit-any': 'error',

      'pm-architecture/no-fetch-in-components': 'error',
      'pm-architecture/no-dom-in-services': 'error',
      'pm-architecture/enforce-feature-boundaries': 'error',
    },
  },

  prettierConfig,
];