// 喂它一口的画面（第二个醒的，第 14 天 09:50）。梓韬看完录像说"画面过于简陋""射线检测用了比较难以理解的方式，还不如之前明确地有格子的一个状态"。
// 改成一格一格的：它看得见的格子涂黄；每回合谁从哪动到哪画淡淡的拖影，动作用 0.25 秒滑过去；它头上冒字：! 盯上你、? 听见了转头、嚼 2 在嚼。
(function (root) {
const C = 56;            // 一格多大
const COL = {
  floor: '#2b2d25', floor2: '#30322a', wall: '#14150f', wallTop: '#4a4b40',
  sight: 'rgba(240,200,80,0.30)', sightEdge: 'rgba(240,200,80,0.55)',
  me: '#5fb3ff', liz: '#d9543a', lizBelly: '#f08a5d', bug: '#8fd16a', nest: '#b98cf0',
  drop: 'rgba(143,209,106,0.9)', trail: 'rgba(255,255,255,0.18)', dead: '#ff3b3b'
};
const DV = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] };

function cx(x) { return x * C + C / 2; }

function drawFloor(g, m) {
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const wall = m.wall.has(x + ',' + y);
    g.fillStyle = wall ? COL.wall : ((x + y) % 2 ? COL.floor : COL.floor2);
    g.fillRect(x * C, y * C, C, C);
    if (wall) {   // 墙顶一条亮边，像有高度
      g.fillStyle = COL.wallTop; g.fillRect(x * C + 2, y * C + 2, C - 4, 6);
    }
  }
}

function drawNest(g, p) {
  const X = cx(p[0]), Y = cx(p[1]);
  g.strokeStyle = COL.nest; g.lineWidth = 4;
  g.beginPath(); g.arc(X, Y + 4, C * 0.32, Math.PI, 0); g.lineTo(X + C * 0.32, Y + C * 0.28); g.lineTo(X - C * 0.32, Y + C * 0.28); g.closePath(); g.stroke();
  g.fillStyle = COL.nest; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('窝', X, Y + 10);
}

function drawSight(g, m, lz) {
  const [dx, dy] = DV[lz.face];
  let x = lz.pos[0] + dx, y = lz.pos[1] + dy;
  while (x >= 0 && y >= 0 && x < m.w && y < m.h && !m.wall.has(x + ',' + y)) {
    g.fillStyle = COL.sight; g.fillRect(x * C + 1, y * C + 1, C - 2, C - 2);
    g.strokeStyle = COL.sightEdge; g.lineWidth = 1; g.strokeRect(x * C + 1.5, y * C + 1.5, C - 3, C - 3);
    x += dx; y += dy;
  }
  // 到墙为止：在挡住的那面墙上画一道短线
  if (x >= 0 && y >= 0 && x < m.w && y < m.h) {
    g.strokeStyle = COL.sightEdge; g.lineWidth = 3; g.beginPath();
    const bx = cx(x) - dx * C / 2, by = cx(y) - dy * C / 2;
    if (dx) { g.moveTo(bx, by - C * 0.35); g.lineTo(bx, by + C * 0.35); } else { g.moveTo(bx - C * 0.35, by); g.lineTo(bx + C * 0.35, by); }
    g.stroke();
  }
}

function drawBug(g, X, Y, a) {
  g.globalAlpha = a == null ? 1 : a;
  g.strokeStyle = '#4d7a33'; g.lineWidth = 2;
  for (const s of [-1, 1]) for (const k of [-6, 0, 6]) { g.beginPath(); g.moveTo(X, Y + k); g.lineTo(X + s * 13, Y + k + (k ? Math.sign(k) * 3 : 0)); g.stroke(); }
  g.fillStyle = COL.bug; g.beginPath(); g.ellipse(X, Y, 8, 11, 0, 0, 7); g.fill();
  g.fillStyle = '#2e4d1f'; g.beginPath(); g.arc(X, Y - 10, 4, 0, 7); g.fill();
  g.globalAlpha = 1;
}

function drawMe(g, X, Y, belly) {
  g.fillStyle = COL.me; g.beginPath(); g.arc(X, Y, C * 0.3, 0, 7); g.fill();
  g.fillStyle = '#0d2236'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('我', X, Y + 1);
  for (let i = 0; i < belly; i++) drawBug(g, X - 14 + i * 14, Y + C * 0.38, 0.9);  // 肚子里有几只，脚下画几只小虫
}

