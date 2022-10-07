export type Coord = {
  x: number;
  y: number;
};

export type Game = {
  colsLen: number;
  rowsLen: number;
  startCoord: Coord;
  endCoord: Coord;
  pointCoords: Coord[];
  edges: Edge[];
};

export type Step = {
  edgesEndpointCoords: [Coord, Coord][];
  isWin: boolean;
};

export type Edge = {
  pointCoords: Coord[];
  isActive: boolean;
};

export type SolutionStep = {
  edges: Edge[];
  prevStep: SolutionStep | null;
};

export type EdgeEndpointCoords = [Coord, Coord];

export class GameUtil {
  /**
   * 求解
   * @returns
   */
  static solve(game: Game) {
    
    const stepsForCheck: SolutionStep[] = [
      {
        edges: [...game.edges],
        prevStep: null,
      },
    ];
    let checkTimes = 1;
    const stepsSet = new Set<string>();
    stepsSet.add(GameUtil.edgesToHashCode(game.edges));

    while (stepsForCheck.length > 0) {
      checkTimes++;
      const checkStep = stepsForCheck.shift() as SolutionStep;
      const { isWin, nextSteps } = GameUtil.nextStep(game, stepsSet, checkStep);
      if (isWin) {
        return { isWin, solution: GameUtil.backwardSolution(nextSteps[0]), checkTimes };
      }
      stepsForCheck.push(...nextSteps);
    }
    return { isWin: false, solution: [], checkTimes };
  }
  /**
   * 从最后一步，向前推导出解
   * @param lastStep 最后一步
   * @returns
   */
  static backwardSolution(lastStep: SolutionStep) {
    const solution: SolutionStep[] = [];
    let currentStep: SolutionStep | null = lastStep;
    while (currentStep) {
      solution.push(currentStep);
      currentStep = currentStep.prevStep;
    }
    return solution.reverse();
  }
  /**
   * 计算下一步的所有可能
   * @param solutionStep
   * @returns
   */
  static nextStep(game: Game, stepsSet: Set<string>, solutionStep: SolutionStep) {
    const edges = solutionStep.edges;
    const activeEdgeIndexes: number[] = []; // 激活的边的索引
    const activeEdgeIndexesGroupByLen: Record<number, number[]> = {}; // 按边长分组的激活的边的索引
    const activeEdgesLens: number[] = []; // 激活的边的长度
    const resultSteps: SolutionStep[] = [];

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (edge.isActive) {
        activeEdgeIndexes.push(i);
        const len = edge.pointCoords.length - 1;
        if (!activeEdgeIndexesGroupByLen[len]) {
          activeEdgeIndexesGroupByLen[len] = [];
          activeEdgesLens.push(len);
        }
        activeEdgeIndexesGroupByLen[len].push(i);
      }
    }
    for (const checkEdgeIndex of activeEdgeIndexes) {
      const checkEdge = edges[checkEdgeIndex];
      const checkEdgeEndpointCoords = [
        checkEdge.pointCoords[0],
        checkEdge.pointCoords[checkEdge.pointCoords.length - 1],
      ];
      for (const startEndpointCoord of checkEdgeEndpointCoords) {
        for (const checkEdgesLen of activeEdgesLens) {
          const endEndpointCoords = [
            { x: startEndpointCoord.x + checkEdgesLen, y: startEndpointCoord.y },
            { x: startEndpointCoord.x - checkEdgesLen, y: startEndpointCoord.y },
            { x: startEndpointCoord.x, y: startEndpointCoord.y + checkEdgesLen },
            { x: startEndpointCoord.x, y: startEndpointCoord.y - checkEdgesLen },
          ];

          for (const endEndpointCoord of endEndpointCoords) {
            if (!GameUtil.isRightfulPoint(game, endEndpointCoord)) {
              continue;
            }
            const newEdgePointCoords = GameUtil.fillEdgePointCoords([
              startEndpointCoord,
              endEndpointCoord,
            ]);
            let canMove = true;
            // 判断新边是否会盖住其他点
            if (newEdgePointCoords.length > 2) {
              for (const pointCoordInEdge of newEdgePointCoords.slice(1, -1)) {
                if (GameUtil.isCoordInCoords(game.pointCoords, pointCoordInEdge)) {
                  canMove = false;
                  break;
                }
              }
            }
            if (!canMove) {
              continue;
            }
            for (const rightLenActiveEdgeIndex of activeEdgeIndexesGroupByLen[checkEdgesLen]) {
              const nextEdges = [...edges].map((edge) => ({
                pointCoords: [...edge.pointCoords],
                isActive: false,
              }));
              nextEdges.splice(rightLenActiveEdgeIndex, 1);
              // 判断新边是否会造成与其他边重叠或交叠
              for (const edgeForCompare of nextEdges) {
                const isCoincideOrCross = GameUtil.isCoincideOrCross(
                  edgeForCompare.pointCoords,
                  newEdgePointCoords
                );
                if (isCoincideOrCross) {
                  canMove = false;
                  break;
                }
              }
              if (!canMove) {
                continue;
              }
              nextEdges.unshift({
                pointCoords: [...newEdgePointCoords],
                isActive: false,
              });
              GameUtil.calcEdgesIsActive(nextEdges);
              const hashCode = GameUtil.edgesToHashCode(nextEdges);
              if (!stepsSet.has(hashCode)) {
                stepsSet.add(hashCode);
                const nextStep: SolutionStep = {
                  edges: nextEdges,
                  prevStep: solutionStep,
                };
                if (GameUtil.isCoordsEqual(endEndpointCoord, game.endCoord)) {
                  return { isWin: true, nextSteps: [nextStep] }; // 找到了
                }
                resultSteps.push(nextStep);
              }
            }
          }
        }
      }
    }
    return { isWin: false, nextSteps: resultSteps };
  }

  /**
   * 边局面转换为hashCode
   * @param edges
   * @returns
   */
  static edgesToHashCode(edges: Edge[]) {
    const sortEdges = [...edges];
    const sortCord = (a: Coord, b: Coord) => {
      if (a.y === b.y) {
        return a.x - b.x;
      }
      return a.y - b.y;
    };
    sortEdges.sort((a, b) => sortCord(a.pointCoords[0], b.pointCoords[0]));
    const numToString = (num: number) => ('' + num).padStart(2, '0');
    const hashCode = sortEdges.reduce((before, current) => {
      return (
        before +
        numToString(current.pointCoords[0].x) +
        numToString(current.pointCoords[0].y) +
        numToString(current.pointCoords[current.pointCoords.length - 1].x) +
        numToString(current.pointCoords[current.pointCoords.length - 1].y) +
        (current.isActive ? '1' : '0')
      );
    }, '');
    return hashCode;
  }

  /**
   * 判断两边重叠或交叠
   * 1. 两边都是水平或垂直, 判断是否重叠，重叠时至少有两个点是重复的
   * 2. 两边都是水平或垂直，判断是否交叠，交叠时有一个点是重复的，且此点不在两边的端点上
   * @param pointsCoords1 边1的点
   * @param pointsCoords2 边2的点
   * @returns
   */
  static isCoincideOrCross(pointsCoords1: Coord[], pointsCoords2: Coord[]) {
    const isSameDir = GameUtil.isVertical(pointsCoords1) == GameUtil.isVertical(pointsCoords2);
    const samePoints = pointsCoords1.filter((pointsCoord) =>
      GameUtil.isCoordInCoords(pointsCoords2, pointsCoord)
    );
    if (isSameDir && samePoints.length >= 2) {
      return true;
    }

    if (
      !isSameDir &&
      samePoints.length === 1 &&
      !GameUtil.isCoordsEqual(samePoints[0], pointsCoords1[0]) &&
      !GameUtil.isCoordsEqual(samePoints[0], pointsCoords1[pointsCoords1.length - 1]) &&
      !GameUtil.isCoordsEqual(samePoints[0], pointsCoords2[0]) &&
      !GameUtil.isCoordsEqual(samePoints[0], pointsCoords2[pointsCoords2.length - 1])
      // !GameUtil.isCoordInCoords(pointsCoords1.slice(1, -1), samePoints[0]) &&
      // !GameUtil.isCoordInCoords(pointsCoords2.slice(1, -1), samePoints[0])
    ) {
      return true;
    }
    return false;
  }

  /**
   * 坐标列表是否包含坐标
   * @param coords 
   * @param coord 
   * @returns 
   */
  static coordsIncludes(coords: Coord[], coord: Coord) {
    return coords.some((c) => GameUtil.isCoordsEqual(c, coord));
  }

  /**
   * 判断点是否合法
   * 合法的点是：起点、终点、点集中的点
   * @param pointCoord 点
   */
  static isRightfulPoint(game: Game, pointCoord: Coord) {
    return (
      GameUtil.isCoordsEqual(pointCoord, game.startCoord) ||
      GameUtil.isCoordsEqual(pointCoord, game.endCoord) ||
      GameUtil.isCoordInCoords(game.pointCoords, pointCoord)
    );
  }

  /**
   * 判断坐标是否在坐标集合中
   * @param coords
   * @param coord
   * @returns
   */
  static isCoordInCoords(coords: Coord[], coord: Coord) {
    return coords.some((c) => GameUtil.isCoordsEqual(c, coord));
  }

  /**
   * 判断两个坐标是否相同
   * @param coord1 坐标1
   * @param coord2 坐标2
   * @returns
   */
  static isCoordsEqual(coord1: Coord, coord2: Coord): boolean {
    return coord1.x === coord2.x && coord1.y === coord2.y;
  }

  /**
   * 根据变化的边的端点，判定游戏是否结束
   * @param endpointCoords
   * @returns
   */
  static isWin(endCoord: Coord, endpointCoords: EdgeEndpointCoords) {
    return (
      GameUtil.isCoordsEqual(endpointCoords[0], endCoord) ||
      GameUtil.isCoordsEqual(endpointCoords[1], endCoord)
    );
  }

  /**
   * 根据边的端点坐标，生成边
   * @param edgesEndpointCoords
   */
  static edgesEndpointCoords2Edges(edgesEndpointCoords: [Coord, Coord][]): Edge[] {
    const edges = edgesEndpointCoords.map((endpointCoords) => {
      return {
        pointCoords: GameUtil.fillEdgePointCoords(endpointCoords),
        isActive: false,
      };
    });
    GameUtil.calcEdgesIsActive(edges);
    return edges;
  }

  /**
   * 根据端点坐标生成边的points
   * @param param0 开始点和结束点
   * @returns
   */
  static fillEdgePointCoords([startCoord, endCoord]: [Coord, Coord]) {
    if (startCoord.y > endCoord.y || startCoord.x > endCoord.x) {
      [startCoord, endCoord] = [endCoord, startCoord];
    }
    const s = {
      x: startCoord.x,
      y: startCoord.y,
    };
    const step = s.x === endCoord.x ? { x: 0, y: 1 } : { x: 1, y: 0 };
    const pointCoords = [];
    while (true) {
      pointCoords.push({ x: s.x, y: s.y });
      if (GameUtil.isCoordsEqual(s, endCoord)) {
        break;
      }
      s.x += step.x;
      s.y += step.y;
    }
    return pointCoords;
  }

  /**
   * 根据第一个激活的边，计算其余边的激活状态
   * @param edges 所有边
   */
  static calcEdgesIsActive(edges: Edge[]) {
    if (edges.length === 0) {
      return;
    }
    edges[0].isActive = true;
    const checkIndexes = [0];
    while (checkIndexes.length > 0) {
      const checkIndex = checkIndexes.shift();
      const checkEdge = edges[checkIndex as number];
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        if (edge.isActive) {
          continue;
        }
        if (
          GameUtil.isCoordsEqual(checkEdge.pointCoords[0], edge.pointCoords[0]) ||
          GameUtil.isCoordsEqual(
            checkEdge.pointCoords[0],
            edge.pointCoords[edge.pointCoords.length - 1]
          ) ||
          GameUtil.isCoordsEqual(
            checkEdge.pointCoords[checkEdge.pointCoords.length - 1],
            edge.pointCoords[0]
          ) ||
          GameUtil.isCoordsEqual(
            checkEdge.pointCoords[checkEdge.pointCoords.length - 1],
            edge.pointCoords[edge.pointCoords.length - 1]
          )
        ) {
          edge.isActive = true;
          checkIndexes.push(i);
        }
      }
    }
  }
  /**
   * 根据边上的一些点，判断边是否是垂直的
   * @param pointCoords 边上的一些点
   */
  static isVertical(pointCoords: Coord[]) {
    return pointCoords[0].x === pointCoords[1].x;
  }

  /**
   * 终端打印
   * @param game
   * @param edges
   */
  static printEdges(game: Game, edges: Edge[]) {
    // console.table(
    //   edges.map((edge) => ({
    //     isActive: edge.isActive,
    //     pointCoords: edge.pointCoords
    //       .map((coord) => '(' + coord.x + ',' + coord.y + ')')
    //       .join('  '),
    //     isVertical: GameUtil.isVertical(edge.pointCoords) ? '|' : '-',
    //   }))
    // );
    const arrForPrint = Array(game.rowsLen * 2 + 3)
      .fill(0)
      .map(() =>
        Array(game.colsLen * 2 + 3)
          .fill(0)
          .map(() => '  ')
      );

    for (let ri = 0; ri < game.rowsLen + 1; ri++) {
      for (let ci = 0; ci < game.colsLen + 1; ci++) {
        const coord = { x: ci - 1, y: ri - 1 };
        if (coord.x >= 0 && coord.y >= 0 && coord.x < game.colsLen && coord.y < game.rowsLen) {
          if (GameUtil.isCoordInCoords(game.pointCoords, coord)) {
            arrForPrint[ri * 2][ci * 2] = 'OO';
          } else {
            arrForPrint[ri * 2][ci * 2] = '++';
          }
        }
      }
    }

    arrForPrint[(game.startCoord.y + 1) * 2][(game.startCoord.x + 1) * 2] = '>>';
    arrForPrint[(game.endCoord.y + 1) * 2][(game.endCoord.x + 1) * 2] = '$$';
    arrForPrint[(game.endCoord.y + 1) * 2][(game.endCoord.x + 1) * 2 - 1] = '++';

    edges.forEach((edge, ei) => {
      let char = String.fromCharCode(65 + ei);
      if (!edge.isActive) {
        char = char.toLowerCase();
      }
      let str = char + char;
      for (let pi = 0; pi < edge.pointCoords.length - 1; pi++) {
        const current = edge.pointCoords[pi];
        const next = edge.pointCoords[pi + 1];
        const ri = current.y + next.y + 2;
        const ci = current.x + next.x + 2;
        if (ri % 2 === 1) {
          str = '||';
        } else {
          str = '==';
        }
        arrForPrint[ri][ci] = str;
      }
    });
    arrForPrint.map((rowForPrint) => rowForPrint.join('')).join('\n');
    console.log(arrForPrint.map((rowForPrint) => rowForPrint.join('')).join('\n'));
  }
}
