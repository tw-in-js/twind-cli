<template>
  <div :class="classObject">
    <div class="static" v-bind:class="{ underline: isActive, 'text-red-600': hasError }"></div>
  </div>
</template>

<script>
export default {
  data: {
    classObject: {
      'text-xl': true,
      'text-sm': false,
    },
  },
}
</script>