function drawLiz(g, X, Y, face, a) {
  const ang = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[face];
  g.save(); g.translate(X, Y); g.rotate(ang); g.globalAlpha = a == null ? 1 : a;
  g.fillStyle = COL.liz;
  g.beginPath(); g.moveTo(-24, 0); g.lineTo(-10, -9); g.lineTo(8, -10); g.lineTo(24, 0); g.lineTo(8, 10); g.lineTo(-10, 9); g.closePath(); g.fill();   // 身子，尖的一头是脸
  g.fillStyle = COL.lizBelly; g.beginPath(); g.ellipse(-2, 0, 10, 5, 0, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(14, -5, 2.6, 0, 7); g.arc(14, 5, 2.6, 0, 7); g.fill();   // 眼睛
  g.strokeStyle = COL.liz; g.lineWidth = 3;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(4, s * 8); g.lineTo(10, s * 17); g.stroke(); g.beginPath(); g.moveTo(-10, s * 8); g.lineTo(-16, s * 17); g.stroke(); }
  g.beginPath(); g.moveTo(-24, 0); g.quadraticCurveTo(-32, 8, -26, 14); g.stroke();   // 尾巴
  g.restore();
}

function bubble(g, X, Y, text, color) {
  g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.max(24, g.measureText(text).width + 12);
  g.fillStyle = color; g.beginPath();
  if (g.roundRect) g.roundRect(X - w / 2, Y - C * 0.72, w, 22, 6); else g.rect(X - w / 2, Y - C * 0.72, w, 22);
  g.fill(); g.fillStyle = '#111'; g.fillText(text, X, Y - C * 0.72 + 11);
}

function arrowTrail(g, a, b) {
  if (!a || !b || (a[0] === b[0] && a[1] === b[1])) return;
  g.strokeStyle = COL.trail; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx(a[0]), cx(a[1])); g.lineTo(cx(b[0]), cx(b[1])); g.stroke(); g.lineCap = 'butt';
}

const lerp = (a, b, t) => a + (b - a) * t;
function at(a, b, t) { return b ? [lerp(cx(a[0]), cx(b[0]), t), lerp(cx(a[1]), cx(b[1]), t)] : [cx(a[0]), cx(a[1])]; }

// 画一帧。info：{prev, st, dead, drop, over, heard, spit}；t：0..1 动画进度
// 第 14 天 10:00 梓韬："哪怕只有一两帧，动画还有这种识别的表现是有必要存在的，包括方向它是如何变化的"；
// 又问第一关为什么第一次丢了又看见、第二次没看见。所以加了：脚步声的一圈（3 格内它听得见）、转头的过程、
// 盯上你那一下的红线、它去找你时你刚才那格画一个淡淡的你、找到那格没看见时冒"没了"。
const ANG = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 };
const cl = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => 1 - (1 - v) * (1 - v);
function seg(t, a, b) { return cl((t - a) / (b - a)); }
function turn(a, b, k) { let d = b - a; while (d > Math.PI + 1e-6) d -= 2 * Math.PI; while (d < -Math.PI + 1e-6) d += 2 * Math.PI; return a + d * k; }
const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

function drawSightCells(g, m, pos, face, upto, alpha) {   // upto：画到第几格（动画里一格一格往外伸）
  const [dx, dy] = DV[face]; let x = pos[0] + dx, y = pos[1] + dy, k = 0;
  g.globalAlpha = alpha;
  while (x >= 0 && y >= 0 && x < m.w && y < m.h && !m.wall.has(x + ',' + y)) {
    if (k >= upto) { g.globalAlpha = 1; return; }
    g.fillStyle = COL.sight; g.fillRect(x * C + 1, y * C + 1, C - 2, C - 2);
    g.strokeStyle = COL.sightEdge; g.lineWidth = 1; g.strokeRect(x * C + 1.5, y * C + 1.5, C - 3, C - 3);
    x += dx; y += dy; k++;
  }
  if (x >= 0 && y >= 0 && x < m.w && y < m.h) {
    g.strokeStyle = COL.sightEdge; g.lineWidth = 3; g.beginPath();
    const bx = cx(x) - dx * C / 2, by = cx(y) - dy * C / 2;
    if (dx) { g.moveTo(bx, by - C * 0.35); g.lineTo(bx, by + C * 0.35); } else { g.moveTo(bx - C * 0.35, by); g.lineTo(bx + C * 0.35, by); }
    g.stroke();
  }
  g.globalAlpha = 1;
}

// 一圈声音：离出声那格 1、2、3 格（横竖加起来算）的格子一层一层亮一下。它在这圈里、又闲着，就会转头。
function drawSound(g, m, q, t, color) {
  for (let d = 1; d <= 3; d++) {
    const a = Math.sin(Math.PI * seg(t, (d - 1) * 0.1, (d - 1) * 0.1 + 0.35));
    if (a <= 0) continue;
    g.fillStyle = color; g.globalAlpha = 0.28 * a;
    for (let ox = -d; ox <= d; ox++) {
      const oy = d - Math.abs(ox);
      for (const yy of oy ? [oy, -oy] : [0]) {
        const x = q[0] + ox, y = q[1] + yy;
        if (x < 0 || y < 0 || x >= m.w || y >= m.h || m.wall.has(x + ',' + y)) continue;
        g.beginPath(); g.arc(cx(x), cx(y), C * 0.42 * (0.6 + 0.4 * a), 0, 7); g.lineWidth = 3; g.strokeStyle = color; g.stroke();
      }
    }
  }
  g.globalAlpha = 1;
}

