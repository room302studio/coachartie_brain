import pkg from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-02-25',
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
  // Global CSS
  css: ['~/assets/css/main.css'],
  // Fix for the chunkErrorEvent issue
  hooks: {
    'vite:extendConfig': (config) => {
      if (config.define) {
        config.define['chunkErrorEvent'] = 'undefined'
      }
    }
  },
  ssr: false, // for netlify deploy
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/supabase',
    '@vueuse/nuxt',
    '@nuxt/ui',
    '@nuxt/content',
    [
      '@nuxtjs/google-fonts',
      {
        families: {
          Figtree: [400, 500, 700, 800]
        }
      }
    ]
  ],
  content: {
    documentDriven: true
  },
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/memories', '/logs', '/queue', '/prompts', '/config']
    }
  },
  runtimeConfig: {
    // add the openai api key to the runtime config
    public: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PRODUCTION: process.env.PRODUCTION
    }
  }
})
