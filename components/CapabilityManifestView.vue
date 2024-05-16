<template>
  <div class="p-2 ">
    <div class="flex">
      <div class="w-1/4 p-2">
        <h3 class="text-xl font-bold mb-2">Capabilities</h3>
        <ul>
          <li v-for="(methods, capability) in manifestData" :key="capability">
            <a :href="`#capability-${capability}`" class="text-blue-500 hover:underline">{{ capability }}</a>
          </li>
        </ul>
      </div>
      <div class="w-3/4">
        <div v-for="(methods, capability) in manifestData" :key="capability" class=" p-4 mb-4"
          :id="`capability-${capability}`">
          <h2 class="text-6xl font-bold mb-2 p-1" :ref="`capability-${capability}`">{{ capability }}</h2>

          <div v-for="method in methods" :key="method.name" class="mt-2 ml-2 max-w-prose ">
            <span class="text-gray-100 font-bold text-lg">{{ method.name }}</span>
            <span class="text-gray-100 block my-4">{{ method.description }}</span>

            <div v-for="params in method.parameters" :key="params.name" class="mt-2 ml-2 prose">
              <span class="text-gray-400 font-bold">{{ params.name }}</span>
              <span class="text-gray-600 ml-2 mt-2">{{ params.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import manifestData from '~/public/_manifest.json';

const capabilityRefs = ref({});

const scrollToCapability = (capability) => {
  const capabilityElement = capabilityRefs.value[`capability-${capability}`];
  if (capabilityElement) {
    capabilityElement.scrollIntoView({ behavior: 'smooth' });
  }
};
</script>