function ghostMe(g, p, a) {   // 它记得你在这儿
  const X = cx(p[0]), Y = cx(p[1]);
  g.globalAlpha = a * 0.45; g.fillStyle = COL.me; g.beginPath(); g.arc(X, Y, C * 0.3, 0, 7); g.fill();
  g.globalAlpha = a; g.setLineDash([4, 4]); g.strokeStyle = '#bfe3ff'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(X, Y, C * 0.3, 0, 7); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#e8f4ff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', X, Y + 1);
  g.globalAlpha = 1;
}

function drawLizA(g, X, Y, ang, a, sc) {   // drawLiz 按角度画，sc 是放大（盯上你那一下跳一下）
  g.save(); g.translate(X, Y); g.scale(sc || 1, sc || 1);
  g.translate(-X, -Y);
  const f = 'R'; const save = drawLiz;
  // 借 drawLiz 的样子：先转到 ang 再按朝右画
  g.translate(X, Y); g.rotate(ang); g.translate(-X, -Y);
  save(g, X, Y, f, a);
  g.restore();
}

function frame(cv, m, info, t) {
  const g = cv.getContext('2d');
  cv.width = m.w * C; cv.height = m.h * C;
  drawFloor(g, m); drawNest(g, m.nest);
  const { prev, st, dead, drop } = info;
  const P = prev || st, pl0 = P.pl, lz0 = P.lz, lz = st.lz;
  const moved = !same(lz0.pos, dead ? dead.at : lz.pos);
  const turned = lz0.face !== lz.face;
  // 时间表：声音 0–0.45；它听见转头 0.3–0.6；不是听见的转头 0–0.2；它走 0.1–0.5；新的视线 0.5–0.8 一格格伸出去；冒字 0.6 起
  const tSound = t, tTurn = info.heard && !moved ? ease(seg(t, 0.3, 0.6)) : ease(seg(t, 0, 0.2));
  const tMove = ease(seg(t, moved && turned ? 0.15 : 0.05, 0.5)), tSight = seg(t, 0.5, 0.8), tPop = seg(t, 0.6, 0.85);
  // 旧的视线先淡掉，新的再伸出来
  if (prev && t < 1 && !dead && (turned || moved)) drawSightCells(g, m, lz0.pos, lz0.face, 99, 1 - seg(t, 0, 0.2));
  if (!dead) drawSightCells(g, m, lz.pos, lz.face, (prev && (turned || moved)) ? Math.ceil(tSight * 12) : 99, 1);
  if (!prev || (!turned && !moved)) {} // 视线没变就一直亮着
  // 声音：你走一步、虫跑一步、虫落地，都有一圈
  if (prev && t < 1) {
    if (!same(prev.pl, st.pl) && !dead) drawSound(g, m, st.pl, tSound, info.heard ? '#7cc8ff' : 'rgba(124,200,255,0.75)');
    prev.bugs.forEach((b, i) => { if (b && st.bugs[i] && !same(b, st.bugs[i])) drawSound(g, m, st.bugs[i], tSound, 'rgba(160,220,120,0.8)'); });
    if (info.spit) drawSound(g, m, info.spit.to, seg(t, 0.25, 1), 'rgba(160,220,120,0.8)');
  }
  if (prev && t >= 1) {   // 这一回合的拖影：谁从哪来
    arrowTrail(g, prev.lz.pos, st.lz.pos);
    prev.bugs.forEach((b, i) => { if (b && st.bugs[i]) arrowTrail(g, b, st.bugs[i]); });
    if (moved) drawLiz(g, cx(prev.lz.pos[0]), cx(prev.lz.pos[1]), prev.lz.face, 0.22);
  }
  // 它去找你：你刚才被看见的那格画一个淡淡的你，还有它要去的那条线
  if (!dead && (lz.mode === '找' || lz.mode === '追') && lz.tgt === '你' && lz.mem && !same(lz.mem, st.pl)) {
    const a = prev && t < 1 ? tPop : 1;
    ghostMe(g, lz.mem, 0.8 * a);
    g.globalAlpha = 0.5 * a; g.setLineDash([3, 6]); g.strokeStyle = '#ff7a5c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx(lz.pos[0]), cx(lz.pos[1])); g.lineTo(cx(lz.mem[0]), cx(lz.mem[1])); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  }
  if (drop && !dead && t >= 1) {   // 按 x 虫会落的那一格
    g.setLineDash([6, 5]); g.strokeStyle = COL.drop; g.lineWidth = 2.5; g.strokeRect(drop[0] * C + 6, drop[1] * C + 6, C - 12, C - 12); g.setLineDash([]);
  }
  // 虫
  st.bugs.forEach((b, i) => {
    if (!b) return;
    const pb = prev && prev.bugs[i];
    const [X, Y] = pb ? at(pb, b, tMove) : at(b);
    drawBug(g, X, Y);
  });
  if (prev && t < 1) prev.bugs.forEach((b, i) => { if (b && !st.bugs[i]) drawBug(g, cx(b[0]), cx(b[1]), 1 - seg(t, 0.3, 0.6)); });
  if (info.spit && t < 1) {
    const [sx, sy] = at(info.spit.from, info.spit.to, Math.min(1, t * 1.6));
    drawBug(g, sx, sy, t < 0.7 ? 1 : (1 - t) / 0.3);
  }
  // 我
  const [mx, my] = prev ? at(prev.pl, dead ? dead.at : st.pl, ease(seg(t, 0, 0.35))) : at(st.pl);
  drawMe(g, mx, my, st.ate);
  // 蜥蜴
  const lp = dead ? dead.from : lz.pos;
  const [lx, ly] = prev ? at(prev.lz.pos, dead ? dead.at : lp, tMove) : at(lp);
  const ang = turn(ANG[lz0.face], ANG[dead ? lz0.face : lz.face], prev ? tTurn : 1);
  const spotted = !dead && lz.mode === '停' && (!prev || prev.lz.mode !== '停');
  const jump = spotted && prev && t < 1 ? 1 + 0.18 * Math.sin(Math.PI * seg(t, 0.55, 0.85)) : 1;
  drawLizA(g, lx, ly, ang, 1, jump);
  // 盯上你那一下：从它到你一道红线闪两下
  if (spotted && lz.tgt === '你') {
    const a = prev && t < 1 ? Math.abs(Math.sin(Math.PI * 2 * seg(t, 0.55, 1))) : 0.55;
    g.globalAlpha = a; g.strokeStyle = '#ff5a3c'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(cx(st.pl[0]), cx(st.pl[1])); g.stroke(); g.globalAlpha = 1;
  }
  const showPop = !prev || t >= 1 ? 1 : tPop;
  if (!dead && info.heard && prev && t < 0.62) {   // 先是听见、转头，转过来看见了才是"看见你了"
    g.save(); g.globalAlpha = seg(t, 0.2, 0.35); bubble(g, lx, ly, '? 听见了', '#f0d060'); g.restore();
  } else if (!dead && showPop > 0) {
    g.save(); g.globalAlpha = showPop;
    if (lz.mode === '停') bubble(g, lx, ly, lz.tgt === '你' ? '! 看见你了' : '! 看见虫了', lz.tgt === '你' ? '#ff7a5c' : '#c8e88a');
    else if (lz.mode === '追') bubble(g, lx, ly, lz.tgt === '你' ? '追你' : '追虫', lz.tgt === '你' ? '#ff7a5c' : '#c8e88a');
    else if (lz.mode === '找') bubble(g, lx, ly, '去你刚才那儿', '#e0c070');
    else if (lz.mode === '吃') bubble(g, lx, ly, '嚼 ' + lz.eat, '#c8e88a');
    else if (info.heard) bubble(g, lx, ly, '? 听见了', '#f0d060');
    else if (prev && prev.lz.mode === '找' && lz.mode === '岗') bubble(g, lx, ly, '没看见，回去', '#9a9682');
    g.restore();
  }
  if (dead && t >= 1) {
    g.strokeStyle = COL.dead; g.lineWidth = 6; const X = cx(dead.at[0]), Y = cx(dead.at[1]);
    g.beginPath(); g.moveTo(X - 18, Y - 18); g.lineTo(X + 18, Y + 18); g.moveTo(X + 18, Y - 18); g.lineTo(X - 18, Y + 18); g.stroke();
  }
}

// 动一下：0.7 秒；按得快，上一个没放完就直接换下一个
let token = 0;
function animate(cv, m, info, done) {
  if (!info.prev || typeof requestAnimationFrame === 'undefined') { frame(cv, m, info, 1); done && done(); return; }
  const my = ++token, t0 = performance.now(), D = 700;
  function tick(now) {
    if (my !== token) return;
    const t = Math.min(1, (now - t0) / D);
    frame(cv, m, info, t);
    if (t < 1) requestAnimationFrame(tick); else done && done();
  }
  requestAnimationFrame(tick);
}
function still(cv, m, info) { token++; frame(cv, m, info, 1); }

root.WeiDraw = { frame, animate, still, drawLiz, drawBug, drawMe, drawNest, C };
})(this);
