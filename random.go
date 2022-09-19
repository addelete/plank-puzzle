package main

import (
	"fmt"
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Edge struct {
	Points   []int
	IsActive bool
}

type Pos struct {
	X int
	Y int
}

type Game struct {
	ColsLen  int
	RowsLen  int
	StartPos Pos
	EndPos   Pos
	Points   []int
	Edges    []Edge
	StepSet  map[string]bool
}

type Step struct {
	Edges    []Edge
	PrevStep *Step
}

func main() {
	for {
		games := randomGame()
		for _, game := range games {
			win, solution := game.Solve()
			if win && len(solution) > 15 {
				game.printEdges(game.Edges)
				println("有解", len(solution))
				println(game.toString())
			}
		}
	}
}

func randomGame() []Game {
	rand.Seed(time.Now().UnixNano())
	rowsLen := 6
	colsLen := 6
	game := Game{
		ColsLen:  colsLen,
		RowsLen:  rowsLen,
		StartPos: Pos{X: -1, Y: rand.Intn(rowsLen)},
		EndPos:   Pos{X: colsLen, Y: rand.Intn(rowsLen)},
	}

	startEdgeEndX := rand.Intn(colsLen - 1)
	startEdgeEndPos := Pos{X: startEdgeEndX, Y: game.StartPos.Y}
	points := make([]int, 0)
	points = append(points, game.pos2Point(startEdgeEndPos))
	pointsSet := make(map[int]bool)
	pointsSet[game.pos2Point(startEdgeEndPos)] = true

	edges := make([]Edge, 0)
	edges = append(edges, Edge{Points: game.fillPointList(game.StartPos, startEdgeEndPos), IsActive: true})

	edgesSet := make(map[int]bool)
	edgesSet[game.pos2Point(game.StartPos)*100+game.pos2Point(startEdgeEndPos)] = true

	edgesLen := rand.Intn(4) + 2

	for i := 1; i < edgesLen; i++ {
		for {
			startX := rand.Intn(colsLen)
			startY := rand.Intn(rowsLen)
			endX := rand.Intn(colsLen)
			endY := rand.Intn(rowsLen)
			if rand.Intn(1) == 0 {
				endX = startX
			} else {
				endY = startY
			}

			if startX == endX && startY == endY {
				continue
			}

			edgeEndpoints := []int{
				game.pos2Point(Pos{X: startX, Y: startY}),
				game.pos2Point(Pos{X: endX, Y: endY}),
			}

			sort.Ints(edgeEndpoints)
			edgeHashCode := edgeEndpoints[0]*100 + edgeEndpoints[1]
			if _, ok := edgesSet[edgeHashCode]; !ok {
				edgePoints := game.fillPointList(Pos{X: startX, Y: startY}, Pos{X: endX, Y: endY})
				can := true
				for _, edge := range edges {
					isCoincideOrCross := game.isCoincideOrCross2(edgePoints, edge.Points)
					if isCoincideOrCross {
						can = false
						break
					}
				}
				if !can {
					continue
				}
				edgesSet[edgeHashCode] = true
				newEdge := Edge{Points: game.fillPointList(Pos{X: startX, Y: startY}, Pos{X: endX, Y: endY}), IsActive: false}
				edges = append(edges, newEdge)

				for _, point := range edgeEndpoints {
					if _, ok := pointsSet[point]; !ok {
						pointsSet[point] = true
						points = append(points, point)
					}
				}
				break
			}

		}
	}

	game.Edges = edges

	pointsLen := rand.Intn(4) + 12

	for i := len(points); i < pointsLen; i++ {
		check := 1000
		for check > 0 {
			check--
			point := rand.Intn(rowsLen * colsLen)
			can := true
			for _, edge := range game.Edges {
				if len(edge.Points) == 2 {
					continue
				}
				if containsInt(edge.Points[1:len(edge.Points)-1], point) {
					can = false
					break
				}
			}
			if !can {
				continue
			}
			if _, ok := pointsSet[point]; !ok {
				pointsSet[point] = true
				points = append(points, point)
				break
			}
		}
	}

	game.Points = points

	game.calcEdgesIsActive(&game.Edges, 0)
	hashCode := game.edgesToHash(game.Edges)

	games := make([]Game, game.RowsLen)
	for i := 0; i < game.RowsLen; i++ {
		g := Game{
			ColsLen:  colsLen,
			RowsLen:  rowsLen,
			StartPos: game.StartPos,
			EndPos:   Pos{X: colsLen, Y: i % game.RowsLen},
			Points:   game.Points,
			Edges:    game.Edges,
		}
		g.StepSet = make(map[string]bool)
		g.StepSet[hashCode] = true
		games[i] = g
	}
	return games
}

func str2game(str string) Game {
	strSlice := strings.Split(str, "====")
	rowsLen, _ := strconv.Atoi(strSlice[0][:2])
	colsLen, _ := strconv.Atoi(strSlice[0][2:])
	startY, _ := strconv.Atoi(strSlice[1][:2])
	endY, _ := strconv.Atoi(strSlice[1][2:])
	startPos := Pos{X: -1, Y: startY}
	endPos := Pos{X: colsLen, Y: endY}
	game := Game{
		ColsLen:  colsLen,
		RowsLen:  rowsLen,
		StartPos: startPos,
		EndPos:   endPos,
	}
	game.Points = make([]int, len(strSlice[2])/4)
	for i := 0; i < len(strSlice[2])/4; i++ {
		x, _ := strconv.Atoi(strSlice[2][4*i : 4*i+2])
		y, _ := strconv.Atoi(strSlice[2][4*i+2 : 4*i+4])
		game.Points[i] = game.pos2Point(Pos{X: x, Y: y})
	}
	game.Edges = make([]Edge, len(strSlice[3])/8)
	firstActiveEdgeIndex := -1
	for i := 0; i < len(strSlice[3])/8; i++ {
		x1, _ := strconv.Atoi(strSlice[3][8*i : 8*i+2])
		y1, _ := strconv.Atoi(strSlice[3][8*i+2 : 8*i+4])
		x2, _ := strconv.Atoi(strSlice[3][8*i+4 : 8*i+6])
		y2, _ := strconv.Atoi(strSlice[3][8*i+6 : 8*i+8])
		if x1 == -1 && y1 == startY || x2 == -1 && y2 == startY {
			firstActiveEdgeIndex = i
		}
		game.Edges[i] = Edge{
			Points:   game.fillPointList(Pos{X: x1, Y: y1}, Pos{X: x2, Y: y2}),
			IsActive: firstActiveEdgeIndex == i,
		}
	}
	game.calcEdgesIsActive(&game.Edges, firstActiveEdgeIndex)
	game.StepSet = make(map[string]bool)
	game.StepSet[game.edgesToHash(game.Edges)] = true
	return game
}

func (game *Game) isPointLess(a int, b int) bool {
	posI := game.point2Pos(a)
	posJ := game.point2Pos(b)
	if posI.Y == posJ.Y {
		return posI.X < posJ.X
	}
	return posI.Y < posJ.Y
}

func (game *Game) toString() string {
	str := ""
	str += fmt.Sprintf("%02d%02d", game.RowsLen, game.ColsLen)
	str += fmt.Sprintf("====%02d%02d", game.StartPos.Y, game.EndPos.Y)
	str += "===="
	sort.Ints(game.Points)
	for _, point := range game.Points {
		pos := game.point2Pos(point)
		str += fmt.Sprintf("%02d%02d", pos.X, pos.Y)
	}
	str += "===="
	for _, edge := range game.Edges {
		sort.Slice(edge.Points, func(i, j int) bool {
			return game.isPointLess(edge.Points[i], edge.Points[j])
		})
	}
	//startPoint := game.pos2Point(game.StartPos)
	sort.Slice(game.Edges, func(i, j int) bool {
		edgesI := game.Edges[i]
		edgesJ := game.Edges[j]
		if edgesI.Points[0] == edgesJ.Points[0] {
			return game.isPointLess(edgesI.Points[1], edgesJ.Points[1])
		}
		return game.isPointLess(edgesI.Points[0], edgesJ.Points[0])
	})
	for _, edge := range game.Edges {
		pos1 := game.point2Pos(edge.Points[0])
		pos2 := game.point2Pos(edge.Points[len(edge.Points)-1])
		str += fmt.Sprintf("%02d%02d%02d%02d", pos1.X, pos1.Y, pos2.X, pos2.Y)
	}
	return str
}

func (game *Game) Solve() (bool, []Step) {
	steps := []Step{
		{
			Edges: game.Edges,
		},
	}
	i := 0
	for len(steps) > 0 {
		i++
		step := steps[0]
		steps = steps[1:]
		isWin, nextSteps := game.nextSteps(step)

		if isWin {
			solution := game.backwardStep(nextSteps[0])
			return true, reverseSolution(solution)
		}
		steps = append(steps, nextSteps...)
	}
	return false, []Step{}
}

func reverseSolution(solution []Step) []Step {
	result := make([]Step, len(solution))
	for i, step := range solution {
		result[len(solution)-i-1] = step
	}
	return result
}

func (game *Game) backwardStep(step Step) []Step {
	solution := []Step{step}
	if step.PrevStep == nil {
		return solution
	} else {
		return append(solution, game.backwardStep(*step.PrevStep)...)
	}
}

func (game *Game) printEdges(edges []Edge) {
	arrForPrint := make([][]string, game.RowsLen*2+4)
	for ri := 0; ri <= game.RowsLen+1; ri++ {
		arrForPrint[ri*2] = make([]string, game.ColsLen*2+4)
		arrForPrint[ri*2+1] = make([]string, game.ColsLen*2+4)
		for ci := 0; ci <= game.ColsLen+1; ci++ {
			arrForPrint[ri*2][ci*2] = "   "
			arrForPrint[ri*2][ci*2+1] = "   "
			arrForPrint[ri*2+1][ci*2] = "   "
			arrForPrint[ri*2+1][ci*2+1] = "   "
		}
	}
	for ri := 0; ri <= game.RowsLen+1; ri++ {
		for ci := 0; ci <= game.ColsLen+1; ci++ {
			pos := Pos{
				X: ci - 1,
				Y: ri - 1,
			}
			point := game.pos2Point(pos)
			if point >= 0 && point <= game.ColsLen*game.RowsLen+1 {
				if containsInt(game.Points, point) {
					arrForPrint[ri*2][ci*2] = fmt.Sprintf("%03d", point)
				} else {
					arrForPrint[ri*2][ci*2] = "---"
				}
			}
		}
	}

	for ei, edge := range edges {
		char := string([]byte{byte(65 + ei)})
		if !edge.IsActive {
			char = strings.ToLower(char)
		}
		str := char + char + char
		for pi := 0; pi < len(edge.Points)-1; pi++ {
			ri := game.point2Pos(edge.Points[pi]).Y + game.point2Pos(edge.Points[pi+1]).Y + 2
			ci := game.point2Pos(edge.Points[pi]).X + game.point2Pos(edge.Points[pi+1]).X + 2
			arrForPrint[ri][ci] = str
		}
	}
	for _, rowForPrint := range arrForPrint {
		for _, colForPrint := range rowForPrint {
			fmt.Printf(colForPrint)
		}
		fmt.Println("")
	}
}

func (game *Game) nextSteps(step Step) (bool, []Step) {
	edges := step.Edges
	activeEdgeIndexes := make([]int, 0)
	activeEdgeIndexesGroupByLen := make(map[int][]int)
	activeEdgesLens := make([]int, 0)
	resultSteps := make([]Step, 0)
	for i, edge := range edges {
		if edge.IsActive {
			activeEdgeIndexes = append(activeEdgeIndexes, i)
			edgesLen := len(edge.Points) - 1
			if _, ok := activeEdgeIndexesGroupByLen[edgesLen]; !ok {
				activeEdgeIndexesGroupByLen[edgesLen] = make([]int, 0)
				activeEdgesLens = append(activeEdgesLens, edgesLen)
			}
			activeEdgeIndexesGroupByLen[edgesLen] = append(activeEdgeIndexesGroupByLen[edgesLen], i)
		}
	}
	for _, activeEdgeIndex := range activeEdgeIndexes {
		edge := edges[activeEdgeIndex]
		points := []int{
			edge.Points[0],
			edge.Points[len(edge.Points)-1],
		}
		for _, point := range points {
			pos := game.point2Pos(point)
			for _, activeEdgesLen := range activeEdgesLens {
				nextPosList := []Pos{
					{X: pos.X + activeEdgesLen, Y: pos.Y},
					{X: pos.X - activeEdgesLen, Y: pos.Y},
					{X: pos.X, Y: pos.Y + activeEdgesLen},
					{X: pos.X, Y: pos.Y - activeEdgesLen},
				}
				for _, nextPos := range nextPosList {

					nextPoint := game.pos2Point(nextPos)
					if game.isRightfulPoint(nextPoint) {
						pointList := game.fillPointList(pos, nextPos)
						canMove := true
						if len(pointList) > 2 {
							for _, pointOnEdge := range pointList[1 : len(pointList)-1] {
								if containsInt(game.Points, pointOnEdge) {
									canMove = false
									break
								}
							}
						}

						if !canMove {
							continue
						}

						for _, rightLenActiveEdgeIndex := range activeEdgeIndexesGroupByLen[activeEdgesLen] {
							nextEdges := make([]Edge, len(edges))
							copy(nextEdges, edges)
							for efci, edgeForCopy := range edges {
								if efci == rightLenActiveEdgeIndex {
									nextEdges[efci] = Edge{
										IsActive: true,
										Points:   pointList,
									}
								} else {

									isCoincideOrCross := game.isCoincideOrCross(nextEdges[efci].Points, pointList)
									if isCoincideOrCross {
										canMove = false
										break
									}
									nextEdges[efci] = Edge{
										IsActive: false,
										Points:   edgeForCopy.Points,
									}
								}
							}
							if !canMove {
								continue
							}
							game.calcEdgesIsActive(&nextEdges, rightLenActiveEdgeIndex)

							edgesToHash := game.edgesToHash(nextEdges)
							if _, ok := game.StepSet[edgesToHash]; !ok {
								game.StepSet[edgesToHash] = true
								newStep := Step{
									Edges:    nextEdges,
									PrevStep: &step,
								}
								if nextPoint == game.ColsLen*game.RowsLen+1 {
									return true, []Step{newStep} // 找到了
								}
								resultSteps = append(resultSteps, newStep)
							}
						}

					}
				}
			}
		}
	}
	return false, resultSteps
}

func (game *Game) calcEdgesIsActive(edges *[]Edge, startIndex int) {
	checkIndexes := []int{startIndex}
	for len(checkIndexes) > 0 {
		checkIndex := checkIndexes[0]
		checkIndexes = checkIndexes[1:]
		checkEdge := (*edges)[checkIndex]
		for i, edge := range *edges {
			if edge.IsActive {
				continue
			}
			if edge.Points[0] == checkEdge.Points[len(checkEdge.Points)-1] ||
				edge.Points[len(edge.Points)-1] == checkEdge.Points[0] ||
				edge.Points[0] == checkEdge.Points[0] ||
				edge.Points[len(edge.Points)-1] == checkEdge.Points[len(checkEdge.Points)-1] {
				{
					(*edges)[i].IsActive = true
					checkIndexes = append(checkIndexes, i)
				}
			}
		}
	}
}

func (game *Game) point2Pos(point int) Pos {
	if point == game.ColsLen*game.RowsLen {
		return game.StartPos
	}
	if point == game.ColsLen*game.RowsLen+1 {
		return game.EndPos
	}
	return Pos{X: point % game.ColsLen, Y: point / game.ColsLen}
}

func (game *Game) pos2Point(pos Pos) int {
	if pos.X == game.StartPos.X && pos.Y == game.StartPos.Y {
		return game.ColsLen * game.RowsLen
	}
	if pos.X == game.EndPos.X && pos.Y == game.EndPos.Y {
		return game.ColsLen*game.RowsLen + 1
	}
	if pos.X < 0 || pos.X >= game.ColsLen || pos.Y < 0 || pos.Y >= game.RowsLen {
		return 10000
	}
	return pos.Y*game.ColsLen + pos.X
}

func containsInt(slice []int, element int) bool {
	for _, e := range slice {
		if e == element {
			return true
		}
	}
	return false
}

func (game *Game) isRightfulPoint(point int) bool {
	return (point >= 0 && point < game.ColsLen*game.RowsLen && containsInt(game.Points, point)) || point == game.ColsLen*game.RowsLen || point == game.ColsLen*game.RowsLen+1
}

func (game *Game) isVertical(points []int) bool {
	return game.point2Pos(points[0]).X == game.point2Pos(points[1]).X
}

// IsCoincideOrCross 判断两边重叠或交叠，严格模式，用于生成关卡
// 1. 两边都是水平或垂直, 判断是否重叠，重叠时至少有两个点是重复的
// 2. 两边都是水平或垂直，判断是否交叠，交叠时有一个点是重复的，且此点不在两边的端点上
func (game *Game) isCoincideOrCross2(points1 []int, points2 []int) bool {
	var points []int
	isSameDir := game.isVertical(points1) == game.isVertical(points2)
	for _, pi := range points1 {
		for _, p := range points2 {
			if p == pi {
				points = append(points, pi)
				break
			}
		}
	}
	if isSameDir && len(points) >= 2 {
		return true
	}

	if !isSameDir && len(points) == 1 && (containsInt(points1[1:len(points1)-1], points[0]) || containsInt(points2[1:len(points2)-1], points[0])) {
		return true
	}
	return false
}

// IsCoincideOrCross 判断两边重叠或交叠，非严谨模式，用在计算解
// 1. 两边都是水平或垂直, 判断是否重叠，重叠时至少有两个点是重复的
// 2. 两边都是水平或垂直，判断是否交叠，交叠时有一个点是重复的，且此点不在两边的端点上
func (game *Game) isCoincideOrCross(points1 []int, points2 []int) bool {
	var points []int
	isSameDir := game.isVertical(points1) == game.isVertical(points2)
	for _, pi := range points1 {
		for _, p := range points2 {
			if p == pi {
				points = append(points, pi)
				break
			}
		}
	}
	if isSameDir && len(points) >= 2 {
		return true
	}
	if !isSameDir && len(points) == 1 &&
		points[0] != points1[0] && points[0] != points1[len(points1)-1] &&
		points[0] != points2[0] && points[0] != points2[len(points2)-1] {
		return true
	}
	return false
}

func Bool2Int(b bool) int {
	if b {
		return 1
	}
	return 0
}

func (game *Game) edgesToHash(edges []Edge) string {
	var hash string
	for _, edge := range edges {
		points := []int{edge.Points[0], edge.Points[len(edge.Points)-1]}
		sort.Ints(points)
		hash = hash + "#" + strconv.Itoa(points[0]*1000+points[1]*10+Bool2Int(edge.IsActive))
	}
	return hash
}

func (game *Game) fillPointList(startPos Pos, endPos Pos) []int {
	isVertical := startPos.X == endPos.X
	step := Pos{X: 0, Y: 0}
	if isVertical {
		if startPos.Y > endPos.Y {
			startPos, endPos = endPos, startPos
		}
		step.Y = 1
	} else {
		if startPos.X > endPos.X {
			startPos, endPos = endPos, startPos
		}
		step.X = 1
	}

	pointList := []int{
		game.pos2Point(startPos),
	}
	for {
		if startPos.X == endPos.X && startPos.Y == endPos.Y {
			break
		}
		startPos.X += step.X
		startPos.Y += step.Y
		pointList = append(pointList, game.pos2Point(startPos))
	}
	return pointList
}
