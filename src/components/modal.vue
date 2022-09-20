

<template>
  <div
    class="modal"
    v-if="open"
    :style="{
      width: `${width}px`,
      height: 'auto',
      marginLeft: `${-(width / 2)}px`,
    }"
  >
    <div class="modal-mask" @click="close"></div>
    <div class="modal-close" @click="close">X</div>
    <div class="modal-body">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useThemeStore } from "@src/stores/theme";
const themeStore = useThemeStore();

withDefaults(
  defineProps<{
    open: boolean;
  }>(),
  {
    open: false,
  }
);

const emit = defineEmits<{
  (event: "close"): void;
  (event: "width-change", width: number): void;
}>();

const width = computed(() => {
  const w = Math.min(640, themeStore.layout.windowInnerWidth) - 40;
  emit("width-change", w);
  return w;
});

const close = () => {
  emit("close");
};
</script>

<style lang="scss">
.modal {
  position: fixed;
  left: 50%;
  top: 100px;
  z-index: 999;
  

  .modal-mask {
    position: fixed;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    left: 0;
    top: 0;
  }

  .modal-close {
    position: absolute;
    z-index: 1000;
    top: 10px;
    right: 10px;
    cursor: pointer;
    width: 30px;
    height: 30px;
    background: #ffef00;
    border-radius: 50%;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-body {
    position: relative;
    width: 100%;
    height: 100%;
    max-height: 70vh;
    overflow-y: auto;
    background: #444;
    border-radius: 12px;
    padding: 20px;
    overflow: auto;
  }
}

</style>