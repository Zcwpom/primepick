<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import LayoutNav from './components/LayoutNav.vue'
import LayoutHeader from './components/LayoutHeader.vue'
import LayoutFooter from './components/LayoutFooter.vue'
</script>

<template>
 <div> <LayoutNav /> </div>
 <div> <LayoutHeader /> </div>
 <div> <RouterView /> </div>
 <div> <LayoutFooter /> </div>
</template>
