<template>
  <setting-item item-name="版本">
    <div>v{{ version }}</div>
  </setting-item>
</template>

<script setup>

import SettingItem from "@/assets/svg/SettingItem.vue";
import {onMounted, ref} from "vue";
import { fetchAppVersion } from '@/services/appService.js';
let version = ref(null)
onMounted(async () => {
  version.value = await fetchAppVersion()
})
</script>

<style scoped>

</style>
