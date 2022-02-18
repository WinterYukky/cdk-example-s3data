<script setup lang="ts">
const message = ref('Not called yet')
const { data: config } = useLazyAsyncData<{ endpoint: string }>(
  'config',
  () => $fetch('/config.json'),
  {
    server: false,
    default: () => ({ endpoint: '/api/' }),
  }
)
const clickButton = async () => {
  message.value = await $fetch(`${config.value.endpoint}hello`)
}
</script>

<template>
  <div>
    <div><button @click="clickButton">click me</button></div>
    <div>{{ message }}</div>
  </div>
</template>
