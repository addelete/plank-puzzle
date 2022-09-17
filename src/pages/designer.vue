<template>
  <div class="designer">
    <div class="buttons">
      <button
        v-for="tool in tools"
        :key="tool.mode"
        :class="{
          active: tool.mode === activeTool,
        }"
        @click="activeTool = tool.mode"
      >
        {{ tool.name }}
      </button>
    </div>
    <div class="game">
      TODO: 设计器慢慢做吧🌝
    </div>

  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
enum Mode {
  Select,
  DrawPoint,
  DrawEdge,
  Erase,
}
const activeTool = ref(Mode.Select);
const tools = [
  {
    name: "选择",
    mode: Mode.Select,
  },
  {
    name: "节点",
    mode: Mode.DrawPoint,
  },
  {
    name: "木板",
    mode: Mode.DrawEdge,
  },
  {
    name: "擦除",
    mode: Mode.Erase,
  },
];
</script>

<style lang="scss">
.designer {
  margin: auto 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .buttons {
    button.active {
      background-color: rgb(0, 0, 0);
      color: #fbe450;
      border: 1px solid #a69734;
    }
  }
}
</style>