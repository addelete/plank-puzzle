<template>
  <div
    :style="{
      width: `${staticRenderData.stageWidth * staticRenderData.scale}px`,
      height: `${staticRenderData.stageHeight * staticRenderData.scale}px`,
      overflow: 'hidden',
    }"
  >
    <div
      :style="{
        transformOrigin: '0 0',
        transform: `scale(${staticRenderData.scale})`,
      }"
    >
      <v-stage
        :width="staticRenderData.stageWidth"
        :height="staticRenderData.stageHeight"
        @pointerdown="onClickBoard"
      >
        <v-layer>
          <v-rect
            :x="staticRenderData.boardX"
            :y="staticRenderData.boardY"
            :width="staticRenderData.boardWidth"
            :height="staticRenderData.boardWidth"
            :fill="staticRenderData.boardBgColor"
            :cornerRadius="6"
          ></v-rect>
        </v-layer>
        <v-layer :x="staticRenderData.gridsX" :y="staticRenderData.gridsY">
          <v-line
            v-for="(line, li) in staticRenderData.lines"
            :key="li"
            :x="line.x"
            :y="line.y"
            :points="line.points"
            :stroke="staticRenderData.lineColor"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-line>
          <v-line
            :x="staticRenderData.startPosition.x"
            :y="staticRenderData.startPosition.y"
            :points="[0, 0, staticRenderData.gridWidth, 0]"
            :stroke="staticRenderData.lineColor"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-line>
          <v-line
            :x="staticRenderData.endPosition.x"
            :y="staticRenderData.endPosition.y"
            :points="[0, 0, -staticRenderData.gridWidth, 0]"
            :stroke="staticRenderData.lineColor"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-line>
          <v-line
            :x="staticRenderData.startPosition.x"
            :y="staticRenderData.startPosition.y"
            :points="[0, 0, staticRenderData.gridWidth * 0.5, 0]"
            stroke="#fff"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-line>
          <v-line
            :x="staticRenderData.endPosition.x"
            :y="staticRenderData.endPosition.y"
            :points="[0, 0, -staticRenderData.gridWidth * 0.5, 0]"
            stroke="#fff"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-line>
          <v-circle
            v-for="(point, pi) in staticRenderData.positions"
            :key="pi"
            :x="point.x"
            :y="point.y"
            :radius="staticRenderData.pointRadius"
            :fill="staticRenderData.pointColor"
            :stroke="staticRenderData.lineColor"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-circle>
          <v-circle
            :x="staticRenderData.startPosition.x"
            :y="staticRenderData.startPosition.y"
            :radius="staticRenderData.pointRadius"
            :fill="staticRenderData.startPointColor"
            :stroke="staticRenderData.lineColor"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-circle>
          <v-circle
            :x="staticRenderData.endPosition.x"
            :y="staticRenderData.endPosition.y"
            :radius="staticRenderData.pointRadius"
            :fill="staticRenderData.endPointColor"
            :stroke="staticRenderData.lineColor"
            :strokeWidth="staticRenderData.lineStrokeWidth"
          ></v-circle>
        </v-layer>
        <v-layer :x="staticRenderData.gridsX" :y="staticRenderData.gridsY">
          <v-group
            v-for="(edge, ei) in dynamicRenderData.edges"
            :key="ei"
            :x="edge.touchX"
            :y="edge.touchY"
          >
            <v-rect
              :width="edge.touchWidth"
              :height="edge.touchHeight"
              :opacity="0"
              @pointerdown="onEdgeClick(ei, $event)"
            ></v-rect>
            <v-rect
              :x="edge.x"
              :y="edge.y"
              :width="edge.width"
              :height="edge.height"
              :fill="edge.fill"
              :opacity="handEdgeIndex === ei ? 0.3 : 1"
              :stroke="staticRenderData.lineColor"
              :strokeWidth="staticRenderData.lineStrokeWidth"
              :cornerRadius="staticRenderData.edgeWidth / 2"
              @pointerdown="onEdgeClick(ei, $event)"
            ></v-rect>
          </v-group>
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useThemeStore } from "@src/stores/theme";
import { Coord, Edge, EdgeEndpointCoords, GameUtil } from "@src/utils/game";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";

const themeStore = useThemeStore();

