# plank-puzzle 关卡全量状态图

每个文件 `level-NNN.json` 是一个关卡从初始局面出发**所有可达局面**的状态图，
可直接被 [3d-force-graph](https://github.com/vasturiano/3d-force-graph) 读取：

```js
Graph.graphData({ nodes: data.nodes, links: data.links });
```

## 字段说明

顶层：`level / rowsLen / colsLen / startY / endY / solutionStepsLen / points`（关卡元数据）、
`stats`（统计）、`nodes`（节点=局面）、`links`（边=一步移动）。

节点 `nodes[i]`：
- `id`：节点编号（字符串化的索引，0 = 初始局面）
- `depth`：距初始局面的最少步数（BFS 最短）
- `isStart` / `isWin`：初始局面 / 获胜终局（游戏获胜后不再扩展，终局为叶节点）
- `activeEdges`：该局面下激活（玩家可触及）的木板数
- `edges[]`：局面中每块木板 `"(-1,3)-(1,3)"`，带 `*` 后缀表示激活；
  同一布局不同激活分量视为不同局面（玩家位置不同，后续可达集合不同）

边 `links[i]`：
- `source` / `target`：一步移动前后的局面 id
- `move`：`"旧木板位置->新木板位置"`，即被拿起的木板原位置与放置位置

`stats`：`nodes / links / winNodes / minWinDepth`（真实最短获胜步数）` / maxDepth / matchesExpected`。

## 查看

```bash
cd state-graphs && npx http-server -p 8642   # 或任意静态服务器
# 打开 http://127.0.0.1:8642/index.html
```

查看器说明：最短解路径常亮（金色加粗）；悬停节点在鼠标旁渲染局面棋盘；
点击图例"初始/获胜/最短"可放大定位对应节点。需联网加载 CDN 的 3d-force-graph；
JSON 本身无外部依赖。

## 重新生成

```bash
cd ../state-graph-gen && cargo run --release
```

118 关共 77931 个局面、220078 条移动，全量生成约 0.5 秒。

## 难度评估

旧评估只看最短步数 D。新评估基于全量状态图，考虑路径长度、关键局面、迷路风险与状态发散度：

```
难度 = 100 × ( 0.35·L + 0.25·C + 0.20·T + 0.20·B )
```

| 分量 | 含义 | 计算 |
|---|---|---|
| L 长度 | 基础规划长度 | `1 − e^(−D/12)`，饱和增长 |
| C 关键局面集中度 | 解越集中在少数"咽喉局面"，越需要找到唯一关键移动 | 对最短路线上的中间局面 s：`crit(s) = 经过 s 的最短解条数 / 最短解总数`（= 前向路径数 × 后向路径数）；`C = Σ crit(s)² / (D−1)`。唯一解 → 1，路线分散 → 趋近 0 |
| T 迷路度 | 容易走偏的程度 | 不在任何最短解路线上的局面占比（反向 BFS 求 d_win，`d_win(s) ≠ D − depth(s)` 即偏航；含死路局面。实测本作 118 关死路率为 0） |
| B 发散度 | 搜索空间规模 | `0.5·(1 − e^(−N/1500)) + 0.5·min(1,(β−1)/5)`，N=局面数，β=平均合法分支数 |

每关 JSON 的 `difficulty` 字段含：`score`（0-100）、`shortestSolutions`（最短解条数）、
`bottleneck`（最大 crit，全关最关键局面）、`corridor`、`offPathFrac`、`meanBranching`。
`summary.json` 的 `rankedByDifficulty` 为全部关卡按难度排序的榜单。

对照旧"纯步数"排名的主要发现：15 关（D=31）超越 19 关（D=38）成为最难；
99 关（D=15）跃升 77 名（迷路度 99.3%）；61 关（D=18）下降 79 名（82 个局面中 12 条最短解，路线分散容错高）。

## 历史差异说明（已修复）

原版求解器（`game.ts` / `random.go` 的 `nextStep(s)`）曾存在一个枚举 bug：
`canMove` 标志在"同长度候选木板"循环之间不复位，导致部分合法转移被漏掉，
从而使记录的 `solutionStepsLen` 偏长（第 7 关记录 23、第 99 关记录 17）。

该 bug 已于 2026-11-04 修复（每个候选板独立判断重叠冲突），并将这两关的
记录值更正为真实最短（第 7 关 17 步、第 99 关 15 步）。修复后的原版 TS
求解器与本生成器在全部 118 关上结果完全一致（118/118，`matchesExpected` 全 true）。
