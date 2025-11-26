import pkg from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devServer: {
    port: 47325,
    host: '0.0.0.0'
  },
  app: {
    head: {
      title: pkg.name,
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: pkg.version }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  ssr: false, // SPA mode
  devtools: { enabled: true },
  modules: [
    '@vueuse/nuxt',
    ['@nuxtjs/google-fonts', {
      families: {
        Figtree: [400, 500, 700, 800]
      }
    }]
  ],
  runtimeConfig: {
    public: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PRODUCTION: process.env.PRODUCTION
    }
  },
  nitro: {
    preset: 'node-server'
  },
  routeRules: {
    '/**': { prerender: false }
  },
  vite: {
    build: {
      rollupOptions: {
        external: ['sqlite3', 'sqlite', 'better-sqlite3']
      }
    },
    optimizeDeps: {
      exclude: ['sqlite3', 'sqlite', 'better-sqlite3']
    }
  }
})