const props = withDefaults(
  defineProps<{
    game: {
      colsLen: number;
      rowsLen: number;
      pointCoords: Coord[];
      startCoord: Coord;
      endCoord: Coord;
      edges: Edge[];
      isWin: boolean;
    };
    allowEdit: boolean;
    maxWidth?: number;
    maxHeight?: number;
  }>(),
  {
    maxWidth: 640,
    maxHeight: 640,
  }
);

const handEdgeIndex = ref(-1);

const staticRenderData = computed(() => {
  const stagePaddingToGrids =
    themeStore.game.stagePadding + themeStore.game.boardPadding;

  const stageWidth =
    (props.game.colsLen + 1) * themeStore.game.gridWidth +
    stagePaddingToGrids * 2;
  const stageHeight =
    (props.game.rowsLen - 1) * themeStore.game.gridWidth +
    stagePaddingToGrids * 2;

  let realWidth = Math.min(
    themeStore.layout.windowInnerWidth,
    props.maxWidth || 640
  );
  let realHeight = Math.min(
    themeStore.layout.windowInnerHeight,
    props.maxHeight
  );
  const scale = Math.min(realWidth / stageWidth, realHeight / stageHeight);
  const boardX = themeStore.game.gridWidth + themeStore.game.stagePadding;
  const boardY = themeStore.game.stagePadding;
  const boardWidth =
    (props.game.colsLen - 1) * themeStore.game.gridWidth +
    themeStore.game.boardPadding * 2;
  const boardHeight =
    (props.game.rowsLen - 1) * themeStore.game.gridWidth +
    themeStore.game.boardPadding * 2;
  const gridsX = boardX + themeStore.game.boardPadding;
  const gridsY = boardY + themeStore.game.boardPadding;
  const lines = [
    ...Array(props.game.rowsLen)
      .fill(0)
      .map((_, i) => ({
        x: 0,
        y: i * themeStore.game.gridWidth,
        points: [0, 0, (props.game.colsLen - 1) * themeStore.game.gridWidth, 0],
      })),
    ...Array(props.game.colsLen)
      .fill(0)
      .map((_, i) => ({
        x: i * themeStore.game.gridWidth,
        y: 0,
        points: [0, 0, 0, (props.game.rowsLen - 1) * themeStore.game.gridWidth],
      })),
  ];

  const pointCoordToPosition = (pointCoord: Coord) => {
    return {
      x: pointCoord.x * themeStore.game.gridWidth,
      y: pointCoord.y * themeStore.game.gridWidth,
    };
  };

  const positions = props.game.pointCoords.map(pointCoordToPosition);

  const startPosition = pointCoordToPosition(props.game.startCoord);
  const endPosition = pointCoordToPosition(props.game.endCoord);

  return {
    ...themeStore.game,
    stageWidth,
    stageHeight,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    gridsX,
    gridsY,
    lines,
    positions,
    startPosition,
    endPosition,
    scale,
  };
});

const dynamicRenderData = computed(() => {
  const edges = props.game.edges.map((edge) => {
    const startCoord = edge.pointCoords[0];
    const isVertical = GameUtil.isVertical(edge.pointCoords);
    const edgeWidth = themeStore.game.edgeWidth;
    const edgeLen =
      (edge.pointCoords.length - 1) * themeStore.game.gridWidth - 10;
    return {
      touchX:
        startCoord.x * themeStore.game.gridWidth -
        (!isVertical ? -5 : themeStore.game.pointRadius),
      touchY:
        startCoord.y * themeStore.game.gridWidth -
        (isVertical ? -5 : themeStore.game.pointRadius),
      touchWidth: isVertical ? themeStore.game.pointRadius * 2 : edgeLen,
      touchHeight: !isVertical ? themeStore.game.pointRadius * 2 : edgeLen,
      x: isVertical ? themeStore.game.pointRadius - edgeWidth / 2 : 0,
      y: !isVertical ? themeStore.game.pointRadius - edgeWidth / 2 : 0,
      width: isVertical ? edgeWidth : edgeLen,
      height: !isVertical ? edgeWidth : edgeLen,
      fill: edge.isActive
        ? themeStore.game.edgeActiveColor
        : themeStore.game.edgeColor,
    };
  });
  return {
    edges,
  };
});

const emit = defineEmits<{
  (
    event: "step",
    edgeIndex: number,
    edgeEndpointCoords: EdgeEndpointCoords
  ): void;
}>();

