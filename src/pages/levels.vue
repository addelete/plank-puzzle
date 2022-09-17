<template>
  <div class="levels">
    <router-link
      :to="`/?id=${level.id}`"
      class="item"
      v-for="(level, i) in levels"
      :key="level.id"
    >
      <div class="sq">{{ i + 1 }}</div>
      <div class="name">{{ level.id }}</div>
    </router-link>
  </div>
</template>

<script lang="ts" setup>
import { systemLevels } from "@src/utils/levels";
const levels = systemLevels;
</script>

<style lang="scss">
.levels {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  height: 100%;
  padding: 20px;

  .item {
    background: rgba(255, 255, 255, 0.1);
    margin-bottom: 16px;
    padding: 20px;
    text-align: left;
    color: #fff;
    border-radius: 6px;
    display: flex;
    align-items: center;
    .sq {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      background-color: #666;
      color: #fff;
      text-align: center;
      line-height: 32px;
      font-size: 16px;
      margin-right: 8px;
    }
    .name {
      font-size: 18px;
    }
  }
}
</style>