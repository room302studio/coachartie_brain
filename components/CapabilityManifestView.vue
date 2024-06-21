<template>
  <div class="md:py-8 lg:py-12 p-4 md:p-8 lg:p-16 xl:px-24">
    <div class="md:flex">
      <div class="md:w-1/4 p-2">
        <h3 class="text-lg font-bold my-2">Capabilities</h3>
        <ul>
          <li v-for="(methods, capability) in manifestData" :key="capability" class="my-0.5 lg:my-2">
            <a :href="`#capability-${capability}`" class="text-blue-500 hover:underline">{{ capability }}</a>
          </li>
        </ul>
      </div>
      <div class="md:w-3/4">
        <div v-for="(methods, capability) in manifestData" :key="capability" class="mb-4 lg:my-12 "
          :id="`capability-${capability}`">
          <h2 class="text-6xl p-1 text-primary-300" :ref="`capability-${capability}`">{{ capability }}</h2>

          <div v-for="method in methods" :key="method.name"
            class="w-full p-2 md:p-4 lg:p-16 mt-2 ml-2 max-w-prose md:my-8 lg:my-16 dark:bg-slate-800 rounded-md ">
            <div class="tracking-widest">
              <span class="text-gray-400 text-lg">{{ method.name.split('(')[0] }}(

                <span v-for="(param, index) in method.parameters" :key="param.name" class="text-gray-400 mx-1">
                  <span class="text-purple-400">{{ param.name }}</span>
                  <!-- if we are not the last param, add a comma -->
                  <span v-if="index < method.parameters.length - 1">, </span>
                </span>

                {{ method.name.split(')')[1] }})

              </span>

            </div>
            <div class="text-gray-100 block my-4 prose dark:prose-invert prose-sm">{{ method.description }}</div>

            <div v-for="params in method.parameters" :key="params.name"
              class="mt-2 ml-2 lg:ml-8 xl:ml-10 prose md:mt-4 lg:mt-8 ">
              <span class="text-purple-400 font-bold">{{ params.name }}</span>
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