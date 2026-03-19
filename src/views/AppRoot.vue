<script setup lang="ts">
import { computed } from "vue";
import { useAuth } from "../services/composables/useAuth";
import LoginRegister from "./LoginRegister.vue";
import MainWindow from "./MainWindow.vue";

const { isLoggedIn } = useAuth();

const windowMode = computed(() => {
  const mode = new URLSearchParams(window.location.search).get("window");
  return mode === "main" ? "main" : "auth";
});
</script>

<template>
  <MainWindow v-if="windowMode === 'main' && isLoggedIn" />
  <LoginRegister v-else />
</template>
