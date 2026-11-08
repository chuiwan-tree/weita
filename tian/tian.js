// 自动拼出来的，别手改：改 sim.js / two.js / 多天.js 再跑 做网页.py
var process={env:{}};var __mods={};var __G={"text": "\n###############\n#...........#.#\n#..#####......#\n#......#..M...#\n#..BB..#......#\n#.............#\n#.##.......##.#\n#..BB..L......#\n#..#..###.....#\n#NP...........#\n###############", "faces": ["U", "L"], "need": 3, "src": "5,5", "sp": 8, "life": 12, "fullsafe": 1, "fruit": "2,8", "day": 30, "days": 3, "eggs": 1, "breed": 0, "hatch": 1, "cap": 1, "tree": "3,8", "drop": "2,8;3,9", "dropAt": 10};
(function(){var module={exports:{}};var RL=0;
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
  if (V.has('一件事')) return lizardOne(m, lz, player, bugs, sounds);
  if (V.has('听') && mode === '岗' && sounds.length) {
    let near = sounds.map(([w, q]) => [Math.abs(q[0] - pos[0]) + Math.abs(q[1] - pos[1]), w === '虫' ? 0 : 1, q, w]).filter(x => x[0] > 0 && x[0] <= (x[3] === '蜥' && (globalThis.RL||0) ? globalThis.RL : 3));
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

// 第二个 第 14 天 10:09：'一件事'，照 sim.py 的 lizard_one 抄的。规矩在 ~/想/喂它一口-蜥蜴怎么想.md：
// 先用现在的脸看，再只做一件事：走（回岗一格 / 追、找两格）、转一次头、站着。找到那格以后逆时针转三次头再回岗。
const CCW = { U: 'L', L: 'D', D: 'R', R: 'U' };
const ONE_BACK = 3;
function lizardOne(m, lz, player, bugs, sounds) {
  let { pos, face, mode, tgt, mem, eat } = lz;
  const V = m.V;
  api.why = null;
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
    // 10:13 第一个看到：找的时候看见你直接冲，比站岗少一拍，像"有时停有时不停"。改成：新看见一样东西都先盯一回合
    if (mode === '岗' || mode === '找' || (mode === '追' && pick[0] !== tgt)) return [{ pos, face, mode: '停', tgt: pick[0], mem: pick[1], eat: 0 }, false];
    mode = '追'; tgt = pick[0]; mem = pick[1];
  } else if (mode === '追' || mode === '停') {
    mode = '找'; eat = 0;
  } else if (mode === '找' && eq(pos, mem)) {
    if (eat < 3) { api.why = '环顾'; return [{ pos, face: CCW[face], mode: '找', tgt, mem, eat: eat + 1 }, false]; }
    mode = '岗'; tgt = null; mem = null; eat = 0;
  }
  if (mode === '岗') {
    if (V.has('听') && sounds.length) {
      const near = sounds.map(([w, q]) => [Math.abs(q[0] - pos[0]) + Math.abs(q[1] - pos[1]), w === '虫' ? 0 : 1, q, w]).filter(x => x[0] > 0 && x[0] <= (x[3] === '蜥' && (globalThis.RL||0) ? globalThis.RL : 3));
      if (near.length) {
        near.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2][0] - b[2][0] || a[2][1] - b[2][1]);
        const q = near[0][2];
        const vx = q[0] - pos[0], vy = q[1] - pos[1];
        const nf = Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'R' : 'L') : (vy > 0 ? 'D' : 'U');
        if (nf !== face) { api.heard = true; api.heardAt = q; return [{ pos, face: nf, mode: '岗', tgt: null, mem: null, eat: ONE_BACK }, false]; }
        if (eq(pos, m.post)) return [{ pos, face, mode: '岗', tgt: null, mem: null, eat: ONE_BACK }, false];
      }
    }
    if (eq(pos, m.post)) {
      if (face !== m.face && !V.has('不转回')) {
        if (eat > 1) return [{ pos, face, mode: '岗', tgt: null, mem: null, eat: eat - 1 }, false];
        return [{ pos, face: m.face, mode: '岗', tgt: null, mem: null, eat: 0 }, false];
      }
      return [{ pos, face, mode: '岗', tgt: null, mem: null, eat: 0 }, false];
    }
  }
  if (mode === '岗' && V.has('不回岗')) return [{ pos, face, mode: '岗', tgt: null, mem: null, eat: 0 }, false];   // 第二个 10:29：找完了就待在那儿
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
  return [{ pos, face, mode, tgt, mem, eat: mode === '找' ? eat : (mode === '岗' && !eq(pos, m.post) ? eat : 0) }, dead];
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
  let pf = st.pf || null;   // 你的朝向（'吐朝' 用）
  let drop = [], di = -1;
  const V = m.V;
  if (k === 'X') {
    if (!V.has('吐') || ate < 1 || has(bugs, pl)) return 'bad';
    let at = pl;
    if (V.has('吐向它')) {
      let t;   // 第一个 10:21 '吐朝'：吐在你脸前一格（你最后走的那一步的方向；墙/已有虫就落在脚下）
      if (V.has('吐朝')) t = pf ? [pl[0] + DIRS[pf][0], pl[1] + DIRS[pf][1]] : pl;
      else [t] = m.stepToward(pl, lz.pos);
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
    pl = n; pf = k;
  }
  if (eq(pl, lz.pos)) return null;
  bugs.forEach((b, i) => { if (b !== null && eq(b, pl) && k !== '.' && k !== 'X') { bugs[i] = null; ate += 1; } });
  if (V.has('窝安全') && eq(pl, m.nest) && ate >= m.need) return withPf(V, { pl, ate, bugs, lz }, pf);   // 第二个 10:15：走进窝那一步就算到了
  let nb = bugsTurn(m, bugs, lz.pos, pl);
  if (drop.length && V.has('吐向它')) {
    nb[di] = bugs[di];
    if (eq(bugs[di], lz.pos) && lz.mode !== '吃') {
      nb[di] = null;
      return withPf(V, { pl, ate, bugs: nb, lz: { pos: lz.pos, face: lz.face, mode: '吃', tgt: null, mem: null, eat: 2 } }, pf);
    }
  }
  const sounds = drop.concat(k !== '.' && k !== 'X' ? [['你', pl]] : []);
  bugs.forEach((a, i) => { const b = nb[i]; if (b !== null && !(a !== null && eq(a, b))) sounds.push(['虫', b]); });
  bugs = nb;
  const [lz2, dead] = lizardTurn(m, lz, pl, bugs, sounds);
  if (dead || eq(pl, lz2.pos)) return null;
  return withPf(V, { pl, ate, bugs, lz: lz2 }, pf);
}
function withPf(V, o, pf) { if (V.has('吐朝')) o.pf = pf; return o; }