const onEdgeClick = (index: number, e: KonvaEventObject<MouseEvent>) => {
  if (!props.allowEdit) return;
  e.cancelBubble = true;
  if (!props.game.edges[index].isActive || props.game.isWin) return;
  handEdgeIndex.value = handEdgeIndex.value === index ? -1 : index;
};

const onClickBoard = (event: KonvaEventObject<any>) => {
  if (!props.allowEdit) return;
  if (handEdgeIndex.value === -1) return;
  const handEdge = props.game.edges[handEdgeIndex.value];
  const handEdgeLen = handEdge.pointCoords.length - 1;
  const gridWidth = themeStore.game.gridWidth;

  const stegeRect = (
    (event.currentTarget as Stage).content as HTMLDivElement
  ).getBoundingClientRect();

  const offsetX =
    (event.evt.pageX - stegeRect.x) / staticRenderData.value.scale -
    staticRenderData.value.gridsX;
  const offsetY =
    (event.evt.pageY - stegeRect.y) / staticRenderData.value.scale -
    staticRenderData.value.gridsY;
  const nearColIndex = Math.round(offsetX / gridWidth);
  const nearRowIndex = Math.round(offsetY / gridWidth);
  const nearX = Math.abs(offsetX - nearColIndex * gridWidth);
  const nearY = Math.abs(offsetY - nearRowIndex * gridWidth);
  const maybeVertical = nearX < themeStore.game.pointRadius;
  const maybeHorizontal = nearY < themeStore.game.pointRadius;
  const edgeEndpointCoordsList: [Coord, Coord][] = [];

  if (maybeHorizontal) {
    const y = nearRowIndex;
    const x = offsetX / gridWidth;
    const pointCoordsXList = [
      props.game.startCoord,
      props.game.endCoord,
      ...props.game.pointCoords,
    ]
      .filter((coord) => coord.y === y)
      .map((coord) => coord.x);
    pointCoordsXList.sort((a, b) => a - b);

    for (let i = 0; i < pointCoordsXList.length - 1; i++) {
      if (
        pointCoordsXList[i] < x &&
        pointCoordsXList[i + 1] > x &&
        pointCoordsXList[i + 1] - pointCoordsXList[i] === handEdgeLen
      ) {
        edgeEndpointCoordsList.push([
          { x: pointCoordsXList[i], y },
          { x: pointCoordsXList[i + 1], y },
        ]);
      }
    }
  }

  if (maybeVertical) {
    const x = nearColIndex;
    const y = offsetY / gridWidth;
    const pointCoordsYList = [
      props.game.startCoord,
      props.game.endCoord,
      ...props.game.pointCoords,
    ]
      .filter((coord) => coord.x === x)
      .map((coord) => coord.y);
    pointCoordsYList.sort((a, b) => a - b);
    for (let i = 0; i < pointCoordsYList.length - 1; i++) {
      if (
        pointCoordsYList[i] < y &&
        pointCoordsYList[i + 1] > y &&
        pointCoordsYList[i + 1] - pointCoordsYList[i] === handEdgeLen
      ) {
        edgeEndpointCoordsList.push([
          { y: pointCoordsYList[i], x },
          { y: pointCoordsYList[i + 1], x },
        ]);
      }
    }
  }
  let resultEdgeEndpointCoordsList = edgeEndpointCoordsList.filter(
    (edgeEndpointCoords) => {
      const findNearActive = props.game.edges.some((e) => {
        if (!e.isActive) return false;
        const eEndpointCoords = [
          e.pointCoords[0],
          e.pointCoords[e.pointCoords.length - 1],
        ];
        return eEndpointCoords.some((eEndpointCoord) =>
          edgeEndpointCoords.some((endpointCoord) =>
            GameUtil.isCoordsEqual(endpointCoord, eEndpointCoord)
          )
        );
      });
      if (!findNearActive) return false;
      return true;
    }
  );
  if (resultEdgeEndpointCoordsList.length === 0) return;
  if (resultEdgeEndpointCoordsList.length === 2) {
    const isVertical = nearX < nearY;
    resultEdgeEndpointCoordsList = resultEdgeEndpointCoordsList.filter(
      (edgeEndpointCoords) =>
        GameUtil.isVertical(edgeEndpointCoords) === isVertical
    );
  }
  emit("step", handEdgeIndex.value, resultEdgeEndpointCoordsList[0]);
  handEdgeIndex.value = -1;
};
</script>

<style lang="scss">
</style>