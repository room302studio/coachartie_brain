module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        // Nuxt specific globals
        defineNuxtConfig: 'readonly',
        useRuntimeConfig: 'readonly',
        navigateTo: 'readonly',
        useState: 'readonly',
        useFetch: 'readonly',
        useRoute: 'readonly',
        useRouter: 'readonly',
        useHead: 'readonly',
        useSeoMeta: 'readonly',
        useAsyncData: 'readonly',
        useNuxtApp: 'readonly',
        definePageMeta: 'readonly',
        defineEventHandler: 'readonly',
        $fetch: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      'dist/**',
      '.turbo/**',
      '**/*.vue',
      'anime.esm.js',
    ],
  },
];
