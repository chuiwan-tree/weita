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

// 画一帧。info：{prev, st, dead, drop, over, heard}；t：0..1 动画进度
function frame(cv, m, info, t) {
  const g = cv.getContext('2d');
  cv.width = m.w * C; cv.height = m.h * C;
  drawFloor(g, m); drawNest(g, m.nest);
  const { prev, st, dead, drop } = info;
  if (!dead && t >= 1) drawSight(g, m, st.lz);
  if (prev && t >= 1) {   // 这一回合的拖影：谁从哪来
    arrowTrail(g, prev.lz.pos, st.lz.pos);
    prev.bugs.forEach((b, i) => { if (b && st.bugs[i]) arrowTrail(g, b, st.bugs[i]); });
    if (!(prev.lz.pos[0] === st.lz.pos[0] && prev.lz.pos[1] === st.lz.pos[1])) drawLiz(g, cx(prev.lz.pos[0]), cx(prev.lz.pos[1]), prev.lz.face, 0.22);
  }
  if (drop && !dead && t >= 1) {   // 按 x 虫会落的那一格
    g.setLineDash([6, 5]); g.strokeStyle = COL.drop; g.lineWidth = 2.5; g.strokeRect(drop[0] * C + 6, drop[1] * C + 6, C - 12, C - 12); g.setLineDash([]);
  }
  // 虫
  st.bugs.forEach((b, i) => {
    if (!b) return;
    const pb = prev && prev.bugs[i];
    const [X, Y] = pb ? at(pb, b, t) : at(b);
    drawBug(g, X, Y);
  });
  // 被吃掉的虫：这一回合还在、下一回合没了，在原地淡出
  if (prev && t < 1) prev.bugs.forEach((b, i) => { if (b && !st.bugs[i]) drawBug(g, cx(b[0]), cx(b[1]), 1 - t); });
  // 吐出去的那只：从你脚下飞到落的那一格；当场被它吃了就在那格淡掉
  if (info.spit && t < 1) {
    const [sx, sy] = at(info.spit.from, info.spit.to, Math.min(1, t * 1.6));
    drawBug(g, sx, sy, t < 0.7 ? 1 : (1 - t) / 0.3);
  }
  // 我
  const [mx, my] = prev ? at(prev.pl, dead ? dead.at : st.pl, t) : at(st.pl);
  drawMe(g, mx, my, st.ate);
  // 蜥蜴
  const lp = dead ? dead.from : st.lz.pos;
  const [lx, ly] = prev ? at(prev.lz.pos, dead ? dead.at : lp, t) : at(lp);
  drawLiz(g, lx, ly, dead ? (prev ? prev.lz.face : st.lz.face) : st.lz.face);
  if (t >= 1 && !dead) {
    const lz = st.lz;
    if (lz.mode === '停') bubble(g, lx, ly, lz.tgt === '你' ? '! 盯上你' : '! 盯上虫', lz.tgt === '你' ? '#ff7a5c' : '#c8e88a');
    else if (lz.mode === '追') bubble(g, lx, ly, lz.tgt === '你' ? '追你' : '追虫', lz.tgt === '你' ? '#ff7a5c' : '#c8e88a');
    else if (lz.mode === '找') bubble(g, lx, ly, '找…', '#e0c070');
    else if (lz.mode === '吃') bubble(g, lx, ly, '嚼 ' + lz.eat, '#c8e88a');
    else if (info.heard) bubble(g, lx, ly, '? 听见了', '#f0d060');
  }
  if (dead && t >= 1) {
    g.strokeStyle = COL.dead; g.lineWidth = 6; const X = cx(dead.at[0]), Y = cx(dead.at[1]);
    g.beginPath(); g.moveTo(X - 18, Y - 18); g.lineTo(X + 18, Y + 18); g.moveTo(X + 18, Y - 18); g.lineTo(X - 18, Y + 18); g.stroke();
  }
}

// 动一下：0.25 秒滑过去
function animate(cv, m, info, done) {
  if (!info.prev || typeof requestAnimationFrame === 'undefined') { frame(cv, m, info, 1); done && done(); return; }
  const t0 = performance.now(), D = 250;
  function tick(now) {
    const t = Math.min(1, (now - t0) / D);
    frame(cv, m, info, t);
    if (t < 1) requestAnimationFrame(tick); else done && done();
  }
  requestAnimationFrame(tick);
}

root.WeiDraw = { frame, animate, drawLiz, drawBug, drawMe, drawNest, C };
})(this);
