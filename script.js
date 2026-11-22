// ===== 1. Get page elements =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const heartsEl = document.getElementById("hearts");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const startBtn = document.getElementById("startBtn");

// ===== 2. Game settings =====
const WORLD_W = 2600;          // size of the whole kitchen floor
const WORLD_H = 1500;
const START = { x: 150, y: 1280 };
const NEST = { x: 2450, y: 170, r: 50 };   // finish line
const TIME_LIMIT = 80;         // seconds
const MAX_CRACKS = 3;          // lives
const MAX_SPEED = 480;
const SHADOW = "rgba(15, 35, 70, 0.28)";
const SHX = -16;               // shadow direction (left)
const SHY = 22;                // shadow direction (down)

// ===== 3. Level data =====
// Walls (cutting boards) that make the zigzag path
const walls = [
  { x: 0,   y: 1000, w: 1700, h: 60 },
  { x: 900, y: 600,  w: 1700, h: 60 },
  { x: 0,   y: 250,  w: 1700, h: 60 }
];

// Knives = instant game over
const knives = [
  { x: 500,  y: 1150, w: 200, h: 20 },
  { x: 1100, y: 1250, w: 20,  h: 250 },
  { x: 1350, y: 1300, w: 210, h: 20 },
  { x: 1500, y: 760,  w: 20,  h: 240 },
  { x: 1000, y: 660,  w: 20,  h: 200 },
  { x: 1100, y: 400,  w: 20,  h: 200 },
  { x: 2100, y: 0,    w: 20,  h: 110 }
];

// Rolling pins = moving obstacles (they slide back and forth)
const pins = [
  { cx: 800,  cy: 1280, w: 28,  h: 160, axis: "x", amp: 100, speed: 2.0, phase: 2 },
  { cx: 1250, cy: 830,  w: 28,  h: 150, axis: "x", amp: 140, speed: 1.6, phase: 0 },
  { cx: 1500, cy: 450,  w: 150, h: 28,  axis: "y", amp: 110, speed: 1.8, phase: 1 }
];

// Spilled water = slippery circles
const puddles = [
  { x: 600,  y: 1300, r: 90 },
  { x: 1900, y: 1150, r: 80 },
  { x: 950,  y: 830,  r: 85 },
  { x: 1300, y: 450,  r: 90 },
  { x: 2250, y: 180,  r: 75 }
];

// Kitchen stuff you bounce off (bowls, pots, kettle, jar)
const rounds = [
  { x: 400,  y: 1420, r: 48, color: "#c9574f", type: "bowl" },
  { x: 1250, y: 1130, r: 52, color: "#9aa0a6", type: "pot" },
  { x: 400,  y: 880,  r: 46, color: "#b8564b", type: "kettle" },
  { x: 500,  y: 480,  r: 40, color: "#d98c3f", type: "bowl" },
  { x: 2300, y: 1350, r: 55, color: "#7fa38b", type: "jar" },
  { x: 2300, y: 830,  r: 50, color: "#c9574f", type: "pot" }
];

// Crumbs = collectible points. We place them along the route.
const route = [[150,1280],[1900,1280],[1900,830],[700,830],[700,450],[1900,450],[1900,180],[2450,180]];
const crumbs = [];

function makeCrumbs() {
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const steps = Math.floor(dist(a[0], a[1], b[0], b[1]) / 110);
    for (let s = 1; s <= steps; s++) {
      const x = a[0] + (b[0] - a[0]) * (s / steps);
      const y = a[1] + (b[1] - a[1]) * (s / steps);
      if (!isBlocked(x, y)) crumbs.push({ x: x, y: y, taken: false });
    }
  }
  // Extra crumbs on the safe lanes near knives (risk = reward)
  [[600,1105],[1110,1200],[1455,1255],[1510,710],[1110,930],[1110,360]].forEach((p) => {
    crumbs.push({ x: p[0], y: p[1], taken: false });
  });
}

// True if a point is too close to a wall, knife, or round object
function isBlocked(x, y) {
  const pad = 30;
  for (const r of walls.concat(knives)) {
    if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true;
  }
  for (const o of rounds) {
    if (dist(x, y, o.x, o.y) < o.r + 25) return true;
  }
  return false;
}

// ===== 4. Game state =====
let state = "menu";   // "menu", "play", "win", "lose"
let egg = makeEgg();
let timeLeft = TIME_LIMIT;
let score = 0;
let cracks = 0;
let invincible = 0;   // short protection after a pin hit
let gameTime = 0;
let clock = 0;        // always running, for animations
let shake = 0;
let loseReason = "";

