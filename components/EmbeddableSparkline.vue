<template>
  <div class="font-mono">
    <div ref="sparklineRef" class="w-full h-full min-h-[30px]"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as d3 from 'd3'

// Component props
const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => []
  },
  width: {
    type: Number,
    default: 100
  },
  height: {
    type: Number,
    default: 40
  },
  color: {
    type: String,
    default: '#14B8A6' // Default teal color
  },
  showAxis: {
    type: Boolean,
    default: true
  },
  lineWidth: {
    type: Number,
    default: 1.5
  },
  fillArea: {
    type: Boolean,
    default: true
  },
  xKey: {
    type: String,
    default: 'timestamp'
  },
  yKey: {
    type: String,
    default: 'count'
  }
})

// Margins for the chart
const margin = {
  top: 2,
  right: 2,
  bottom: props.showAxis ? 12 : 2,
  left: props.showAxis ? 20 : 2
}

// Computed inner dimensions
const innerWidth = computed(() => props.width - margin.left - margin.right)
const innerHeight = computed(() => props.height - margin.top - margin.bottom)

// Check if dark mode is active
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// Colors for light and dark mode
function getAxisColor() {
  return isDarkMode() 
    ? 'rgba(255, 255, 255, 0.3)' // Dark mode
    : 'rgba(0, 0, 0, 0.3)';      // Light mode
}

// Refs
const sparklineRef = ref(null)

// Watch for data changes
watch(() => props.data, renderSparkline, { deep: true })
watch(() => isDarkMode(), renderSparkline)

// Render sparkline
function renderSparkline() {
  if (!sparklineRef.value || !props.data.length) return
  
  // Clear previous chart
  d3.select(sparklineRef.value).selectAll('*').remove()
  
  // Set dimensions
  const width = innerWidth.value
  const height = innerHeight.value
  
  // Create SVG
  const svg = d3.select(sparklineRef.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  // X scale
  const x = d3.scaleLinear()
    .domain([0, props.data.length - 1])
    .range([0, width])
  
  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(props.data)])
    .range([height, 0])
  
  // Add X axis if needed
  if (props.showAxis) {
    const axisColor = getAxisColor();
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(3).tickSize(3))
      .attr('color', axisColor)
      .attr('font-size', '8px')
      .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
    
    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(3).tickSize(3))
      .attr('color', axisColor)
      .attr('font-size', '8px')
      .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
  }
  
  // Add line
  const line = d3.line()
    .x((d, i) => x(i))
    .y(d => y(d))
    .curve(d3.curveMonotoneX)
  
  svg.append('path')
    .datum(props.data)
    .attr('fill', 'none')
    .attr('stroke', props.color)
    .attr('stroke-width', props.lineWidth)
    .attr('d', line)
  
  // Add area if needed
  if (props.fillArea) {
    const area = d3.area()
      .x((d, i) => x(i))
      .y0(height)
      .y1(d => y(d))
      .curve(d3.curveMonotoneX)
    
    svg.append('path')
      .datum(props.data)
      .attr('fill', `${props.color}33`) // Add transparency
      .attr('d', area)
  }
  
  // Add dots for data points
  svg.selectAll('.dot')
    .data(props.data.filter(d => d[props.yKey] > 0))
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(props.data.indexOf(d)))
    .attr('cy', d => y(d[props.yKey]))
    .attr('r', 2)
    .attr('fill', props.color)
}

// Resize handler
function handleResize() {
  renderSparkline()
}

// Lifecycle hooks
onMounted(() => {
  renderSparkline()
  window.addEventListener('resize', handleResize)
  
  // Set up a MutationObserver to watch for dark mode class changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class' && 
          mutation.target === document.documentElement) {
        renderSparkline();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Clean up
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    observer.disconnect();
  });
})
</script>

<style scoped>
/* D3 styling */
:deep(.domain),
:deep(.tick line) {
  stroke: rgba(255, 255, 255, 0.2);
}

:deep(text) {
  fill: rgba(255, 255, 255, 0.55);
}
</style> 