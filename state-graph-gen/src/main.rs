//! plank-puzzle 全量状态图生成器
//!
//! 对每个关卡从初始局面做广度优先搜索，枚举全部合法移动，
//! 生成"局面为节点、移动为边"的图，输出为 3d-force-graph 可读取的 JSON。
//!
//! 移动规则（与前端 play.vue 交互语义 / game.ts 求解器一致）：
//!   局面 = 木板(线段)集合 + 激活标记。激活 = 与"最近放置的木板"端点连通的分量
//!   （初始局面为与起点岸边木板连通的分量）。
//!   一步移动：取某个激活木板的一个端点 P 作为锚点，选择一个长度 L
//!   （必须是当前某块激活木板的长度，即被拿起的木板），
//!   在上下左右四个方向之一放置一块新木板 (P, P±L)：
//!     - 远端必须是合法点（棋盘点 / 起点岸 / 终点岸）
//!     - 木板中间不能压着棋盘点
//!     - 被拿起的木板（长度 L 的激活木板）从盘面移除
//!     - 新木板不能与其余木板重叠（同向共线共享>=2个点）或交叉（异向共享1个非端点）
//!   放置后激活集合 = 新木板的连通分量。
//!   新木板远端落在终点 (colsLen, endY) 上 => 获胜，该局面为终局不再扩展。
//!
//! 注：game.ts / random.go 的 nextSteps 中 canMove 标志在"同长度候选板"循环间
//! 不复位，会漏掉部分转移；本生成器实现完整的正确转移关系（与 UI 一致），
//! 因此求出的最短获胜步数 <= 关卡记录的 solutionStepsLen。

use std::collections::{HashMap, HashSet, VecDeque};
use std::fs;
use std::time::Instant;

/// 点编码: (x+1)*8 + (y+1)，x ∈ [-1, cols]，y ∈ [0, rows-1]
#[inline]
fn pack_pt(x: i8, y: i8) -> u8 {
    ((x + 1) * 8 + (y + 1)) as u8
}

#[inline]
fn unpack_pt(p: u8) -> (i8, i8) {
    (p as i8 / 8 - 1, p as i8 % 8 - 1)
}

/// 木板编码: (p_min << 7) | (p_max << 1) | active
#[inline]
fn pack_edge(p1: u8, p2: u8, active: bool) -> u16 {
    let (a, b) = if p1 < p2 { (p1, p2) } else { (p2, p1) };
    ((a as u16) << 7) | ((b as u16) << 1) | active as u16
}

#[inline]
fn ep1(e: u16) -> u8 {
    ((e >> 7) & 63) as u8
}

#[inline]
fn ep2(e: u16) -> u8 {
    ((e >> 1) & 63) as u8
}

#[inline]
fn is_active(e: u16) -> bool {
    e & 1 == 1
}

/// 木板长度（单位格数）
#[inline]
fn edge_len(e: u16) -> u8 {
    let (a, b) = (ep1(e), ep2(e));
    if a / 8 == b / 8 {
        b % 8 - a % 8
    } else {
        b / 8 - a / 8
    }
}

/// 木板是否竖直
#[inline]
fn is_vertical(e: u16) -> bool {
    ep1(e) / 8 == ep2(e) / 8
}

/// 木板覆盖的所有点（含端点）
fn edge_points(e: u16) -> Vec<u8> {
    let (a, b) = (ep1(e), ep2(e));
    let mut pts = Vec::new();
    if a / 8 == b / 8 {
        // vertical
        for y in a % 8..=b % 8 {
            pts.push((a / 8) * 8 + y);
        }
    } else {
        for x in a / 8..=b / 8 {
            pts.push(x * 8 + a % 8);
        }
    }
    pts
}

/// 两块木板是否重叠（同向共线共享>=2点）或交叉（异向共享1个非端点）
fn coincide_or_cross(ea: u16, eb: u16) -> bool {
    let pa = edge_points(ea);
    let pb = edge_points(eb);
    let shared: Vec<u8> = pa.iter().copied().filter(|p| pb.contains(p)).collect();
    if is_vertical(ea) == is_vertical(eb) {
        shared.len() >= 2
    } else if shared.len() == 1 {
        let s = shared[0];
        s != ep1(ea) && s != ep2(ea) && s != ep1(eb) && s != ep2(eb)
    } else {
        false
    }
}