function makeEgg() {
  return { x: START.x, y: START.y, vx: 0, vy: 0, r: 16, spin: 0 };
}

function resetGame() {
  egg = makeEgg();
  timeLeft = TIME_LIMIT;
  score = 0;
  cracks = 0;
  invincible = 0;
  gameTime = 0;
  shake = 0;
  loseReason = "";
  crumbs.forEach((c) => (c.taken = false));
  updatePins(0);
  state = "play";
  overlay.classList.add("hidden");
}

function finish(result, reason) {
  state = result;
  loseReason = reason;
  let best = loadBest();

  if (result === "win") {
    egg.x = NEST.x; egg.y = NEST.y; egg.vx = 0; egg.vy = 0;
    const bonus = Math.floor(timeLeft) * 5;
    score += bonus;
    if (score > best) { best = score; saveBest(best); }
    ovTitle.textContent = "🎉 Egg-cellent! You made it!";
    ovText.innerHTML = "Time bonus: " + bonus + "<br>Total: <b>" + score + "</b> pts<br>Best: " + best;
  } else {
    shake = 14;
    if (reason === "knife") {
      ovTitle.textContent = "🔪 Sliced!";
      ovText.innerHTML = "That knife was NOT friendly.<br>Score: " + score + " · Best: " + best;
    } else if (reason === "cracked") {
      ovTitle.textContent = "🍳 Cracked!";
      ovText.innerHTML = "Too many pin hits. Sunny side up!<br>Score: " + score + " · Best: " + best;
    } else {
      ovTitle.textContent = "⏰ Time's up!";
      ovText.innerHTML = "The egg got cold.<br>Score: " + score + " · Best: " + best;
    }
  }
  startBtn.textContent = "↻ Try again";
  // wait a bit so the player can see the splat
  setTimeout(() => { if (state !== "play") overlay.classList.remove("hidden"); }, 600);
}

// Save best score in the browser (no backend needed)
function loadBest() {
  try { return Number(localStorage.getItem("egg-best")) || 0; } catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem("egg-best", v); } catch (e) {}
}

// ===== 5. Input (keyboard + touch/mouse drag) =====
const keys = {};
const pointer = { active: false, sx: 0, sy: 0, x: 0, y: 0 };

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  if (k === "r" || (k === "enter" && state !== "play")) resetGame();
});
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener("pointerdown", (e) => {
  pointer.active = true;
  pointer.sx = pointer.x = e.clientX;
  pointer.sy = pointer.y = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (pointer.active) { pointer.x = e.clientX; pointer.y = e.clientY; }
});
canvas.addEventListener("pointerup", () => { pointer.active = false; });
canvas.addEventListener("pointercancel", () => { pointer.active = false; });

startBtn.addEventListener("click", resetGame);

// Returns a direction like { x: 1, y: 0 } from keys or finger drag
function getInput() {
  let x = 0, y = 0;
  if (keys["arrowleft"] || keys["a"]) x -= 1;
  if (keys["arrowright"] || keys["d"]) x += 1;
  if (keys["arrowup"] || keys["w"]) y -= 1;
  if (keys["arrowdown"] || keys["s"]) y += 1;

  if (pointer.active) {
    const dx = pointer.x - pointer.sx;
    const dy = pointer.y - pointer.sy;
    const len = Math.hypot(dx, dy);
    if (len > 8) {
      const power = Math.min(len, 60) / 60;
      x += (dx / len) * power;
      y += (dy / len) * power;
    }
  }
  const mag = Math.hypot(x, y);
  if (mag > 1) { x /= mag; y /= mag; }
  return { x: x, y: y };
}

// ===== 6. Helpers =====
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

// Circle vs rectangle. Returns push direction if touching, else null.
function circleRectInfo(c, rect) {
  const px = clamp(c.x, rect.x, rect.x + rect.w);
  const py = clamp(c.y, rect.y, rect.y + rect.h);
  const dx = c.x - px;
  const dy = c.y - py;
  const d = Math.hypot(dx, dy);
  if (d >= c.r) return null;
  if (d === 0) return { nx: 0, ny: -1, depth: c.r };
  return { nx: dx / d, ny: dy / d, depth: c.r - d };
}

// Push the egg out of an object and bounce it
function pushOut(info, bounce) {
  egg.x += info.nx * info.depth;
  egg.y += info.ny * info.depth;
  const dot = egg.vx * info.nx + egg.vy * info.ny;
  if (dot < 0) {
    egg.vx -= (1 + bounce) * dot * info.nx;
    egg.vy -= (1 + bounce) * dot * info.ny;
  }
}

