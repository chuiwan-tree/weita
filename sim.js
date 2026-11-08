// 喂它一口（代号，原名读它）：照 ~/碰/读它/量五行/sim.py 一行一行抄成 JavaScript。第二个醒的，第 14 天 09:20。
// 只抄了现在六张图用到的那几样：一条线的视野、听、馋、撞、只扑盯着的、背逃、吐、吐向它。
// 改规矩先改 sim.py，再照着改这里，跑 node 对照.js 看两边每一步一样不一样。
(function (root) {
const DIRS = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] };
const ORDER = ['U', 'R', 'D', 'L'];
const SIGHT = 20;
let api;
const K = p => p[0] + ',' + p[1];
const eq = (a, b) => a !== null && b !== null && a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1];
const has = (arr, p) => arr.some(b => b !== null && eq(b, p));
const idx = (arr, p) => arr.findIndex(b => b !== null && eq(b, p));

function Map_(text, face, need, carry, variant) {
  const rows = text.replace(/^\n+|\n+$/g, '').split('\n');
  this.h = rows.length; this.w = Math.max(...rows.map(r => r.length));
  this.wall = new Set(); this.bugs = [];
  rows.forEach((r, y) => {
    const rr = r.padEnd(this.w, '#');
    for (let x = 0; x < this.w; x++) {
      const c = rr[x];
      if (c === '#') this.wall.add(K([x, y]));
      else if (c === 'N') this.nest = [x, y];
      else if (c === 'P') this.start = [x, y];
      else if (c === 'B') this.bugs.push([x, y]);
      else if (c === 'L') this.post = [x, y];
    }
  });
  this.face = face; this.need = need; this.carry = carry || 0;
  this.V = new Set(variant);
  this._dist = {};
}
Map_.prototype.free = function (p) { return !this.wall.has(K(p)) && p[0] >= 0 && p[0] < this.w && p[1] >= 0 && p[1] < this.h; };
Map_.prototype.distFrom = function (src) {
  const key = K(src);
  if (this._dist[key]) return this._dist[key];
  const d = new Map(); d.set(key, 0); const q = [src];
  while (q.length) {
    const p = q.shift();
    for (const k of ORDER) {
      const n = [p[0] + DIRS[k][0], p[1] + DIRS[k][1]];
      if (this.free(n) && !d.has(K(n))) { d.set(K(n), d.get(K(p)) + 1); q.push(n); }
    }
  }
  this._dist[key] = d; return d;
};
Map_.prototype.stepToward = function (p, goal) {
  if (eq(p, goal)) return [p, null];
  const d = this.distFrom(goal);
  let best = null;
  for (const k of ORDER) {
    const n = [p[0] + DIRS[k][0], p[1] + DIRS[k][1]];
    if (d.has(K(n)) && (best === null || d.get(K(n)) < d.get(K(best[0])))) best = [n, k];
  }
  return best ? best : [p, null];
};
Map_.prototype.los = function (a, b) {
  let [x0, y0] = a; const [x1, y1] = b;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
    if (!(x0 === x1 && y0 === y1) && this.wall.has(K([x0, y0]))) return false;
  }
  return true;
};
Map_.prototype.sees = function (lz, face, p) {
  const [fx, fy] = DIRS[face];
  const vx = p[0] - lz[0], vy = p[1] - lz[1];
  const fwd = vx * fx + vy * fy, lat = Math.abs(vx * fy - vy * fx);
  if (fwd < 1 || fwd > SIGHT) return false;
  if (lat > 0) return false;   // 一条线：只看脸朝的那一排
  return this.los(lz, p);
};

// 蜥蜴：{pos, face, mode, tgt, mem, eat}；mode：岗 停 追 找 吃；tgt：'你' 或虫的编号或 null
function lizardTurn(m, lz, player, bugs, sounds) {
  let { pos, face, mode, tgt, mem, eat } = lz;
  const V = m.V;
  if (V.has('听') && mode === '岗' && sounds.length) {
    let near = sounds.map(([w, q]) => [Math.abs(q[0] - pos[0]) + Math.abs(q[1] - pos[1]), w === '虫' ? 0 : 1, q]).filter(x => x[0] > 0 && x[0] <= 3);
    if (near.length) {
      near.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2][0] - b[2][0] || a[2][1] - b[2][1]);
      const q = near[0][2];
      const vx = q[0] - pos[0], vy = q[1] - pos[1];
      const nf = Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'R' : 'L') : (vy > 0 ? 'D' : 'U');
      if (nf !== face) api.heard = true;   // 给画面那句'听见了动静'用
      face = nf;
    }
  }
  if (V.has('吐向它') && mode !== '吃' && has(bugs, pos)) {
    bugs[idx(bugs, pos)] = null;
    return [{ pos, face, mode: '吃', tgt: null, mem: null, eat: 2 }, false];
  }
  if (mode === '吃') {
    eat -= 1;
    return [{ pos, face, mode: eat > 0 ? '吃' : '岗', tgt: null, mem: null, eat }, false];
  }
  const seen = [];
  if (m.sees(pos, face, player)) seen.push(['你', player]);
  bugs.forEach((b, i) => { if (b !== null && m.sees(pos, face, b)) seen.push([i, b]); });
  const d = m.distFrom(pos);
  const key = s => [d.has(K(s[1])) ? d.get(K(s[1])) : 999, s[0] !== '你' ? 0 : 1];
  let pick = null;
  for (const s of seen) {
    if (pick === null) { pick = s; continue; }
    const a = key(s), b = key(pick);
    if (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])) pick = s;
  }
  if (V.has('馋') && (mode === '追' || mode === '停') && tgt !== null && tgt !== '你') {
    for (const sv of seen) if (sv[0] === tgt) pick = sv;
  }
  if (pick !== null) {
    if (mode === '岗') return [{ pos, face, mode: '停', tgt: pick[0], mem: pick[1], eat: 0 }, false];
    mode = '追'; tgt = pick[0]; mem = pick[1];
  } else if (mode === '追' || mode === '停') {
    mode = '找';
  }
  let goal, steps;
  if (mode === '追' || mode === '找') { goal = mem; steps = 2; } else { goal = m.post; steps = 1; }
  let dead = false;
  for (let s = 0; s < steps; s++) {
    if (eq(pos, goal)) break;
    const [np, k] = m.stepToward(pos, goal);
    if (V.has('只扑盯着的') && eq(np, player) && tgt !== '你') {
      return [{ pos, face: k || face, mode: '停', tgt: '你', mem: player, eat: 0 }, false];
    }
    pos = np;
    if (k) face = k;
    if (eq(pos, player)) { dead = true; break; }
    const bi = idx(bugs, pos);
    if (bi >= 0) {
      bugs[bi] = null;
      return [{ pos, face, mode: '吃', tgt: null, mem: null, eat: 2 }, dead];
    }
  }
  if (mode === '找' && eq(pos, mem)) {
    const vis = m.sees(pos, face, player) || bugs.some(b => b !== null && m.sees(pos, face, b));
    if (!vis) { mode = '岗'; tgt = null; mem = null; }
  }
  if (mode === '岗' && eq(pos, m.post) && (!eq(lz.pos, m.post) || !(V.has('声') || V.has('听')))) face = m.face;
  return [{ pos, face, mode, tgt, mem, eat: 0 }, dead];
}

