<!-- Vue test fixture for Color Tracr -->

<template>
  <div class="vue-test-component text-slate-800 dark:text-slate-200">
    <!-- Template testing: string attributes and Tailwind classes -->
    <h2 class="text-2xl text-brand-blue mb-4">Vue Component Test</h2>

    <div
      :style="{ backgroundColor: '#f0f4f8', color: 'rgb(15, 23, 42)', border: '2px solid tomato' }">
      Dynamic inline styles test
    </div>

    <button class="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded mt-4">
      Click Me
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Color literals inside JS strings
const themeColors = ref({
  brandDanger: 'hsl(359 100% 68%)',
  brandPrimary: '#9670ff',
  brandSecondary: 'rgba(210, 112, 255, 0.8)',
  label: 'slateblue',
});
</script>

<style scoped>
.vue-test-component {
  background: var(--bg-light);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  .vue-test-component {
    background: var(--bg-dark);
  }
}
</style>
