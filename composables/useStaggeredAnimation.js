import { animate, stagger } from '~/anime.esm.js'
import { onMounted, onUnmounted, ref } from 'vue'

export function useStaggeredAnimation() {
  const animatedItems = ref([])

  /**
   * Set up a staggered animation for a list of elements
   * @param {String} selector - CSS selector for items to animate
   * @param {Object} options - Animation options
   */
  function animateStaggered(selector, options = {}) {
    // Super simplified animation - just basic fade in with stagger
    const targets = document.querySelectorAll(selector)

    if (targets.length === 0) return

    // Make visible
    targets.forEach((el) => {
      el.style.opacity = 1
      if (options.translateY) {
        el.style.transform = 'translateY(0)'
      }
      if (options.translateX) {
        el.style.transform = 'translateX(0)'
      }
    })

    // Return empty object as placeholder
    return {}
  }

  // Clean up on unmount
  onUnmounted(() => {
    animatedItems.value = []
  })

  return {
    animateStaggered
  }
}