// Move the rolling pins using a sine wave (smooth back and forth)
function updatePins(t) {
  for (const p of pins) {
    const off = Math.sin(t * p.speed + p.phase) * p.amp;
    const cx = p.axis === "x" ? p.cx + off : p.cx;
    const cy = p.axis === "y" ? p.cy + off : p.cy;
    p.x = cx - p.w / 2;
    p.y = cy - p.h / 2;
  }
}

// ===== 7. Update (game logic, runs every frame) =====
function update(dt) {
  gameTime += dt;
  timeLeft -= dt;
  invincible = Math.max(0, invincible - dt);
  if (timeLeft <= 0) { timeLeft = 0; finish("lose", "time"); return; }

  updatePins(gameTime);

  // Movement: push the egg, then apply friction
  const input = getInput();
  const onWater = puddles.some((p) => dist(egg.x, egg.y, p.x, p.y) < p.r);
  const accel = onWater ? 380 : 900;       // less control on water
  const friction = onWater ? 0.35 : 2.4;   // slides longer on water

  egg.vx += input.x * accel * dt;
  egg.vy += input.y * accel * dt;
  const damp = Math.exp(-friction * dt);
  egg.vx *= damp;
  egg.vy *= damp;

  const speed = Math.hypot(egg.vx, egg.vy);
  if (speed > MAX_SPEED) {
    egg.vx = (egg.vx / speed) * MAX_SPEED;
    egg.vy = (egg.vy / speed) * MAX_SPEED;
  }
  egg.x += egg.vx * dt;
  egg.y += egg.vy * dt;
  egg.spin += (egg.vx * dt) / egg.r;

  // Kitchen edges
  if (egg.x < egg.r) { egg.x = egg.r; egg.vx = Math.abs(egg.vx) * 0.5; }
  if (egg.x > WORLD_W - egg.r) { egg.x = WORLD_W - egg.r; egg.vx = -Math.abs(egg.vx) * 0.5; }
  if (egg.y < egg.r) { egg.y = egg.r; egg.vy = Math.abs(egg.vy) * 0.5; }
  if (egg.y > WORLD_H - egg.r) { egg.y = WORLD_H - egg.r; egg.vy = -Math.abs(egg.vy) * 0.5; }

  // Walls
  for (const w of walls) {
    const info = circleRectInfo(egg, w);
    if (info) pushOut(info, 0.5);
  }

  // Bowls, pots, etc.
  for (const o of rounds) {
    const d = dist(egg.x, egg.y, o.x, o.y);
    if (d > 0 && d < egg.r + o.r) {
      pushOut({ nx: (egg.x - o.x) / d, ny: (egg.y - o.y) / d, depth: egg.r + o.r - d }, 0.5);
    }
  }

  // Knives = instant game over
  for (const k of knives) {
    if (circleRectInfo(egg, k)) { finish("lose", "knife"); return; }
  }

  // Rolling pins = lose one life and get knocked back
  for (const p of pins) {
    const info = circleRectInfo(egg, p);
    if (!info) continue;
    if (invincible === 0) {
      pushOut(info, 0);
      egg.vx = info.nx * 420;
      egg.vy = info.ny * 420;
      cracks += 1;
      invincible = 1.2;
      shake = 12;
      if (cracks >= MAX_CRACKS) { finish("lose", "cracked"); return; }
    } else {
      pushOut(info, 0.5);
    }
  }

  // Crumbs = +10 points
  for (const c of crumbs) {
    if (!c.taken && dist(egg.x, egg.y, c.x, c.y) < egg.r + 8) {
      c.taken = true;
      score += 10;
    }
  }

  // Nest = finish line
  if (dist(egg.x, egg.y, NEST.x, NEST.y) < NEST.r - 12) finish("win", "");
}

// ===== 8. Drawing helpers (flat low-poly style + long shadows) =====
function disc(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fill();
}

// Long shadow for rectangles
function shadowRect(x, y, w, h) {
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w + SHX, y + h + SHY);
  ctx.lineTo(x + SHX, y + h + SHY);
  ctx.lineTo(x + SHX, y + SHY);
  ctx.closePath();
  ctx.fill();
}

// Long shadow for circles
function shadowCapsule(x, y, r) {
  ctx.strokeStyle = SHADOW;
  ctx.lineCap = "round";
  ctx.lineWidth = r * 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + SHX, y + SHY);
  ctx.stroke();
}

