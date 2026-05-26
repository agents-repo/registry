import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
import jsonc from 'eslint-plugin-jsonc';
import * as jsoncParser from 'jsonc-eslint-parser';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      ecmaVersion: 'latest',
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      indent: ['error', 2, { SwitchCase: 1 }],
      'sonarjs/cognitive-complexity': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
    },
  },
  {
    files: ['**/*.{json,jsonc}'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc,
    },
    rules: {
      'jsonc/indent': ['error', 2],
    },
  },
];