/// 重算激活集合：从 edges[start_idx] 出发的连通分量（共享端点即连通）
fn compute_active(edges: &mut [u16], start_idx: usize) {
    for e in edges.iter_mut() {
        *e &= !1u16;
    }
    edges[start_idx] |= 1;
    let mut queue = vec![start_idx];
    while let Some(i) = queue.pop() {
        let (a1, a2) = (ep1(edges[i]), ep2(edges[i]));
        for k in 0..edges.len() {
            if edges[k] & 1 == 1 {
                continue;
            }
            let (b1, b2) = (ep1(edges[k]), ep2(edges[k]));
            if a1 == b1 || a1 == b2 || a2 == b1 || a2 == b2 {
                edges[k] |= 1;
                queue.push(k);
            }
        }
    }
}

/// 木板可读描述，如 "(-1,3)-(1,3)"
fn edge_desc(e: u16) -> String {
    let (x1, y1) = unpack_pt(ep1(e));
    let (x2, y2) = unpack_pt(ep2(e));
    format!("({},{})-({},{})", x1, y1, x2, y2)
}

struct Level {
    idx: usize,
    rows: i8,
    cols: i8,
    start_y: i8,
    end_y: i8,
    points: Vec<(i8, i8)>,
    edges: Vec<((i8, i8), (i8, i8))>,
    solution_steps: usize,
}

fn parse_levels(text: &str) -> Vec<Level> {
    let mut levels = Vec::new();
    for (i, line) in text.lines().filter(|l| !l.trim().is_empty()).enumerate() {
        let parts: Vec<&str> = line.trim().split("====").collect();
        let rows = parts[0][0..2].parse::<i8>().unwrap();
        let cols = parts[0][2..4].parse::<i8>().unwrap();
        let start_y = parts[1][0..2].parse::<i8>().unwrap();
        let end_y = parts[1][2..4].parse::<i8>().unwrap();
        let mut points = Vec::new();
        let pts = parts[2].as_bytes();
        let mut k = 0;
        while k + 4 <= pts.len() {
            let x = std::str::from_utf8(&pts[k..k + 2]).unwrap().parse::<i8>().unwrap();
            let y = std::str::from_utf8(&pts[k + 2..k + 4]).unwrap().parse::<i8>().unwrap();
            points.push((x, y));
            k += 4;
        }
        let mut edges = Vec::new();
        let es = parts[3].as_bytes();
        let mut k = 0;
        while k + 8 <= es.len() {
            let x1 = std::str::from_utf8(&es[k..k + 2]).unwrap().parse::<i8>().unwrap();
            let y1 = std::str::from_utf8(&es[k + 2..k + 4]).unwrap().parse::<i8>().unwrap();
            let x2 = std::str::from_utf8(&es[k + 4..k + 6]).unwrap().parse::<i8>().unwrap();
            let y2 = std::str::from_utf8(&es[k + 6..k + 8]).unwrap().parse::<i8>().unwrap();
            edges.push(((x1, y1), (x2, y2)));
            k += 8;
        }
        let solution_steps = parts[4].parse::<usize>().unwrap();
        levels.push(Level {
            idx: i + 1,
            rows,
            cols,
            start_y,
            end_y,
            points,
            edges,
            solution_steps,
        });
    }
    levels
}

struct NodeData {
    state: Vec<u16>,
    depth: u32,
    is_win: bool,
}

struct LevelResult {
    nodes: usize,
    links: usize,
    win_nodes: usize,
    min_win_depth: Option<u32>,
    expected_steps: usize,
    shortest_solutions: f64,
    bottleneck: f64,
    mean_branching: f64,
    off_path: f64,
    corridor: f64,
    difficulty: f64,
    json: String,
}