// A box with a darker "side" so it looks chunky 3D
function drawBox(x, y, w, h, color, depth, radius) {
  shadowRect(x, y + depth, w, h);
  ctx.fillStyle = color;
  rr(x, y + depth, w, h, radius);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  rr(x, y + depth, w, h, radius);
  ctx.fillStyle = color;
  rr(x, y, w, h, radius);
}

function drawWall(w) {
  drawBox(w.x, w.y, w.w, w.h, "#d9a066", 10, 10);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  for (let xx = w.x + 120; xx < w.x + w.w - 100; xx += 240) ctx.fillRect(xx, w.y + 8, 100, 6);
}

function drawKnife(k) {
  const handle = 60;
  if (k.w > k.h) {
    drawBox(k.x + handle, k.y, k.w - handle, k.h, "#dfe5ec", 6, 8);
    drawBox(k.x, k.y - 3, handle, k.h + 6, "#5a3a2a", 6, 6);
    ctx.fillStyle = "#ff5a5a"; // red edge = danger
    ctx.fillRect(k.x + handle, k.y + k.h - 3, k.w - handle, 3);
  } else {
    drawBox(k.x, k.y + handle, k.w, k.h - handle, "#dfe5ec", 6, 8);
    drawBox(k.x - 3, k.y, k.w + 6, handle, "#5a3a2a", 6, 6);
    ctx.fillStyle = "#ff5a5a";
    ctx.fillRect(k.x + k.w - 3, k.y + handle, 3, k.h - handle);
  }
}

function drawPin(p) {
  drawBox(p.x, p.y, p.w, p.h, "#e8b678", 8, 14);
  ctx.fillStyle = "#b9742f"; // handles
  if (p.w > p.h) {
    rr(p.x, p.y, 24, p.h, 12);
    rr(p.x + p.w - 24, p.y, 24, p.h, 12);
  } else {
    rr(p.x, p.y, p.w, 24, 12);
    rr(p.x, p.y + p.h - 24, p.w, 24, 12);
  }
}

