// ===== 1. Get page elements =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const heartsEl = document.getElementById("hearts");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const startBtn = document.getElementById("startBtn");

// ===== 2. Game settings =====
const MAX_CRACKS = 3;          // lives
const MAX_SPEED = 480;
const SHADOW = "rgba(15, 35, 70, 0.28)";
const SHX = -16;               // shadow direction (left)
const SHY = 22;                // shadow direction (down)

// ===== 3. Small helpers to build level data (keeps the levels short) =====
function box(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
function pud(x, y, r) { return { x: x, y: y, r: r }; }
function pin(cx, cy, w, h, axis, amp, speed, phase) {
  return { cx: cx, cy: cy, w: w, h: h, axis: axis, amp: amp, speed: speed, phase: phase };
}
const COLORS = { bowl: "#c9574f", pot: "#9aa0a6", kettle: "#b8564b", jar: "#7fa38b" };
function rnd(x, y, r, type) { return { x: x, y: y, r: r, color: COLORS[type], type: type }; }

// A gate = 2 knives (top + bottom) with a small gap between them
function gate(x, gapY, gap, worldH) {
  return [box(x, 0, 20, gapY), box(x, gapY + gap, 20, worldH - (gapY + gap))];
}

// ===== 4. All levels (each level is just data) =====
const LEVELS = [
  // ---------- LEVEL 1: easy warm-up ----------
  {
    name: "Level 1 · Warm-Up Counter",
    world: [2600, 1500], start: [150, 1280], nest: [2450, 170], time: 80,
    walls: [box(0, 1000, 1700, 60), box(900, 600, 1700, 60), box(0, 250, 1700, 60)],
    knives: [box(500, 1150, 200, 20), box(1100, 1250, 20, 250), box(1350, 1300, 210, 20),
             box(1500, 760, 20, 240), box(1000, 660, 20, 200), box(1100, 400, 20, 200), box(2100, 0, 20, 110)],
    pins: [pin(800, 1280, 28, 160, "x", 100, 2.0, 2), pin(1250, 830, 28, 150, "x", 140, 1.6, 0),
           pin(1500, 450, 150, 28, "y", 110, 1.8, 1)],
    puddles: [pud(600, 1300, 90), pud(1900, 1150, 80), pud(950, 830, 85), pud(1300, 450, 90), pud(2250, 180, 75)],
    rounds: [rnd(400, 1420, 48, "bowl"), rnd(1250, 1130, 52, "pot"), rnd(400, 880, 46, "kettle"),
             rnd(500, 480, 40, "bowl"), rnd(2300, 1350, 55, "jar"), rnd(2300, 830, 50, "pot")],
    route: [[150, 1280], [1900, 1280], [1900, 830], [700, 830], [700, 450], [1900, 450], [1900, 180], [2450, 180]],
    extra: [[600, 1105], [1110, 1200], [1455, 1255], [1510, 710], [1110, 930], [1110, 360]]
  },

  // ---------- LEVEL 2: 4 long lanes, more knives + pins ----------
  {
    name: "Level 2 · Breakfast Rush",
    world: [2800, 1600], start: [150, 1400], nest: [2600, 225], time: 80,
    walls: [box(0, 1150, 2000, 60), box(800, 800, 2000, 60), box(0, 450, 2000, 60)],
    knives: [box(900, 1210, 20, 160), box(1500, 1380, 20, 220), box(1700, 860, 20, 150),
             box(1000, 1000, 20, 150), box(700, 510, 20, 150), box(1400, 650, 20, 150), box(2500, 0, 20, 170)],
    pins: [pin(1250, 1400, 28, 160, "x", 150, 1.8, 0), pin(1300, 1005, 160, 28, "y", 80, 2.0, 0),
           pin(1050, 655, 28, 160, "x", 200, 2.2, 1), pin(1900, 655, 160, 28, "y", 80, 2.4, 2)],
    puddles: [pud(500, 1400, 90), pud(1800, 1400, 85), pud(2400, 1250, 80), pud(1500, 1005, 85),
              pud(500, 655, 80), pud(1900, 655, 90), pud(2450, 225, 80)],
    rounds: [rnd(300, 1550, 45, "bowl"), rnd(2000, 1530, 50, "pot"), rnd(650, 920, 40, "kettle"),
             rnd(1900, 1090, 45, "pot"), rnd(300, 740, 45, "bowl"), rnd(1700, 560, 40, "jar"),
             rnd(1200, 300, 55, "pot"), rnd(2000, 120, 45, "kettle")],
    route: [[150, 1400], [2400, 1400], [2400, 1005], [400, 1005], [400, 655], [2400, 655], [2400, 225], [2600, 225]],
    extra: [[1010, 925], [1710, 1085], [710, 740], [1410, 580], [910, 1470], [1510, 1295]]
  },

  // ---------- LEVEL 3: vertical columns, zigzag knives, gate pins ----------
  {
    name: "Level 3 · Knife Block Alley",
    world: [3000, 1500], start: [150, 250], nest: [2800, 1250], time: 75,
    walls: [box(700, 0, 60, 1100), box(1300, 400, 60, 1100), box(1900, 0, 60, 1100), box(2500, 400, 60, 1100)],
    knives: [box(0, 550, 300, 20), box(400, 850, 300, 20),
             box(760, 900, 330, 20), box(970, 550, 330, 20),
             box(1360, 600, 330, 20), box(1570, 900, 330, 20),
             box(1960, 900, 330, 20), box(2170, 550, 330, 20),
             box(2560, 700, 260, 20), box(2740, 1000, 260, 20)],
    pins: [pin(350, 400, 150, 28, "x", 200, 2.0, 0), pin(560, 1300, 28, 160, "y", 100, 2.4, 1),
           pin(1030, 720, 150, 28, "x", 130, 2.2, 2), pin(1330, 200, 28, 150, "y", 110, 2.0, 0),
           pin(1630, 750, 150, 28, "x", 130, 2.4, 0.5), pin(1780, 1300, 28, 160, "y", 100, 2.6, 2),
           pin(2230, 725, 150, 28, "x", 130, 2.6, 1.5), pin(2530, 200, 28, 150, "y", 110, 2.4, 1),
           pin(2780, 850, 150, 28, "x", 100, 2.8, 0)],
    puddles: [pud(200, 1300, 85), pud(1000, 1230, 80), pud(1000, 330, 75), pud(1600, 320, 80),
              pud(2200, 1230, 85), pud(2200, 330, 75), pud(2800, 330, 80)],
    rounds: [rnd(60, 1000, 35, "bowl"), rnd(1200, 1400, 45, "pot"), rnd(1500, 1400, 40, "jar"),
             rnd(2400, 1350, 45, "kettle"), rnd(2000, 200, 40, "bowl"), rnd(2900, 1400, 45, "pot")],
    route: [[150, 250], [150, 1300], [1000, 1300], [1000, 250], [1600, 250], [1600, 1300],
            [2200, 1300], [2200, 250], [2800, 250], [2800, 1250]],
    extra: [[350, 720], [1200, 730], [1530, 760], [2230, 700], [2830, 850]]
  },

  // ---------- LEVEL 4: a spiral! tight 110px gaps, 13 pins, ice on every corner ----------
  {
    name: "Level 4 · Whisk Spiral",
    world: [2000, 1500], start: [120, 120], nest: [1000, 750], time: 95,
    walls: [box(0, 240, 1700, 60), box(1700, 240, 60, 960), box(240, 1200, 1520, 60),
            box(240, 540, 60, 720), box(240, 540, 1220, 60), box(1400, 540, 60, 420), box(540, 900, 920, 60)],
    knives: [
      // corridor 1 (top, going right)
      box(500, 0, 20, 130), box(1100, 110, 20, 130), box(1500, 0, 20, 130),
      // corridor 2 (right side, going down)
      box(1760, 500, 130, 20), box(1870, 850, 130, 20),
      // corridor 3 (bottom, going left)
      box(1500, 1260, 20, 130), box(1000, 1370, 20, 130), box(500, 1260, 20, 130),
      // corridor 4 (left side, going up)
      box(0, 1100, 130, 20), box(110, 700, 130, 20),
      // corridor 5 (going right)
      box(500, 300, 20, 130), box(1000, 410, 20, 130), box(1350, 300, 20, 130),
      // corridor 6 (going down)
      box(1460, 700, 130, 20), box(1570, 950, 130, 20),
      // corridor 7 (going left)
      box(1300, 960, 20, 130), box(900, 1070, 20, 130), box(600, 960, 20, 130),
      // corridor 8 (going up)
      box(300, 840, 130, 20)
    ],
    pins: [pin(800, 120, 28, 130, "y", 70, 2.4, 0), pin(1300, 120, 28, 130, "y", 70, 2.6, 1.5),
           pin(1880, 700, 130, 28, "x", 70, 2.6, 0), pin(1880, 1100, 130, 28, "x", 70, 2.8, 1),
           pin(1250, 1380, 28, 130, "y", 70, 2.6, 0), pin(750, 1380, 28, 130, "y", 70, 2.8, 2),
           pin(120, 900, 130, 28, "x", 70, 2.8, 0),
           pin(750, 420, 28, 130, "y", 70, 3.0, 0), pin(1175, 420, 28, 130, "y", 70, 3.0, 1),
           pin(1580, 825, 130, 28, "x", 70, 3.0, 0),
           pin(1100, 1080, 28, 130, "y", 70, 3.0, 0), pin(750, 1080, 28, 130, "y", 70, 3.2, 1),
           pin(900, 750, 28, 220, "y", 60, 3.4, 0)],
    puddles: [pud(1860, 180, 75), pud(1860, 1360, 75), pud(150, 1340, 75), pud(150, 460, 75),
              pud(1580, 470, 70), pud(1580, 1040, 70), pud(430, 1060, 70)],
    rounds: [],
    route: [[120, 120], [1880, 120], [1880, 1380], [120, 1380], [120, 420], [1580, 420],
            [1580, 1080], [420, 1080], [420, 750], [1000, 750]],
    extra: [[500, 190], [1100, 60], [1500, 190], [1945, 510], [1815, 860], [1500, 1445], [1000, 1315],
            [500, 1445], [190, 1110], [55, 710], [500, 485], [1000, 355], [1350, 485],
            [1645, 710], [1515, 960], [1300, 1145], [900, 1015], [600, 1145], [485, 850]]
  },

  // ---------- LEVEL 5: FINAL BOSS - knife gates with tiny gaps + ice + fast pins ----------
  {
    name: "Level 5 · Chef's Gauntlet",
    world: [2700, 1500], start: [150, 750], nest: [2550, 750], time: 55,
    walls: [],
    knives: [].concat(gate(500, 300, 120, 1500), gate(900, 1000, 120, 1500), gate(1300, 500, 120, 1500),
                      gate(1700, 1050, 120, 1500), gate(2100, 350, 120, 1500)),
    pins: [pin(700, 750, 28, 420, "x", 120, 2.8, 0), pin(1100, 750, 28, 420, "x", 120, 3.0, 1),
           pin(1500, 750, 28, 420, "x", 120, 3.2, 2), pin(1900, 750, 28, 420, "x", 120, 3.4, 0.5),
           pin(2330, 750, 28, 420, "x", 100, 3.6, 1),
           pin(1240, 560, 28, 100, "y", 70, 3.4, 0), pin(2040, 410, 28, 100, "y", 70, 3.6, 1)],
    puddles: [pud(400, 380, 70), pud(780, 1040, 70), pud(1180, 560, 70), pud(1580, 1100, 70),
              pud(1980, 420, 70), pud(2400, 750, 80)],
    rounds: [rnd(200, 250, 50, "bowl"), rnd(200, 1250, 55, "pot"), rnd(700, 150, 45, "kettle"),
             rnd(700, 1350, 45, "jar"), rnd(1100, 150, 50, "bowl"), rnd(1100, 1350, 50, "pot"),
             rnd(1500, 150, 45, "bowl"), rnd(1500, 1350, 50, "pot"), rnd(1900, 150, 45, "bowl"),
             rnd(1900, 1350, 45, "jar"), rnd(2400, 200, 50, "kettle"), rnd(2400, 1300, 50, "pot")],
    route: [[150, 750], [500, 360], [900, 1060], [1300, 560], [1700, 1110], [2100, 410], [2550, 750]],
    extra: [[510, 360], [910, 1060], [1310, 560], [1710, 1110], [2110, 410]]
  }
];

// ===== 5. Current level data (filled by loadLevel) =====
let WORLD_W = 0;
let WORLD_H = 0;
let START = { x: 0, y: 0 };
let NEST = { x: 0, y: 0, r: 50 };   // finish line
let TIME_LIMIT = 80;
let walls = [];
let knives = [];
let pins = [];
let puddles = [];
let rounds = [];
let crumbs = [];

// Copy one level's data into the game
function loadLevel(i) {
  levelIndex = i;
  const L = LEVELS[i];
  WORLD_W = L.world[0];
  WORLD_H = L.world[1];
  START = { x: L.start[0], y: L.start[1] };
  NEST = { x: L.nest[0], y: L.nest[1], r: 50 };
  TIME_LIMIT = L.time;
  walls = L.walls;
  knives = L.knives;
  puddles = L.puddles;
  rounds = L.rounds;
  pins = L.pins.map((p) => Object.assign({}, p));   // copy, because pins move
  makeCrumbs(L.route, L.extra);
  levelEl.textContent = i + 1;
}

// Crumbs = collectible points. We place them along the route.
function makeCrumbs(route, extra) {
  crumbs = [];
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
  // Extra crumbs inside the knife gaps (risk = reward)
  extra.forEach((p) => crumbs.push({ x: p[0], y: p[1], taken: false }));
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

// ===== 6. Game state =====
let levelIndex = 0;
let levelStartScore = 0;        // score when the level began (used for retry)
let nextAction = "newgame";     // what the big button does: "newgame", "next", "retry"
let state = "menu";             // "menu", "play", "win", "lose"
let egg = { x: 0, y: 0, vx: 0, vy: 0, r: 16, spin: 0 };
let timeLeft = TIME_LIMIT;
let score = 0;
let cracks = 0;
let invincible = 0;             // short protection after a pin hit
let gameTime = 0;
let clock = 0;                  // always running, for animations
let shake = 0;
let loseReason = "";

function makeEgg() {
  return { x: START.x, y: START.y, vx: 0, vy: 0, r: 16, spin: 0 };
}

// Start (or restart) one level
function startLevel(i) {
  loadLevel(i);
  egg = makeEgg();
  timeLeft = TIME_LIMIT;
  score = levelStartScore;
  cracks = 0;
  invincible = 0;
  gameTime = 0;
  shake = 0;
  loseReason = "";
  updatePins(0);
  state = "play";
  overlay.classList.add("hidden");
}

// What happens when the big overlay button is pressed
function onButton() {
  if (state === "play") return;   // stops double-trigger (Enter key + click)
  if (nextAction === "next") {
    levelStartScore = score;
    startLevel(levelIndex + 1);
  } else if (nextAction === "retry") {
    startLevel(levelIndex);
  } else {
    levelStartScore = 0;
    startLevel(0);
  }
}

function finish(result, reason) {
  state = result;
  loseReason = reason;
  let best = loadBest();
  const lastLevel = levelIndex === LEVELS.length - 1;
  let bonus = 0;

  if (result === "win") {
    egg.x = NEST.x; egg.y = NEST.y; egg.vx = 0; egg.vy = 0;
    bonus = Math.floor(timeLeft) * 5;
    score += bonus;
  } else {
    shake = 14;
  }
  if (score > best) { best = score; saveBest(best); }

  if (result === "win") {
    if (lastLevel) {
      ovTitle.textContent = "🏆 You beat the whole kitchen!";
      ovText.innerHTML = "Time bonus: " + bonus + "<br>Final score: <b>" + score + "</b> pts<br>Best: " + best;
      startBtn.textContent = "↻ Play again";
      nextAction = "newgame";
    } else {
      ovTitle.textContent = "🎉 Level " + (levelIndex + 1) + " clear!";
      ovText.innerHTML = "Time bonus: " + bonus + "<br>Total: <b>" + score + "</b> pts<br>Best: " + best +
        "<br><br>Next: " + LEVELS[levelIndex + 1].name;
      startBtn.textContent = "Next level ▶";
      nextAction = "next";
    }
  } else {
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
    startBtn.textContent = "↻ Retry level " + (levelIndex + 1);
    nextAction = "retry";
  }
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

// ===== 7. Input (keyboard + touch/mouse drag) =====
const keys = {};
const pointer = { active: false, sx: 0, sy: 0, x: 0, y: 0 };

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  if (k === "r") startLevel(levelIndex);                      // restart this level
  if (k === "enter" && state !== "play") onButton();
  if (["1", "2", "3", "4", "5"].includes(k)) {                // jump to a level (good for demo)
    levelStartScore = 0;
    startLevel(Number(k) - 1);
  }
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

startBtn.addEventListener("click", onButton);

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

// ===== 8. Helpers =====
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

// ===== 9. Update (game logic, runs every frame) =====
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
      invincible =
