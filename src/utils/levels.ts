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
  clickmazes2:
    '0606====0002====020005000101040100020202030202030403010405040005====-10002000500050401010104040104030002000502020203',
  clickmazes3:
    '0606====0404====00000200050001010301040105020003040302040304010504050505====05000502-104020402040200',
  clickmazes4:
    '0606====0004====010002000400030105010102040200030203050300040304010503050405====-10001000102040201050305',
  clickmazes5:
    '0606====0505====000002000500010103010202040201030004030405040205====050005040101010302020402-1050205',
  clickmazes6:
    '0606====0204====0000020005000101040103020502000304030204010503050505====01010401-10203020302030501050305',
  clickmazes7:
    '0606====0200====000002000101040102020502000303030204040401050505====0000020001010401-10202020204040401050505',
  clickmazes8:
    '0606====0505====00000100030002010401050101020402000301030303050302040404000502050505====01000300-105000500050205',
  clickmazes9:
    '0606====0405====00000100020005000101040100020502000302030403010404040005010503050505====0101010400020003-104010401040404',
  clickmazes10:
    '0606====0302====00000100050000010201040102020103040301040504020504050505====00000001010001030201020204010403-103010301040504',
  clickmazes11:
    '0606====0104====00000100040001010301000202020502030304030204000501050505====04000403-101010101010105030103030502050503030403',
  clickmazes12:
    '0606====0202====01000500000104010202030201030403010405040005020504050505====0100050000010401-1020202040304050504050500050205',
  clickmazes13:
    '0606====0103====000002000300050001010301000202020402010302030503000403040404000503050505====02000202-10101010103020300040005',
  clickmazes14:
    '0606====0304====000002000400050002010002030205020103020304030004020405040005010503050405====0200020103020305-1030103',
  clickmazes15:
    '0606====0403====010003000500000102010401010205020003030301040404000503050505====030003030001000304010404-104010400050305',
  clickmazes16:
    '0606====0302====00000100020003000500020105010002030204020203010405040005010502050405====0000010002010203-10302030104050402050405',
  clickmazes17:
    '0606====0304====00000100030004000101050100020202050202030403050303040005010502050505====03000304-10302030203020504030503',
  clickmazes18:
    '0606====0201====05000301040100020202050200030103030302040404050400050305====0500050203010303-10200020002020203030305',
  clickmazes19:
    '0606====0002====02000500010103010401000201020402000303030503010402040404010504050505====-1000200000200030503050502040404',
} as {
  [key: string]: string;
};

export const systemLevels = Object.keys(systemLevelMap).map((id) => {
  return LevelUtil.stringToData(systemLevelMap[id], id);
});