function drawRound(o) {
  const d = 10;
  shadowCapsule(o.x, o.y + d, o.r);
  disc(o.x, o.y + d, o.r, o.color);
  disc(o.x, o.y + d, o.r, "rgba(0,0,0,0.3)");
  disc(o.x, o.y, o.r, o.color);

  if (o.type === "bowl") {
    disc(o.x, o.y, o.r * 0.78, "rgba(255,255,255,0.3)");
    disc(o.x, o.y, o.r * 0.6, "#e6c48a");
    ctx.fillStyle = "#b9722e";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(o.x + Math.cos(i * 1.05) * o.r * 0.33, o.y + Math.sin(i * 1.05) * o.r * 0.33, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (o.type === "pot") {
    disc(o.x, o.y, o.r * 0.8, "#4d5359");
    disc(o.x, o.y, o.r * 0.62, "#6b7278");
    drawBox(o.x + o.r - 4, o.y - 7, 34, 14, "#5a3a2a", 4, 6);
  } else if (o.type === "kettle") {
    disc(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.35, "rgba(255,255,255,0.25)");
    disc(o.x, o.y, o.r * 0.22, "#7a2f2a");
  } else {
    disc(o.x, o.y, o.r * 0.75, "#a8c7b3");
    disc(o.x, o.y, o.r * 0.55, "#8fb39e");
  }
}

function drawPuddle(p) {
  disc(p.x, p.y, p.r, "rgba(150,215,245,0.8)");
  disc(p.x - 8, p.y - 8, p.r * 0.75, "rgba(255,255,255,0.22)");
  ctx.strokeStyle = "rgba(255,255,255," + (0.3 + Math.sin(clock * 3) * 0.15) + ")";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 0.5 + Math.sin(clock * 3) * 4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawNest() {
  shadowCapsule(NEST.x, NEST.y + 8, NEST.r);
  disc(NEST.x, NEST.y + 8, NEST.r, "#6f4524");
  disc(NEST.x, NEST.y, NEST.r, "#a8743a");
  disc(NEST.x, NEST.y, NEST.r * 0.8, "#d2a35c");
  ctx.strokeStyle = "#8a5a2b";
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i++) {
    const a = i * 0.63;
    ctx.beginPath();
    ctx.moveTo(NEST.x + Math.cos(a) * 18, NEST.y + Math.sin(a) * 18);
    ctx.lineTo(NEST.x + Math.cos(a + 0.7) * 44, NEST.y + Math.sin(a + 0.7) * 44);
    ctx.stroke();
  }
  disc(NEST.x, NEST.y, 20, "#7b4f26");
  ctx.fillStyle = "white";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏁 NEST", NEST.x, NEST.y - NEST.r - 14);
}

function drawCrumb(c) {
  const y = c.y + Math.sin(clock * 4 + c.x) * 3;
  disc(c.x, y + 4, 6, "rgba(15,35,70,0.25)");
  disc(c.x, y, 7, "#ffc83d");
  disc(c.x - 2, y - 2, 2.5, "#fff0a8");
}

function drawEgg() {
  shadowCapsule(egg.x, egg.y + 4, egg.r * 0.9);

  // Blink while protected
  if (invincible > 0 && Math.floor(clock * 14) % 2 === 0) ctx.globalAlpha = 0.5;

  ctx.save();
  ctx.translate(egg.x, egg.y - 6);
  ctx.rotate(egg.spin);
  ctx.fillStyle = "#fff6e8";
  ctx.beginPath();
  ctx.ellipse(0, 0, egg.r * 0.95, egg.r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c98f5a";   // speckles (they spin so you see it rolling)
  [[-6, -4, 2.2], [5, 6, 2], [7, -8, 1.6], [-8, 8, 1.6]].forEach((s) => {
    ctx.beginPath();
    ctx.arc(s[0], s[1], s[2], 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Highlight and cracks do not rotate
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(egg.x - 6, egg.y - 14, 4, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7a5a3a";
  ctx.lineWidth = 1.8;
  if (cracks >= 1) {
    ctx.beginPath();
    ctx.moveTo(egg.x - 4, egg.y - 20); ctx.lineTo(egg.x, egg.y - 12);
    ctx.lineTo(egg.x - 5, egg.y - 6); ctx.lineTo(egg.x + 1, egg.y);
    ctx.stroke();
  }
  if (cracks >= 2) {
    ctx.beginPath();
    ctx.moveTo(egg.x + 7, egg.y - 16); ctx.lineTo(egg.x + 3, egg.y - 9);
    ctx.lineTo(egg.x + 8, egg.y - 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Fried egg splat when the egg dies
function drawSplat(x, y) {
  ctx.fillStyle = "#fffaf0";
  [[0, 0, 24], [-18, 6, 14], [16, 10, 16], [4, -18, 12], [-8, 18, 10]].forEach((s) => {
    ctx.beginPath();
    ctx.arc(x + s[0], y + s[1], s[2], 0, Math.PI * 2);
    ctx.fill();
  });
  disc(x, y, 10, "#ffb300");
  disc(x - 3, y - 3, 3, "#ffe08a");
}

// ===== 9. Render (draw everything) =====
function render() {
  // Camera follows the egg
  const camX = clamp(egg.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  const camY = clamp(egg.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;

  ctx.fillStyle = "#6b93b9";   // kitchen floor
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(-camX + sx, -camY + sy);

  // Floor tile lines
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = Math.floor(camX / 200) * 200; x < camX + VIEW_W + 200; x += 200) {
    ctx.moveTo(x, camY - 10); ctx.lineTo(x, camY + VIEW_H + 10);
  }
  for (let y = Math.floor(camY / 200) * 200; y < camY + VIEW_H + 200; y += 200) {
    ctx.moveTo(camX - 10, y); ctx.lineTo(camX + VIEW_W + 10, y);
  }
  ctx.stroke();

  // START label
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("START →", START.x + 20, START.y + 70);

  puddles.forEach(drawPuddle);
  drawNest();
  crumbs.forEach((c) => { if (!c.taken) drawCrumb(c); });
  walls.forEach(drawWall);
  rounds.forEach(drawRound);
  knives.forEach(drawKnife);
  pins.forEach(drawPin);

  if (state === "lose" && loseReason !== "time") drawSplat(egg.x, egg.y);
  else drawEgg();

  ctx.restore();
}

// ===== 10. HUD =====
function updateHud() {
  timeEl.textContent = Math.ceil(timeLeft);
  scoreEl.textContent = score;
  heartsEl.textContent = "🥚".repeat(MAX_CRACKS - cracks) + "🍳".repeat(cracks);
}

// ===== 11. Main loop =====
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  clock += dt;
  if (state === "play") update(dt);
  shake = Math.max(0, shake - dt * 40);
  render();
  updateHud();
  requestAnimationFrame(loop);
}

// ===== 12. Start =====
makeCrumbs();
updatePins(0);
requestAnimationFrame(loop);
