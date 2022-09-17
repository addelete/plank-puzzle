<template>
  <div class="level">
    <div class="name" @click="clickName = clickName + 1">
      {{ levelStore.id }}
    </div>
    <play :game="levelStore" :allowEdit="true" @step="onStep"></play>

    <div class="buttons">
      <button @click="onResetClick">重置</button>
      <button @click="onUndoClick" :style="{ marginLeft: 'auto' }">撤销</button>
      <button @click="onRedoClick">重做</button>
    </div>
  </div>
  <modal
    :open="solutionModalOpen"
    @onClose="solutionModalOpen = false"
    @width-change="onSolutionModalWidthChange"
  >
    <div class="solution">
      <div class="title">解答步骤</div>
      <div class="content">
        <play
          :game="solutionStepGame"
          :allowEdit="false"
          :maxWidth="solutionModalWidth - 40"
        ></play>
        <div class="buttons">
          <button @click="onSolutionStepChange(-1)">上一步</button>
          <button @click="onSolutionStepChange(1)">下一步</button>
        </div>
      </div>
    </div>
  </modal>
</template>

<script lang="ts" setup>
import { EdgeEndpointCoords, GameUtil, SolutionStep } from "@src/utils/game";
import { ref, watch, onBeforeMount, computed, onMounted } from "vue";
import { useLevelStore } from "@src/stores/level";
import { LevelData, systemLevels } from "@src/utils/levels";
import { useRoute, useRouter } from "vue-router";
import Modal from "@src/components/modal.vue";
import Play from "@src/components/play.vue";

const route = useRoute();
const router = useRouter();

const levelStore = useLevelStore();

const clickName = ref(0);
const solutionModalOpen = ref(false);
const solution = ref<SolutionStep[]>([]);
const solutionStepIndex = ref(0);
const solutionModalWidth = ref(1);

onBeforeMount(() => {
  let id = route.query.id;

  if (!id) {
    id = systemLevels[0].id;
    router.push("/?id=" + id);
  }

  if (id !== levelStore.id) {
    const level = systemLevels.find((level) => level.id === id) as LevelData;
    levelStore.init(level);
  }
});

// onMounted(() => {
//   showSolution();
// });

const onStep = (edgeIndex: number, edgeEndpointCoords: EdgeEndpointCoords) => {
  levelStore.step(edgeIndex, edgeEndpointCoords);
};

const showSolution = () => {
  const res = GameUtil.solve(levelStore);
  if (res.isWin) {
    solutionStepIndex.value = 0;
    solution.value = res.solution;
    solutionModalOpen.value = true;
  } else {
    alert("无解");
  }
};

const onSolutionModalWidthChange = (width: number) => {
  solutionModalWidth.value = width;
};

const onSolutionStepChange = (diff: number) => {
  solutionStepIndex.value = Math.max(
    0,
    Math.min(solution.value.length - 1, solutionStepIndex.value + diff)
  );
};

const solutionStepGame = computed(() => {
  const game = {
    ...levelStore,
    edges: solution.value[solutionStepIndex.value].edges,
  };
  return game;
});

// 点击按钮8次，求解
watch(
  () => clickName.value,
  () => {
    if (clickName.value === 8) {
      clickName.value = 0;
      showSolution();
    }
  }
);

// 成功之后，弹窗提示
watch(
  () => levelStore.isWin,
  (isWin) => {
    if (isWin) {
      setTimeout(() => {
        alert("完成挑战");
      }, 100);
    }
  }
);

const onResetClick = () => {
  levelStore.reset();
};

const onUndoClick = () => {
  levelStore.undo();
};

const onRedoClick = () => {
  levelStore.redo();
};
</script>

<style lang="scss">
.level {
  margin: auto 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .name {
    margin: 0 auto;
    font-size: 16px;
    color: #fff;
  }

  .solution {
    .content {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  }
}

</style>