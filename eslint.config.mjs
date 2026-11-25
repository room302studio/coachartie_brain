// Brain lint (2026-11-23). Bug-catching rules plus the house rules Artie uses; no formatting
// rules (layout is prettier's job). Type-aware typescript-eslint is deliberately left out so
// this stays fast and green; run a strict, type-aware pass by hand when you want the full
// list of findings.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'public/**', 'anime.esm.js', 'database.types.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { parser: tseslint.parser, sourceType: 'module' },
    },
    rules: {
      // EJ's rule: no ternaries anywhere. Use a named function or if/else.
      'no-ternary': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Nuxt auto-imports (useRoute, $fetch, defineEventHandler...) look undefined to core.
      'no-undef': 'off',
      // Nuxt pages and layouts are single words.
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'error',
      // Same as Artie: rows straight from SQLite are untyped.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Tailwind's config is CommonJS.
    files: ['tailwind.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
