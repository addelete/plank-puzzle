<template>
  <div
    class="levels"
    :style="{
      width: `${width}px`,
      gap: `${gap}px`,
    }"
  >
    <router-link
      :to="`/level?id=${level.id}`"
      class="item"
      v-for="level in levels"
      :key="level.id"
      :style="{
        width: `${gridWidth}px`,
        height: `${gridWidth}px`,
        background: `hsla(${
          (540 - Math.round(level.solutionStepsLen / 6) * 30) % 360
        },60%,30%, 1)`,
      }"
    >
      <div class="id">{{ level.id }}</div>
      <div class="difficulty">
        {{ level.solutionStepsLen }} / {{ complateLevelMap[`${level.id}#${level.solutionStepsLen}`] || "-" }}
      </div>
    </router-link>
  </div>
</template>

<script lang="ts" setup>
import { systemLevels } from "@src/utils/levels";
import { computed } from "vue";
import { useThemeStore } from "@src/stores/theme";
import { CacheUtils } from "@src/utils/cache";

const themeStore = useThemeStore();
const gridWidth = 100;
const gap = 12;

const levels = systemLevels;
const width = computed(() => {
  const maxCols = Math.floor(
    Math.min(680, themeStore.layout.windowInnerWidth - 20) / (gridWidth + gap)
  );
  return maxCols * (gridWidth + gap) - gap;
});
const complateLevelMap = CacheUtils.getItem("complateLevels", {}) as Record<
  string,
  number
>;
</script>

<style lang="scss">
.levels {
  margin: 0 auto;
  height: 100%;
  padding: 20px 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;

  .item {
    background: rgba(255, 255, 255, 0.1);
    padding: 8px;
    text-align: left;
    color: #fff;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    position: relative;
    .id {
      font-size: 36px;
      font-weight: bold;
      opacity: 0.8;
    }
    .difficulty {
      position: absolute;
      bottom: 0;
      margin-top: 10px;
      font-size: 12px;
      color: #fff;
      padding: 4px 10px;
      border-radius: 4px 4px 0 0;
      background: #00000045;
    }
  }
}
</style>