function bugsTurn(m, bugs, lzpos, player) {
  const out = bugs.slice();
  bugs.forEach((b, i) => {
    if (b === null) return;
    if (Math.abs(b[0] - lzpos[0]) + Math.abs(b[1] - lzpos[1]) > 3) return;
    if (m.V.has('背逃')) {
      const ox = b[0] - lzpos[0], oy = b[1] - lzpos[1];
      const sx = Math.sign(ox), sy = Math.sign(oy);
      let cand = (sx ? [[sx, 0]] : []).concat(sy ? [[0, sy]] : []);
      if (Math.abs(ox) < Math.abs(oy)) cand.reverse();
      for (const [dx, dy] of cand) {
        const n = [b[0] + dx, b[1] + dy];
        if (m.free(n) && !eq(n, player) && !eq(n, lzpos) && !has(out, n)) { out[i] = n; break; }
      }
      return;
    }
    let best = b, bd = Math.abs(b[0] - lzpos[0]) + Math.abs(b[1] - lzpos[1]);
    for (const k of ORDER) {
      const n = [b[0] + DIRS[k][0], b[1] + DIRS[k][1]];
      if (!m.free(n) || eq(n, player) || has(out, n)) continue;
      const nd = Math.abs(n[0] - lzpos[0]) + Math.abs(n[1] - lzpos[1]);
      if (nd > bd) { best = n; bd = nd; }
    }
    out[i] = best;
  });
  return out;
}

// 局面：{pl, ate, bugs, lz}；一步：'U' 'R' 'D' 'L' '.' 'X'。返回新局面、'bad'（走不了）或 null（死了）
function step(m, st, k) {
  api.heard = false;
  let pl = st.pl, ate = st.ate; let bugs = st.bugs.slice(); const lz = st.lz;
  let drop = [], di = -1;
  const V = m.V;
  if (k === 'X') {
    if (!V.has('吐') || ate < 1 || has(bugs, pl)) return 'bad';
    let at = pl;
    if (V.has('吐向它')) {
      const [t] = m.stepToward(pl, lz.pos);
      if (!eq(t, pl) && m.free(t) && !has(bugs, t)) at = t;
    }
    ate -= 1; drop = [['虫', at]];
    const ni = bugs.indexOf(null);
    if (ni >= 0) bugs[ni] = at; else bugs.push(at);
    di = idx(bugs, at);
  } else if (k !== '.') {
    const n = [pl[0] + DIRS[k][0], pl[1] + DIRS[k][1]];
    if (!m.free(n)) return 'bad';
    if (V.has('撞') && eq(n, lz.pos)) return 'bad';
    pl = n;
  }
  if (eq(pl, lz.pos)) return null;
  bugs.forEach((b, i) => { if (b !== null && eq(b, pl) && k !== '.' && k !== 'X') { bugs[i] = null; ate += 1; } });
  let nb = bugsTurn(m, bugs, lz.pos, pl);
  if (drop.length && V.has('吐向它')) {
    nb[di] = bugs[di];
    if (eq(bugs[di], lz.pos) && lz.mode !== '吃') {
      nb[di] = null;
      return { pl, ate, bugs: nb, lz: { pos: lz.pos, face: lz.face, mode: '吃', tgt: null, mem: null, eat: 2 } };
    }
  }
  const sounds = drop.concat(k !== '.' && k !== 'X' ? [['你', pl]] : []);
  bugs.forEach((a, i) => { const b = nb[i]; if (b !== null && !(a !== null && eq(a, b))) sounds.push(['虫', b]); });
  bugs = nb;
  const [lz2, dead] = lizardTurn(m, lz, pl, bugs, sounds);
  if (dead || eq(pl, lz2.pos)) return null;
  return { pl, ate, bugs, lz: lz2 };
}

function init(m) {
  return { pl: m.start, ate: m.carry, bugs: m.bugs.slice(), lz: { pos: m.post, face: m.face, mode: '岗', tgt: null, mem: null, eat: 0 } };
}

api = { Map: Map_, step, init, DIRS, ORDER, eq, heard: false };
if (typeof module !== 'undefined') module.exports = api; else root.WeiSim = api;
})(this);
