import { defineStore } from 'pinia';
import { Edge, GameUtil, Coord, EdgeEndpointCoords } from '@src/utils/game';
import { LevelData, systemLevels } from '@src/utils/levels';

export type Step = {
  edgesEndpointCoords: [Coord, Coord][];
  isWin: boolean;
};

export const useLevelStore = defineStore('level', {
  state: () =>
    ({
      id: '',
      colsLen: 6,
      rowsLen: 6,
      startY: 0,
      endY: 0,
      pointCoords: [],
      edgesEndpointCoords: [],
      isWin: false,
      undoSteps: [],
      redoSteps: [],
    } as LevelData & {
      isWin: boolean;
      undoSteps: Step[];
      redoSteps: Step[];
    }),
  getters: {
    startPoint: (state) => state.colsLen * state.rowsLen,
    endPoint: (state) => state.colsLen * state.rowsLen + 1,
    startCoord: (state) => ({ x: -1, y: state.startY }),
    endCoord: (state) => ({ x: state.colsLen, y: state.endY }),
    edges(): Edge[] {
      return GameUtil.edgesEndpointCoords2Edges(this.edgesEndpointCoords);
    },
  },
  actions: {
    init(levelData: LevelData) {
      this.id = levelData.id;
      this.colsLen = levelData.colsLen;
      this.rowsLen = levelData.rowsLen;
      this.startY = levelData.startY;
      this.endY = levelData.endY;
      this.pointCoords = levelData.pointCoords;
      this.edgesEndpointCoords = [...levelData.edgesEndpointCoords];
      this.isWin = false;
      this.undoSteps = [];
      this.redoSteps = [];
    },

    step(edgeIndex: number, newEdgeEndpointCoords: EdgeEndpointCoords) {
      if (this.isWin) return;
      this.undoSteps.push({
        edgesEndpointCoords: [...this.edgesEndpointCoords],
        isWin: this.isWin,
      });
      this.edgesEndpointCoords[edgeIndex] = newEdgeEndpointCoords;
      const isWin = GameUtil.isWin(this.endCoord, newEdgeEndpointCoords);
      if (isWin) {
        this.isWin = true;
      }
      this.redoSteps = [];
    },
    reset() {
      const levelData = systemLevels.find((level) => level.id === this.id) as LevelData;
      console.log('reset', levelData);
      this.init(levelData);
    },
    undo() {
      console.log('undo', this.undoSteps);
      if (this.undoSteps.length === 0) {
        return;
      }
      this.redoSteps.push({
        edgesEndpointCoords: [...this.edgesEndpointCoords],
        isWin: this.isWin,
      });
      const step = this.undoSteps.pop() as Step;
      this.edgesEndpointCoords = [...step.edgesEndpointCoords];
      this.isWin = step.isWin;
    },
    redo() {
      if (this.redoSteps.length === 0) {
        return;
      }
      this.undoSteps.push({
        edgesEndpointCoords: [...this.edgesEndpointCoords],
        isWin: this.isWin,
      });
      const step = this.redoSteps.pop() as Step;
      this.edgesEndpointCoords = step.edgesEndpointCoords;
      this.isWin = step.isWin;
    },
  },
});
