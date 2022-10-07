<template>
  <div class="level">
    <div class="infos">
      <span class="name" @click="clickName = clickName + 1"
        >第{{ levelStore.id }}关（{{levelStore.solutionStepsLen}}步）</span>
      <span>步数：{{ levelStore.undoSteps.length }}</span>
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
    @close="solutionModalOpen = false"
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
          <span>{{ solutionStepIndex }}/{{ solution.length - 1 }}</span>
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
import { systemLevels } from "@src/utils/levels";
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
const levelIndex = ref(0);

const initLevelById = (id: string) => {
  if (!id) {
    id = systemLevels[0].id;
    router.push("/level?id=" + id);
  }

  if (id !== levelStore.id) {
    levelIndex.value = systemLevels.findIndex((level) => level.id === id);
    levelStore.init(systemLevels[levelIndex.value]);
  }
};

onBeforeMount(() => {
  initLevelById(route.query.id as string);
});

watch(
  () => route.query.id,
  (id) => {
    initLevelById(id as string);
  }
);

const onStep = (edgeIndex: number, edgeEndpointCoords: EdgeEndpointCoords) => {
  levelStore.step(edgeIndex, edgeEndpointCoords);
};

const showSolution = () => {
  const res = GameUtil.solve(levelStore);
  console.log(res);
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
        const nextLevelIndex = levelIndex.value + 1;
        if (nextLevelIndex < systemLevels.length) {
          const c = confirm("恭喜过关，是否进入下一关？");
          if (c) {
            router.push("/level?id=" + systemLevels[nextLevelIndex].id);
          }
        } else {
          alert("完成挑战, 已经是最后一关了");
        }
      }, 100);
    }
  }
);

const onResetClick = () => {
  const c = confirm("确定要重置吗？");
  if (c) {
    levelStore.reset();
  }
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
  padding-top: 50px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .infos {
    margin: 0 auto;
    font-size: 16px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 340px;
    padding: 10px 20px;
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