fn solve_level(level: &Level) -> LevelResult {
    // 合法点集合（棋盘点 + 起点岸 + 终点岸）
    let mut valid = [false; 64];
    let mut pegs = [false; 64]; // 仅棋盘点（用于中途压点检查）
    let start_pt = pack_pt(-1, level.start_y);
    let end_pt = pack_pt(level.cols, level.end_y);
    valid[start_pt as usize] = true;
    valid[end_pt as usize] = true;
    for &(x, y) in &level.points {
        let p = pack_pt(x, y);
        valid[p as usize] = true;
        pegs[p as usize] = true;
    }

    // 初始局面：全部木板 + 从起点木板出发的连通分量置激活
    let mut init: Vec<u16> = level
        .edges
        .iter()
        .map(|&((x1, y1), (x2, y2))| pack_edge(pack_pt(x1, y1), pack_pt(x2, y2), false))
        .collect();
    let start_edge_idx = init
        .iter()
        .position(|&e| ep1(e) == start_pt || ep2(e) == start_pt)
        .expect("level must have a start edge");
    compute_active(&mut init, start_edge_idx);
    init.sort_unstable();
    // 防御：初始即胜（正常关卡不会出现）
    let init_win = init
        .iter()
        .any(|&e| ep1(e) == end_pt || ep2(e) == end_pt);

    let mut index: HashMap<Vec<u16>, u32> = HashMap::new();
    let mut nodes: Vec<NodeData> = Vec::new();
    let mut links: Vec<(u32, u32, String)> = Vec::new();
    let mut link_seen: HashSet<(u32, u32)> = HashSet::new();
    let mut queue: VecDeque<u32> = VecDeque::new();

    index.insert(init.clone(), 0);
    nodes.push(NodeData {
        state: init,
        depth: 0,
        is_win: init_win,
    });
    if !init_win {
        queue.push_back(0);
    }

    while let Some(ni) = queue.pop_front() {
        let state = nodes[ni as usize].state.clone();
        let depth = nodes[ni as usize].depth;

        // 激活木板按长度分组
        let mut by_len: HashMap<u8, Vec<usize>> = HashMap::new();
        for (i, &e) in state.iter().enumerate() {
            if is_active(e) {
                by_len.entry(edge_len(e)).or_default().push(i);
            }
        }

        for (_, js) in by_len.iter() {
            let l = edge_len(state[js[0]]);
            // 遍历所有激活木板作为锚点提供者
            for (_, &e) in state.iter().enumerate() {
                if !is_active(e) {
                    continue;
                }
                for &anchor in &[ep1(e), ep2(e)] {
                    let (ax, ay) = unpack_pt(anchor);
                    let li = l as i8;
                    for (dx, dy) in [(li, 0i8), (-li, 0i8), (0i8, li), (0i8, -li)] {
                        let fx = ax + dx;
                        let fy = ay + dy;
                        if fx < -1 || fx > level.cols || fy < 0 || fy >= level.rows {
                            continue;
                        }
                        let far = pack_pt(fx, fy);
                        if !valid[far as usize] {
                            continue;
                        }
                        // 中途不能压棋盘点
                        let mut blocked = false;
                        if l > 1 {
                            let sx = dx / l as i8;
                            let sy = dy / l as i8;
                            for s in 1..l as i8 {
                                let mid = pack_pt(ax + sx * s, ay + sy * s);
                                if pegs[mid as usize] {
                                    blocked = true;
                                    break;
                                }
                            }
                        }
                        if blocked {
                            continue;
                        }
                        let new_e = pack_edge(anchor, far, true);
                        let is_win = far == end_pt;
                        // 拿起一块长度为 L 的激活木板，放到新位置
                        for &j in js {
                            let mut overlap = false;
                            for (k, &other) in state.iter().enumerate() {
                                if k == j {
                                    continue;
                                }
                                if coincide_or_cross(other, new_e) {
                                    overlap = true;
                                    break;
                                }
                            }
                            if overlap {
                                continue;
                            }
                            let mut next: Vec<u16> = state
                                .iter()
                                .enumerate()
                                .filter(|(k, _)| *k != j)
                                .map(|(_, &e2)| e2 & !1)
                                .collect();
                            next.push(new_e);
                            let last = next.len() - 1;
                            compute_active(&mut next, last);
                            next.sort_unstable();

                            let dst = match index.get(&next) {
                                Some(&d) => d,
                                None => {
                                    let d = nodes.len() as u32;
                                    nodes.push(NodeData {
                                        state: next.clone(),
                                        depth: depth + 1,
                                        is_win,
                                    });
                                    index.insert(next, d);
                                    if !is_win {
                                        queue.push_back(d);
                                    }
                                    d
                                }
                            };
                            if dst != ni && link_seen.insert((ni, dst)) {
                                let mv = format!("{}->{}", edge_desc(state[j]), edge_desc(new_e));
                                links.push((ni, dst, mv));
                            }
                        }
                    }
                }
            }
        }
    }

    // 统计 + 组装 JSON
    let win_nodes = nodes.iter().filter(|n| n.is_win).count();
    let min_win_depth = nodes
        .iter()
        .filter(|n| n.is_win)
        .map(|n| n.depth)
        .min();
    let max_depth = nodes.iter().map(|n| n.depth).max().unwrap_or(0);

    // ===== 难度评估指标 =====
    // 难度 = 100 * (0.35*L + 0.25*C + 0.20*T + 0.20*B)
    //   L 长度:   1 - exp(-D/12)                        D=最短步数
    //   C 集中度: Σ crit(s)^2 / (D-1)（中间层关键局面）  crit(s)=经过s的最短解占比
    //   T 迷路度: 不在任何最短解路线上的局面占比（含到不了获胜的死路局面；实测本作死路为0）
    //   B 发散度: 0.5*(1-exp(-N/1500)) + 0.5*min(1,(β-1)/5)  N=局面数 β=平均分支
    let nv = nodes.len();
    let d_min = min_win_depth.unwrap_or(0);
    let mut out_adj: Vec<Vec<u32>> = vec![Vec::new(); nv];
    let mut rev_adj: Vec<Vec<u32>> = vec![Vec::new(); nv];
    for &(s, t, _) in &links {
        out_adj[s as usize].push(t);
        rev_adj[t as usize].push(s);
    }
    // 反向 BFS：各局面到最近获胜局面的步数
    let mut d_win: Vec<Option<u32>> = vec![None; nv];
    let mut qr: VecDeque<usize> = VecDeque::new();
    for (i, nd) in nodes.iter().enumerate() {
        if nd.is_win {
            d_win[i] = Some(0);
            qr.push_back(i);
        }
    }
    while let Some(u) = qr.pop_front() {
        for &v in &rev_adj[u] {
            if d_win[v as usize].is_none() {
                d_win[v as usize] = Some(d_win[u].unwrap() + 1);
                qr.push_back(v as usize);
            }
        }
    }
    // 迷路度：不在任何最短解路线上的局面占比（d_win 与前向深度不互补即偏离）
    let off_path = nodes
        .iter()
        .enumerate()
        .filter(|(i, nd)| d_win[*i] != Some(d_min - nd.depth))
        .count() as f64 / nv as f64;
    // 前向最短路径计数（nodes 为 BFS 发现顺序，depth 单调不减）
    let mut np = vec![0f64; nv];
    np[0] = 1.0;
    for i in 0..nv {
        if np[i] == 0.0 {
            continue;
        }
        for &t in &out_adj[i] {
            if nodes[t as usize].depth == nodes[i].depth + 1 {
                np[t as usize] += np[i];
            }
        }
    }
    let shortest_solutions: f64 = nodes
        .iter()
        .enumerate()
        .filter(|(_, nd)| nd.is_win && nd.depth == d_min)
        .map(|(i, _)| np[i])
        .sum();
    // 后向最短路径计数：按 d_win 升序，m[u] = Σ m[v] (u→v 且 d_win[v]=d_win[u]-1)
    let mut m = vec![0f64; nv];
    let mut order: Vec<usize> = (0..nv).filter(|&i| d_win[i].is_some()).collect();
    order.sort_by_key(|&i| d_win[i].unwrap());
    for &u in &order {
        if nodes[u].is_win {
            m[u] = 1.0;
            continue;
        }
        let dw = d_win[u].unwrap();
        let mut acc = 0.0;
        for &v in &out_adj[u] {
            if d_win[v as usize] == Some(dw - 1) {
                acc += m[v as usize];
            }
        }
        m[u] = acc;
    }
    // 关键局面（在最短路线上的中间层局面）
    let mut corridor_sum = 0.0;
    let mut bottleneck = 0.0;
    if d_min > 1 && shortest_solutions > 0.0 {
        for (i, nd) in nodes.iter().enumerate() {
            if nd.depth == 0 || nd.depth >= d_min {
                continue;
            }
            if np[i] <= 0.0 || d_win[i] != Some(d_min - nd.depth) {
                continue;
            }
            let crit = np[i] * m[i] / shortest_solutions;
            corridor_sum += crit * crit;
            if crit > bottleneck {
                bottleneck = crit;
            }
        }
    }
    let corridor = if d_min > 1 {
        corridor_sum / (d_min - 1) as f64
    } else {
        0.0
    };
    let mean_branching = links.len() as f64 / (nv - win_nodes).max(1) as f64;
    let t_len = 1.0 - (-(d_min as f64) / 12.0).exp();
    let t_branch = 0.5 * (1.0 - (-(nv as f64) / 1500.0).exp())
        + 0.5 * (((mean_branching - 1.0) / 5.0).clamp(0.0, 1.0));
    let difficulty =
        100.0 * (0.35 * t_len + 0.25 * corridor + 0.20 * off_path + 0.20 * t_branch);

    let mut json = String::with_capacity(nodes.len() * 160 + links.len() * 90);
    json.push_str("{\n");
    json.push_str(&format!(
        "  \"level\": {},\n  \"rowsLen\": {},\n  \"colsLen\": {},\n  \"startY\": {},\n  \"endY\": {},\n  \"solutionStepsLen\": {},\n",
        level.idx, level.rows, level.cols, level.start_y, level.end_y, level.solution_steps
    ));
    json.push_str("  \"points\": [");
    for (i, &(x, y)) in level.points.iter().enumerate() {
        if i > 0 {
            json.push(',');
        }
        json.push_str(&format!("[{},{}]", x, y));
    }
    json.push_str("],\n");
    json.push_str(&format!(
        "  \"stats\": {{\"nodes\": {}, \"links\": {}, \"winNodes\": {}, \"minWinDepth\": {}, \"maxDepth\": {}, \"matchesExpected\": {}}},\n",
        nodes.len(),
        links.len(),
        win_nodes,
        min_win_depth.map(|d| d.to_string()).unwrap_or_else(|| "null".into()),
        max_depth,
        min_win_depth == Some(level.solution_steps as u32)
    ));
    json.push_str(&format!(
        "  \"difficulty\": {{\"score\": {:.2}, \"shortestSolutions\": {:.0}, \"bottleneck\": {:.4}, \"corridor\": {:.4}, \"offPathFrac\": {:.4}, \"meanBranching\": {:.3}}},\n",
        difficulty, shortest_solutions, bottleneck, corridor, off_path, mean_branching
    ));
    json.push_str("  \"nodes\": [\n");
    for (i, n) in nodes.iter().enumerate() {
        let active_count = n.state.iter().filter(|e| is_active(**e)).count();
        json.push_str("    {\"id\": ");
        json.push_str(&i.to_string());
        json.push_str(", \"depth\": ");
        json.push_str(&n.depth.to_string());
        json.push_str(", \"isStart\": ");
        json.push_str(if i == 0 { "true" } else { "false" });
        json.push_str(", \"isWin\": ");
        json.push_str(if n.is_win { "true" } else { "false" });
        json.push_str(", \"activeEdges\": ");
        json.push_str(&active_count.to_string());
        json.push_str(", \"edges\": [");
        for (k, &e) in n.state.iter().enumerate() {
            if k > 0 {
                json.push(',');
            }
            json.push('"');
            json.push_str(&edge_desc(e));
            if is_active(e) {
                json.push('*');
            }
            json.push('"');
        }
        json.push_str("]}");
        if i + 1 < nodes.len() {
            json.push(',');
        }
        json.push('\n');
    }
    json.push_str("  ],\n  \"links\": [\n");
    for (i, (s, t, mv)) in links.iter().enumerate() {
        json.push_str(&format!(
            "    {{\"source\": {}, \"target\": {}, \"move\": \"{}\"}}",
            s, t, mv
        ));
        if i + 1 < links.len() {
            json.push(',');
        }
        json.push('\n');
    }
    json.push_str("  ]\n}\n");

    LevelResult {
        nodes: nodes.len(),
        links: links.len(),
        win_nodes,
        min_win_depth,
        expected_steps: level.solution_steps,
        shortest_solutions,
        bottleneck,
        mean_branching,
        off_path,
        corridor,
        difficulty,
        json,
    }
}

