<template>
  <div class="app">
    <div
      class="nav-mask"
      :class="{ navVisible }"
      @click="navVisible = false"
    ></div>
    <div class="nav" :class="{ navVisible }">
      <div class="logo">
        <img :src="logoImg" alt="" class="image" />
        <div class="title">{{ title }}</div>
      </div>
      <div class="close icon-button" @click="navVisible = false">
        <img :src="closeImg" alt="" class="icon" />
      </div>
      <div class="menus">
        <div
          class="menu"
          v-for="menu in menus"
          :key="menu.path"
          @click="navVisible = !navVisible"
        >
          <router-link :to="menu.path">{{ menu.name }}</router-link>
        </div>
      </div>
      <div class="prod-info">
        <div class="version">版本：{{ version }}</div>
        <!-- <div class="build-time">{{ buildTime }}</div> -->
      </div>
    </div>
    <div class="main">
      <div class="header">
        <div class="show-nav icon-button" @click="navVisible = !navVisible">
          <img :src="menuImg" alt="" class="icon" />
        </div>
        <div class="title">{{ title }}</div>
      </div>
      <div class="body">
        <router-view></router-view>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";

import menuImg from "@src/assets/menu.svg";
import closeImg from "@src/assets/close.svg";
import logoImg from "@src/assets/logo.svg";
import { useThemeStore } from "@src/stores/theme";

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.setup();
});

const { version, buildTime } = __PROD_INFO__;

const title = "Plank Puzzle";

const menus = [
  {
    name: "关卡列表",
    path: "/levels",
  },
  {
    name: "设计关卡",
    path: "/designer",
  },
  {
    name: "关于",
    path: "/about",
  },
];

const navVisible = ref(false);
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
    padding-left: 200px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;

    .header {
      display: none;
    }
    .body {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  }
}
@media screen and (max-width: 960px) {
  .app {
    .nav-mask {
      display: none;
      &.navVisible {
        display: block;
        position: fixed;
        z-index: 998;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
      }
    }
    .nav {
      left: -240px;
      &.navVisible {
        left: 0;
      }
      .close {
        display: flex;
        position: absolute;
        right: 8px;
        top: 10px;
      }
    }
    .main {
      padding-left: 0;
      transition: transform 0.3s;

      .header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        height: 60px;
        background-color: #000;
        color: #fff;
        box-shadow: 0 4px 5px rgba(255, 255, 255, 0.05);
        padding: 0 8px;
        position: relative;
        .title {

          position: absolute;
          left: 50%;
          transform: translateX(-50%);

          font-size: large;
        }
      }
    }
  }
}
</style>