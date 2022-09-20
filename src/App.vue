<template>
  <div class="app">
    <div class="main">
      <div class="header">
        <div class="middle">
          <div class="icon-button" @click="goList" v-if="showListButton">
            <img :src="listImg" alt="" class="icon" />
          </div>
          <div v-else></div>
          <div class="title">{{ title }}</div>
          <div class="icon-button" @click="aboutModelOpen = true">
            <img :src="aboutImg" alt="" class="icon" />
          </div>
        </div>
      </div>
      <div class="body">
        <router-view></router-view>
      </div>
    </div>
    <modal :open="aboutModelOpen" @close="aboutModelOpen = false">
      <about />
    </modal>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import listImg from "@src/assets/list.svg";
import aboutImg from "@src/assets/about.svg";
import { useThemeStore } from "@src/stores/theme";
import { useRouter, useRoute } from "vue-router";
import Modal from "@src/components/modal.vue";
import About from "@src/components/about.vue";

const router = useRouter();
const route = useRoute();
const themeStore = useThemeStore();

const aboutModelOpen = ref(false);

const showListButton = computed(() => {
  return route.path !== "/levels" && route.path !== "/";
});

onMounted(() => {
  themeStore.setup();
});

const title = "Plank Puzzle";

const goList = () => {
  router.push("/");
};
</script>

<style lang="scss">
.icon-button {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  opacity: 0.8;
  .icon {
    display: block;
    width: 1em;
    height: 1em;
  }
}

.app {
  .nav {
    position: fixed;
    z-index: 999;
    height: 100vh;
    width: 200px;
    background-color: #000;
    box-shadow: 4px 0 5px rgba(255, 255, 255, 0.05);
    transition: left 0.3s;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: "Noto Sans SC", sans-serif;
    .close {
      display: none;
    }
    .logo {
      margin-top: 50px;
      display: flex;
      flex-direction: column;
      align-items: center;
      .image {
        display: block;
        width: 96px;
        height: 96px;
      }
      .title {
        font-size: 18px;
        font-weight: bold;
        color: #d8e7ff;
      }
    }
    .menus {
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      .menu {
        margin-bottom: 20px;
      }
    }
    .prod-info {
      margin-top: auto;
      margin-bottom: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 12px;
      color: #aaa;
      .version {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
      }
    }
  }
  .main {
    display: flex;
    flex-direction: column;
    padding-top: 60px;
    max-height: 100vh;
    .header {
      position: fixed;
      z-index: 999;
      top: 0;
      left: 0;
      height: 60px;
      width: 100%;
      background-color: #000;
      color: #fff;

      .middle {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 640px;
        margin: 0 auto;
        padding: 0 8px;
      }
      .title {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-size: large;
      }
    }
    .body {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: scroll;
    }
  }
}
</style>