fn main() {
    let levels = parse_levels(include_str!("../levels.txt"));
    println!("parsed {} levels", levels.len());

    let out_dir = "C:/Projects/plank-puzzle/state-graphs";
    fs::create_dir_all(out_dir).unwrap();

    let t0 = Instant::now();
    let mut total_nodes = 0usize;
    let mut total_links = 0usize;
    let mut mismatch = 0usize;
    let mut shorter = 0usize;

    let mut summary_json = String::from("{\"levels\": [\n");
    // (关卡号, 最短步数, 难度分, 其他指标) 用于榜单与排名对比
    let mut board: Vec<(usize, u32, f64)> = Vec::new();

    for level in &levels {
        let r = solve_level(level);
        fs::write(
            format!("{}/level-{:03}.json", out_dir, level.idx),
            &r.json,
        )
        .unwrap();
        total_nodes += r.nodes;
        total_links += r.links;
        let matched = r.min_win_depth == Some(r.expected_steps as u32);
        let is_shorter = r.min_win_depth.map(|d| d < r.expected_steps as u32).unwrap_or(false);
        if !matched {
            mismatch += 1;
        }
        if is_shorter {
            shorter += 1;
        }
        println!(
            "level {:3}: D={:2} score={:6.2} N={:6} beta={:5.2} lost={:5.1}% corridor={:5.3} nsp={:9.0} {}",
            level.idx,
            r.min_win_depth.unwrap_or(0),
            r.difficulty,
            r.nodes,
            r.mean_branching,
            r.off_path * 100.0,
            r.corridor,
            r.shortest_solutions,
            if matched { "" } else if is_shorter { "SHORTER" } else { "MISMATCH" }
        );
        board.push((level.idx, r.min_win_depth.unwrap_or(0), r.difficulty));
        summary_json.push_str(&format!(
            "  {{\"level\": {}, \"nodes\": {}, \"links\": {}, \"winNodes\": {}, \"minWinDepth\": {}, \"expectedSteps\": {}, \"matchesExpected\": {}, \"difficulty\": {:.2}, \"shortestSolutions\": {:.0}, \"bottleneck\": {:.4}, \"corridor\": {:.4}, \"offPathFrac\": {:.4}, \"meanBranching\": {:.3}}},\n",
            level.idx,
            r.nodes,
            r.links,
            r.win_nodes,
            r.min_win_depth.map(|d| d.to_string()).unwrap_or_else(|| "null".into()),
            r.expected_steps,
            matched,
            r.difficulty,
            r.shortest_solutions,
            r.bottleneck,
            r.corridor,
            r.off_path,
            r.mean_branching
        ));
    }

    // 按难度降序的榜单
    let mut ranked = board.clone();
    ranked.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap().then(a.0.cmp(&b.0)));
    let mut rank_json = String::from("\n\"rankedByDifficulty\": [\n");
    for (i, &(idx, d, score)) in ranked.iter().enumerate() {
        rank_json.push_str(&format!(
            "  {{\"rank\": {}, \"level\": {}, \"score\": {:.2}, \"steps\": {}}}{}\n",
            i + 1,
            idx,
            score,
            d,
            if i + 1 < ranked.len() { "," } else { "" }
        ));
    }
    rank_json.push_str("],\n");

    // 新旧排名对比：旧=按最短步数降序，新=按难度降序
    let mut by_steps = board.clone();
    by_steps.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    let old_rank = |idx: usize| -> usize {
        by_steps.iter().position(|&(i, _, _)| i == idx).unwrap() + 1
    };
    println!("\n===== 难度榜 TOP10（难度 = 0.35L长度 + 0.25C关键局面集中度 + 0.20T迷路度 + 0.20B发散度） =====");
    for (i, &(idx, d, score)) in ranked.iter().take(10).enumerate() {
        println!(
            "#{:2}  level {:3}  score={:6.2}  D={:2}(旧排名#{:2})",
            i + 1,
            idx,
            score,
            d,
            old_rank(idx)
        );
    }
    let mut movers: Vec<(i32, usize, u32, f64)> = ranked
        .iter()
        .enumerate()
        .map(|(i, &(idx, d, s))| (old_rank(idx) as i32 - (i + 1) as i32, idx, d, s))
        .collect();
    movers.sort_by(|a, b| b.0.abs().cmp(&a.0.abs()));
    println!("\n===== 新旧排名差异最大的关卡（+表示比纯步数排名更难） =====");
    for &(delta, idx, d, s) in movers.iter().take(6) {
        println!("level {:3}: D={:2} score={:6.2} 排名变化 {:+}", idx, d, s, delta);
    }

    summary_json.push_str(&format!(
        "], {}\"totals\": {{\"levels\": {}, \"nodes\": {}, \"links\": {}, \"mismatches\": {}, \"shorterThanRecorded\": {}}}}}\n",
        rank_json,
        levels.len(), total_nodes, total_links, mismatch, shorter
    ));
    // 去掉最后一个 level 行的尾逗号
    if let Some(pos) = summary_json.rfind("},\n],") {
        summary_json.replace_range(pos..pos + 4, "}]");
    }
    fs::write(format!("{}/summary.json", out_dir), &summary_json).unwrap();

    println!(
        "\ndone in {:?}: {} levels, {} nodes, {} links total, {} mismatches ({} shorter than recorded)",
        t0.elapsed(),
        levels.len(),
        total_nodes,
        total_links,
        mismatch,
        shorter
    );
}
