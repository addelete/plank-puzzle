import { Coord } from './game';

export type LevelData = {
  id: string;
  colsLen: number;
  rowsLen: number;
  startY: number;
  endY: number;
  pointCoords: Coord[];
  edgesEndpointCoords: [Coord, Coord][];
};

export class LevelUtil {
  /**
   * 将关卡数据转为关卡字符串
   * @param levelData
   */
  static dataToString(levelData: LevelData) {
    const sortCord = (a: Coord, b: Coord) => {
      if (a.y === b.y) {
        return a.x - b.x;
      }
      return a.y - b.y;
    };
    const numToString = (num: number) => ('' + num).padStart(2, '0');
    levelData.pointCoords.sort(sortCord);
    levelData.edgesEndpointCoords.sort((a, b) => sortCord(a[0], b[0]));
    return [
      numToString(levelData.rowsLen) + numToString(levelData.colsLen),
      // levelData.startY + '' + levelData.endY,
      numToString(levelData.startY) + numToString(levelData.endY),
      levelData.pointCoords.reduce((before, current) => {
        return before + numToString(current.x) + numToString(current.y);
      }, ''),
      levelData.edgesEndpointCoords.reduce((before, current) => {
        return (
          before +
          numToString(current[0].x) +
          numToString(current[0].y) +
          numToString(current[1].x) +
          numToString(current[1].y)
        );
      }, ''),
    ].join('====');
  }
  /**
   * 根据关卡字符串生成关卡
   * @param levelString
   * @returns
   */
  static stringToData(levelString: string, id: string): LevelData {
    const [rowsAndColsLen, startAndEndY, pointCoordsString, edgesEndpointCoordsString] =
      levelString.split('====');
    const rowsLen = Number(rowsAndColsLen.slice(0, 2));
    const colsLen = Number(rowsAndColsLen.slice(2, 4));

    const startY = Number(startAndEndY.slice(0, 2));
    const endY = Number(startAndEndY.slice(2, 4));

    const pointCoords = pointCoordsString.split('').reduce((before, current, index) => {
      if (index % 4 === 3) {
        before.push({
          x: Number(pointCoordsString.slice(index - 3, index - 1)),
          y: Number(pointCoordsString.slice(index - 1, index + 1)),
        });
      }
      return before;
    }, [] as Coord[]);

    const edgesEndpointCoords = edgesEndpointCoordsString
      .split('')
      .reduce((before, current, index) => {
        if (index % 8 === 7) {
          before.push([
            {
              x: Number(edgesEndpointCoordsString.slice(index - 7, index - 5)),
              y: Number(edgesEndpointCoordsString.slice(index - 5, index - 3)),
            },
            {
              x: Number(edgesEndpointCoordsString.slice(index - 3, index - 1)),
              y: Number(edgesEndpointCoordsString.slice(index - 1, index + 1)),
            },
          ]);
        }
        return before;
      }, [] as [Coord, Coord][]);
    const firstActiveEdgeIndex = edgesEndpointCoords.findIndex((endpointCoords) => {
      return endpointCoords[0].x === -1 || endpointCoords[1].x === -1;
    });
    edgesEndpointCoords.unshift(edgesEndpointCoords.splice(firstActiveEdgeIndex, 1)[0]);
    return {
      id,
      colsLen,
      rowsLen,
      startY,
      endY,
      pointCoords,
      edgesEndpointCoords,
    };
  }
}

const systemLevelMap = {
  clickmazes1:
    '0606====0303====040005000001010102020302000305030304040401050205====000100030001010102020205-10300030105010101050205',
  clickmazes19:
    '0606====0002====02000500010103010401000201020402000303030503010402040404010504050505====-1000200000200030503050502040404',
} as {
  [key: string]: string;
};

export const systemLevels = Object.keys(systemLevelMap).map((id) => {
  return LevelUtil.stringToData(systemLevelMap[id], id);
});