// 09:28 给画面用：现在按 x，虫会落在哪一格（跟 step 里吐的那几行同一个算法）
function dropAt(m, st) {
  if (!m.V.has('吐') || st.ate < 1 || has(st.bugs, st.pl)) return null;
  if (!m.V.has('吐向它')) return st.pl;
  let t;
  if (m.V.has('吐朝')) t = st.pf ? [st.pl[0] + DIRS[st.pf][0], st.pl[1] + DIRS[st.pf][1]] : st.pl;
  else [t] = m.stepToward(st.pl, st.lz.pos);
  return (!eq(t, st.pl) && m.free(t) && !has(st.bugs, t)) ? t : st.pl;
}

function init(m) {
  return withPf(m.V, { pl: m.start, ate: m.carry, bugs: m.bugs.slice(), lz: { pos: m.post, face: m.face, mode: '岗', tgt: null, mem: null, eat: 0 } }, null);
}

api = { Map: Map_, step, init, dropAt, DIRS, ORDER, eq, heard: false };
api.lizardTurn = lizardTurn; api.bugsTurn = bugsTurn; api.K = K;
if (typeof module !== 'undefined') module.exports = api; else root.WeiSim = api;
})(this);

__mods.sim=module.exports;})();
(function(){var module={exports:{}};
// 第二个 第14天 一天：从 两只/two.js 拷来，只改一处：饿了朝最近的（木头或地上的虫）走，不只奔木头。
// 第一个 第14天：两只蜥蜴，不加新脾气。只多一条：蜥蜴走动也是动静（对另一只）。两只互相当墙。

const S=__mods.sim;
const V=['一件事','不转回','窝安全','不回岗','吐','吐朝','吐向它','听','馋','撞','只扑盯着的','背逃'];
const eq=S.eq,K=S.K,DIRS=S.DIRS;
function mk(text,faces,need,carry){const t2=text.replace(/M/g,'.');const m=new S.Map(t2.replace(/L/g,'.'),faces[0],need,carry,V);
  const rows=text.replace(/^\n+|\n+$/g,'').split('\n');m.posts=[];rows.forEach((r,y)=>{for(let x=0;x<r.length;x++){if(r[x]==='L')m.posts[0]=[x,y];if(r[x]==='M')m.posts[1]=[x,y];}});m.faces=faces;return m;}
function init(m){return {pl:m.start,ate:m.carry,bugs:m.bugs.slice(),pf:null,lzs:m.posts.map((p,i)=>({pos:p,face:m.faces[i],mode:'岗',tgt:null,mem:null,eat:0}))};}
function withWall(m,p,f){m.wall.add(K(p));m._dist={};try{return f();}finally{m.wall.delete(K(p));m._dist={};}}
function step(m,st,k){let {pl,ate,pf}=st;let bugs=st.bugs.slice();const lzs=st.lzs;let drop=[];
  if(k==='X'){if(ate<1)return 'bad';let t=pf?[pl[0]+DIRS[pf][0],pl[1]+DIRS[pf][1]]:pl;let at=(!eq(t,pl)&&m.free(t)&&!bugs.some(b=>b&&eq(b,t))&&!lzs.some(z=>eq(z.pos,t)))?t:pl;
    const hit=lzs.findIndex(z=>eq(z.pos,t)&&z.mode!=='吃');ate-=1;
    if(hit>=0){const z=lzs.slice();z[hit]={...z[hit],mode:'吃',tgt:null,mem:null,eat:2};return {pl,ate,bugs,pf,lzs:z,log:['吐进第'+(hit+1)+'只嘴里']};}
    drop=[['虫',at]];bugs.push(at);}
  else if(k!=='.'){const n=[pl[0]+DIRS[k][0],pl[1]+DIRS[k][1]];if(!m.free(n)||lzs.some(z=>eq(z.pos,n)))return 'bad';pl=n;pf=k;}
  let fullMsg=false;bugs=bugs.map(b=>{if(b&&eq(b,pl)&&k!=='.'&&k!=='X'){if(process.env.CAP&&ate>=m.need){fullMsg=true;return b;}ate++;return null;}return b;}); // 第二个 12:57：CAP=1 时吃够了就吃不下
  // 第一个 12:10：果子（FRUIT="x,y;x,y"）。蜥蜴不吃，不会动，走上去就吃
  let fr=st.fr!==undefined?st.fr:(process.env.FRUIT?process.env.FRUIT.split(';').map(a=>a.split(',').map(Number)):[]);const fl0=fr.length;fr=fr.filter(q=>!eq(q,pl));if(fr.length<fl0&&k!=='X')ate++;else if(fr.length<fl0)fr=st.fr||fr;
  if(eq(pl,m.nest)&&ate>=m.need)return {pl,ate,bugs,pf,lzs,win:true,fr};
  // 虫：躲最近的那只
  const nb=bugs.map((b,i)=>{if(!b)return b;if(drop.length&&eq(b,drop[0][1]))return b;let z=lzs.map(z=>z.pos).sort((p,q)=>Math.abs(p[0]-b[0])+Math.abs(p[1]-b[1])-Math.abs(q[0]-b[0])-Math.abs(q[1]-b[1]))[0];
    const others=bugs.map((o,j)=>j===i?null:o);const r=S.bugsTurn(m,[b],z,pl)[0];if(others.some(o=>o&&eq(o,r))||lzs.some(q=>eq(q.pos,r)))return b;return r;});
  const sounds=drop.concat(k!=='.'&&k!=='X'?[['你',pl]]:[]);bugs.forEach((a,i)=>{const b=nb[i];if(b&&!(a&&eq(a,b)))sounds.push(['虫',b]);});bugs=nb;
  const out=[];const log=[];
  for(let i=0;i<lzs.length;i++){const other=i===0?lzs[1].pos:out[0].pos;
    const before=lzs[i];const ateBugs=bugs.filter(Boolean).length;
    S.heard=false;S.heardAt=null;m.post=m.posts[i];m.face=m.faces[i];
    // 第二个 11:57 提议的"它自己的日子"（LIFE=K 开）：饿了去虫冒出来的地方守，吃到一只就饱、走回自己的石头晒，K 回合后又饿。饱的时候看不见虫（不追虫），看见你照样扑。
    const LIFE=+process.env.LIFE||0;if(LIFE&&!m.stones)m.stones=m.posts.map(p=>p.slice());
    const full=LIFE&&(before.full||0)>0;const bugsFor=full?bugs.map(()=>null):bugs;const nb0=bugs.filter(Boolean).length;
    const plFor=(full&&process.env.FULLSAFE)?[-99,-99]:pl;let [z,dead]=withWall(m,other,()=>S.lizardTurn(m,before,plFor,bugsFor,sounds));
    if(full){bugsFor.forEach((b,j)=>{});}
    if(LIFE){const ateNow=!full&&bugs.filter(Boolean).length<nb0;z={...z,full:ateNow?LIFE:Math.max(0,(before.full||0)-1)};
      if(ateNow)log.push(`第${i+1}只吃饱了`);else if(full&&z.full===0)log.push(`第${i+1}只又饿了`);
      if(!dead&&z.mode==='岗'&&eq(z.pos,before.pos)&&!S.heard&&!ateNow){
        let goal=null;if(z.full>0)goal=m.stones[i];else{const srcs=(process.env.SRC?process.env.SRC.split(';').map(a=>a.split(',').map(Number)):[]).concat(bugs.filter(Boolean));/*第二个 一天：饿了朝最近的虫或木头*/const dd=withWall(m,other,()=>{m._dist={};return m.distFrom(z.pos);});let bd=1e9;for(const q of srcs){const dq=dd.has(K(q))?dd.get(K(q)):1e9;if(dq<bd){bd=dq;goal=q;}}if(goal&&bd<=1)goal=null;}
        if(goal&&!eq(goal,z.pos)){const [np,kk]=withWall(m,other,()=>{m._dist={};return m.stepToward(z.pos,goal);});if(!eq(np,z.pos)&&!eq(np,pl)){z={...z,pos:np,face:kk||z.face};log.push(z.full>0?`第${i+1}只往石头走`:`第${i+1}只去守虫`);
          if(!z.full){const bi=bugs.findIndex(b=>b&&eq(b,np));if(bi>=0){bugs[bi]=null;z={...z,mode:'吃',eat:2,full:LIFE};log.push(`第${i+1}只吃饱了`);}}}}}}
    // 第一个 第14天 11:53：它自己的日子（DAY=H 时开）：闲着站了 H 回合，就朝闻得到的最近一只虫走一格
    const H=+process.env.DAY||0;z={...z,idle:(z.mode==='岗'&&eq(z.pos,before.pos)&&!S.heard)?(before.idle||0)+1:0};
    if(H&&z.idle>H&&!dead){const dd=withWall(m,other,()=>{m._dist={};return m.distFrom(z.pos);});let bt=null,bd=1e9;bugs.forEach(b=>{if(b&&dd.has(K(b))&&dd.get(K(b))<bd){bd=dd.get(K(b));bt=b;}});
      if(bt){const [np,kk]=withWall(m,other,()=>m.stepToward(z.pos,bt));if(!eq(np,z.pos)){z={...z,pos:np,face:kk||z.face,idle:z.idle};log.push(`第${i+1}只自己去找虫`);
        if(eq(np,pl))dead=true;else{const bi=bugs.findIndex(b=>b&&eq(b,np));if(bi>=0){bugs[bi]=null;z={...z,mode:'吃',eat:2,idle:0};m.posts[i]=np;}}}}}
    if(S.heard){const hz=sounds.find(s=>S.heardAt&&eq(s[1],S.heardAt));log.push(`第${i+1}只听见${hz?hz[0]:''}`);}
    if(bugs.filter(Boolean).length<ateBugs)log.push(`第${i+1}只吃了虫`);
    if(dead||eq(z.pos,pl))return null;
    if(!eq(z.pos,before.pos)){sounds.push(['蜥',z.pos]);}
    out.push(z);}
  // 第一个 11:56：虫从固定的地方慢慢冒出来（SRC="x,y;x,y"，每 SP 回合冒一只，那格空着才冒）
  let ateNew=0;const t=(st.t||0)+1;if(process.env.SRC&&t%(+process.env.SP||4)===0){for(const q of process.env.SRC.split(';').map(a=>a.split(',').map(Number))){if(eq(pl,q)){ateNew=(ateNew||0)+1;log.push('虫一爬出来就被你吃了');}else if(!bugs.some(b=>b&&eq(b,q))&&!out.some(z=>eq(z.pos,q))){bugs.push(q);log.push('那边冒出一只虫');}}}
  return {pl,ate:ate+ateNew,bugs,pf,lzs:out,log,t,fr};}
function show(m,st){const ar={U:'^',R:'>',D:'v',L:'<'};let o=[];for(let y=0;y<m.h;y++){let r='';for(let x=0;x<m.w;x++){const p=[x,y];const zi=st.lzs.findIndex(z=>eq(z.pos,p));
  if(eq(p,st.pl))r+='@';else if(zi>=0)r+=(zi?'MW':'LΛ')[0]+ar[st.lzs[zi].face];else if(st.bugs.some(b=>b&&eq(b,p)))r+='b';else if(m.wall.has(K(p)))r+='#';else if(eq(p,m.nest))r+='N';
  else if(st.lzs.some(z=>z.mode!=='吃'&&m.sees(z.pos,z.face,p)))r+=',';else r+=' ';if(zi<0)r+=' ';}o.push(r);}
  return o.join('\n')+'\n'+st.lzs.map((z,i)=>`${'LM'[i]}:${z.full>0?'饱'+z.full+' ':''}${z.mode}${z.tgt!==null?'→'+z.tgt:''}`).join(' ')+`  吃${st.ate}`+(st.log&&st.log.length?'  '+st.log.join('，'):'');}
module.exports={mk,init,step,show};

__mods.two=module.exports;})();
(function(){var module={exports:{}};
// 第一个 13:10：并进果子（从 卵/果.js 搬来）：G.tree 一棵树，开局一颗果子在 G.fruit，每天第 G.dropAt 步在 G.drop 里掉一颗；没吃的果子夜里烂掉，第二天那格像木头一样冒虫（只烂一天）。
// 第二个 第14天 12:25：一天 → 三天。拷 玩.js 的样子改的，玩.js 不动。
// 想试的一件：窝边的虫吃了不再长，第二天的地是你（和它们）第一天吃剩的样子。
// 用法：node 多天.js 记录.txt 键 键 ...（上 下 左 右 等 吐 撤 重来 从头 下一天）
//   重来 = 这一天重来（前几天照旧）；从头 = 从第一天重来。

const G=__G;
const DAYS=G.days||3, DAYLEN=G.day||45;
const OFFS=G.offs||[[0,0],[6,0],[0,9]]; // 每天开头两只各还饱几回合，错开它们的日子
process.env.DAY='0';process.env.LIFE=String(G.life||0);if(G.fullsafe)process.env.FULLSAFE='1';if(G.fruit)process.env.FRUIT=G.fruit;process.env.SRC=G.src;if(G.cap)process.env.CAP='1';process.env.SP=String(G.sp);
const T=__mods.two;
const rec=null;const KM={上:'U',下:'D',左:'L',右:'R',等:'.',吐:'X'};let games=[[]];
let src=G.src.split(';').map(a=>a.split(',').map(Number));const src0=src.slice();let rot=[];
const TREE=G.tree?G.tree.split(',').map(Number):null;const DROP=G.drop?G.drop.split(';').map(a=>a.split(',').map(Number)):[];
const setSrc=()=>{src=src0.concat(rot);process.env.SRC=src.map(q=>q.join(',')).join(';');};
const fruit0=G.fruit?G.fruit.split(';').map(a=>a.split(',').map(Number)):[];
const eq=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
const BASE=G.text.replace(/^\n+/,'');
function dayText(bugs){const L=BASE.split('\n');const g=L.map(r=>r.replace(/B/g,'.').split(''));
  for(const b of bugs){if(g[b[1]]&&g[b[1]][b[0]]==='.')g[b[1]][b[0]]='B';}return g.map(r=>r.join('')).join('\n');}
function bugsOf(text){const o=[];text.split('\n').forEach((r,y)=>r.split('').forEach((c,x)=>{if(c==='B')o.push([x,y]);}));return o;}
const NM=['蜥蜴甲','蜥蜴乙'];
function say(w){let i=+((w.match(/第(\d)只/)||[0,1])[1])-1;const n=NM[i];
  if(w.includes('听见你'))return n+'听见了你的动静，转过头来';if(w.includes('听见虫'))return n+'听见了虫的动静，转过头去';if(w.includes('听见蜥'))return n+'听见另一只蜥蜴走动，转过头去';if(w.includes('听见'))return n+'听见了动静，转过头去';
  if(w.includes('去守虫'))return n+'饿了，去找吃的';if(w.includes('往石头走'))return n+'吃饱了，往自己的石头走';if(w.includes('吃饱了'))return n+'吃饱了';if(w.includes('又饿了'))return n+'又饿了';if(w.includes('自己去找虫'))return n+'饿了，往虫那边走';if(w.includes('吃了虫'))return n+'吃了一只虫，正在嚼';if(w.includes('被你吃了'))return '虫一爬出木头就被你吃了';if(w.includes('冒出'))return '烂木头里又爬出一只虫';if(w.includes('吐进'))return '你把虫吐进了'+n+'嘴里';return w;}
// 一局：从第 1 天起放一遍
function replay(keys){rot=[];setSrc();let day=1,carryBugs=bugsOf(BASE),fr=fruit0.slice();
  let text=dayText(carryBugs);let m=T.mk(text,G.faces,G.need,0);let s=T.init(m);s.fr=fr;
  const setOff=()=>{const o=OFFS[(day-1)%OFFS.length];s.lzs=s.lzs.map((z,i)=>({...z,full:o[i]||0}));};setOff();
  let msgs=['第 1 天，天亮了。'],end=null,steps=0,prev=s;
  // 第二个 12:42：EGGS=1 时，两只虫挨着待满 2 回合，就在旁边下一撮卵（第三个的想法）；下卵的虫被吃了，卵当场灰掉；天亮时活着的卵孵成两只虫
  let eggs=[],adj={},laid={};
  const freeCell=c=>{const r=BASE.split('\n')[c[1]];return r&&r[c[0]]&&r[c[0]]!=='#'&&!s.bugs.some(b=>eq(b,c))&&!src.some(q=>eq(q,c))&&!eq(c,m.nest)&&!eggs.some(e=>eq(e.pos,c))&&!s.lzs.some(z=>eq(z.pos,c))&&!eq(c,s.pl);};
  const D4=[[1,0],[0,1],[-1,0],[0,-1]];
  function eggTick(){if(!G.eggs)return;const B=s.bugs;
    for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const k=i+','+j;
      if(B[i]&&B[j]&&Math.abs(B[i][0]-B[j][0])+Math.abs(B[i][1]-B[j][1])===1&&!src.some(q=>eq(q,B[i])||eq(q,B[j]))){adj[k]=(adj[k]||0)+1;
        if(adj[k]>=2&&!laid[k]){let c=null;for(const b of [B[i],B[j]])for(const d of D4){const t=[b[0]+d[0],b[1]+d[1]];if(!c&&freeCell(t))c=t;}
          if(c){eggs.push({pos:c,p:[i,j],dead:false});laid[k]=1;msgs.push('两只虫挨在一起，下了一撮卵');}}}else adj[k]=0;}
    for(const e of eggs){if(!e.dead&&(!B[e.p[0]]||!B[e.p[1]])){e.dead=true;const gone=[e.p[0],e.p[1]].filter(i=>!B[i]).map(i=>prev.bugs[i]);const byYou=gone.some(b=>b&&eq(b,s.pl));msgs.push((byYou?'你':'蜥蜴')+'吃了下卵的虫，那撮卵灰了');}}}
  for(const k of keys){
    if(k==='下一天'){if(end!=='天过'){msgs=['今天还没过完。'];continue;}
      day++;carryBugs=s.bugs.filter(Boolean).filter(b=>!src.some(q=>eq(q,b)));fr=s.fr||[];let rotted=0;if(TREE){rot=fr.slice();rotted=rot.length;fr=[];setSrc();}
      // 第二个 12:34：BREED=1 时，夜里每只没被吃的虫在旁边空地多生一只（第一个说"第一天得有得选"：留着不吃，明天变两只）
      let born=0;if(G.breed){const free=c=>{const r=BASE.split('\n')[c[1]];return r&&r[c[0]]&&r[c[0]]!=='#'&&!carryBugs.some(b=>eq(b,c))&&!src.some(q=>eq(q,c))&&!eq(c,m.nest);};
        for(const b of carryBugs.slice()){for(const d of [[1,0],[0,1],[-1,0],[0,-1]]){const c=[b[0]+d[0],b[1]+d[1]];if(free(c)){carryBugs.push(c);born++;break;}}}}
      const left=carryBugs.length-born;
      let hatched=0;if(G.eggs){for(const e of eggs.filter(e=>!e.dead)){carryBugs.push(e.pos);hatched++;if((G.hatch||2)>1)for(const d of D4){const t=[e.pos[0]+d[0],e.pos[1]+d[1]];const r=BASE.split('\n')[t[1]];if(r&&r[t[0]]&&r[t[0]]!=='#'&&!carryBugs.some(q=>eq(q,t))&&!src.some(q=>eq(q,t))&&!eq(t,m.nest)){carryBugs.push(t);hatched++;break;}}}}
      eggs=[];adj={};laid={};
      text=dayText(carryBugs);m=T.mk(text,G.faces,G.need,0);s=T.init(m);s.fr=fr;setOff();end=null;steps=0;msgs=['第 '+day+' 天，天亮了。'+(TREE&&rotted?'昨天没吃的果子在地上烂了，招来了虫。':'')+(G.eggs&&hatched?'夜里卵孵出了 '+hatched+' 只小虫。':'')+(G.breed&&!G.quiet?(left?'夜里，昨天没被吃掉的 '+left+' 只虫生了 '+born+' 只小虫。':'昨天地上的虫都被吃光了，夜里什么也没生出来。'):'')];continue;}
    if(end)break;
    prev=s;const r=T.step(m,s,KM[k]);if(r==='bad'){msgs=['（'+k+' 走不过去）'];continue;}steps++;
    if(r===null){end='死';let who=0,best=1e9;prev.lzs.forEach((z,i)=>{const d=Math.abs(z.pos[0]-prev.pl[0])+Math.abs(z.pos[1]-prev.pl[1]);if(d<best){best=d;who=i;}});
      const pz=prev.lzs[who];const how=(pz.tgt==='你'&&(pz.mode==='停'||pz.mode==='追'))?NM[who]+'上一步就已经盯住你了，你这一步没躲开它那条线，它冲过来扑住了你':(pz.tgt!==null&&pz.tgt!==undefined&&(pz.mode==='停'||pz.mode==='追'))?NM[who]+'正盯着一只虫，冲过去抓它，你走到了它和虫中间的那条线上，它一口咬到了你':(eq(pz.pos,s.pl)||Math.abs(pz.pos[0]-prev.pl[0])+Math.abs(pz.pos[1]-prev.pl[1])<=1)?NM[who]+'就在你旁边，你和它碰到了一起':NM[who]+'这一步刚看见你，离得太近，直接扑了上来';msgs=[how+'。你被'+NM[who]+'扑住吃了。按 重来 再过一遍第 '+day+' 天，或者按 从头 从第 1 天来。'];break;}
    const frB=(s.fr||[]).length;s=r;msgs=(s.log||[]).map(say);s.lzs.forEach((z,i)=>{const b=prev.lzs[i];const now=z.tgt==='你'&&(z.mode==='停'||z.mode==='追');const was=b&&b.tgt==='你'&&(b.mode==='停'||b.mode==='追');if(now&&!was)msgs.push(NM[i]+'看见你了！');});if(G.cap&&prev.ate>=m.need&&s.ate>=m.need&&prev.bugs.some(b=>b&&eq(b,s.pl))&&k!=='等')msgs.unshift('你已经吃饱了，吃不下，虫从你脚边溜开');eggTick();
    if(TREE&&rot.length){const nb=rot.some(q=>s.bugs.some(b=>b&&eq(b,q))&&!prev.bugs.some(b=>b&&eq(b,q)));const nw=src0.some(q=>s.bugs.some(b=>b&&eq(b,q))&&!prev.bugs.some(b=>b&&eq(b,q)));const onRot=rot.some(q=>eq(q,s.pl));
      msgs=msgs.map(w=>w==='虫一爬出木头就被你吃了'&&onRot?'虫一爬出烂果子就被你吃了':w==='烂木头里又爬出一只虫'&&nb&&!nw?'烂果子里爬出一只虫':w);if(nb&&nw)msgs.push('烂果子里也爬出一只虫');}
    if(TREE&&(s.fr||[]).length<frB)msgs.push('你吃了一颗果子');if(TREE&&rot.some(q=>eq(q,s.pl)))msgs.push('这颗果子烂了，吃不了');
    if(TREE&&steps===(G.dropAt||10)){for(const c of DROP){if(!(s.fr||[]).some(q=>eq(q,c))&&!eq(s.pl,c)&&!s.lzs.some(z=>eq(z.pos,c))){s.fr=(s.fr||[]).concat([c]);msgs.push('树上掉下来一颗果子');break;}}}
    if(s.win){if(day>=DAYS){end='全过';msgs.push('第 '+day+' 天你也吃饱回窝了。'+DAYS+' 天都活下来了！');}else{end='天过';msgs.push('你吃饱了，回到窝里。第 '+day+' 天过了！按 下一天 看明天。');}}
    else if((s.t||0)>=DAYLEN){end='黑';msgs.push((eq(s.pl,m.nest)?'天黑了。你在窝里，可肚子里只有 '+s.ate+' 只，不够 '+m.need+' 只，这一夜熬不过去。':'天黑了，你没回到窝里。')+'按 重来 再过一遍第 '+day+' 天，或者按 从头。');}}
  return {m,s,msgs,end,day,steps,eggs};}
function screen(r){const {m,s}=r;const stones=m.posts;const ar={U:'↑',R:'→',D:'↓',L:'←'};let o=[];
  for(let y=0;y<m.h;y++){let row='';for(let x=0;x<m.w;x++){const p=[x,y];
    const li=s.lzs.findIndex(z=>eq(z.pos,p));
    if(eq(s.pl,p)&&!(r.end==='天过'||r.end==='全过'))row+='你';else if(li>=0)row+=['甲','乙'][li];else if(s.bugs.some(b=>eq(b,p)))row+='虫';
    else if((s.fr||[]).some(q=>eq(q,p)))row+='果';else if(r.eggs&&r.eggs.some(q=>eq(q.pos,p)))row+=r.eggs.find(q=>eq(q.pos,p)).dead?'灰':'卵';else if(TREE&&eq(TREE,p))row+='树';else if(m.wall.has(x+','+y)||m.wall.has(T.K?T.K(p):p+''))row+='墙';
    else if(eq(m.nest,p))row+='窝';else if(rot.some(q=>eq(q,p)))row+='烂';else if(src.some(q=>eq(q,p)))row+='木';else if(G.life&&stones.some(q=>eq(q,p)))row+='石';
    else if(!r.end&&s.lzs.some(z=>z.mode!=='吃'&&m.sees(z.pos,z.face,p)))row+='··';else row+='　';}o.push(row);}
  const st=s.lzs.map((z,i)=>NM[i]+(G.life?((z.full||0)>0?'（饱）':'（饿）'):'')+'脸朝'+ar[z.face]+(z.mode==='停'?(z.tgt==='你'?'，盯住了你！':'，盯住了一只虫'):z.mode==='追'?(z.tgt==='你'?'，在追你！':'，在追虫'):({岗:'',找:'，在找',吃:'，在嚼'}[z.mode]||''))).join('；');
  const left=Math.max(0,DAYLEN-(s.t||0));
  const sky=r.end==='天过'||r.end==='全过'?'你在窝里睡着了。':'天色：'+'■'.repeat(Math.ceil(left/5))+'□'.repeat(Math.ceil(DAYLEN/5)-Math.ceil(left/5))+' 离天黑还有 '+left+' 步';
  return o.join('\n')+'\n'+st+'\n'+'第 '+r.day+' 天（一共 '+DAYS+' 天）  '+sky+'\n你肚子里有 '+s.ate+' 只虫，每天要吃够 '+m.need+' 只，天黑前回窝。  第 '+games.length+' 局';}
__mods.tian={replay,screen,NM,KM,DAYS,TREE,G,getGames:()=>games,setGames:g=>{games=g;}};

})();
