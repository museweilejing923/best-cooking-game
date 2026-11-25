// Sizzle & Serve — canvas rendering: kitchen, order board, counter, grill,
// assembly plate and overlays. Layout numbers live in LAYOUT below; every
// repeated panel, button and progress bar goes through one helper.
import { CANVAS_W, CANVAS_H, COLOURS, GRILL, INGREDIENTS, MAX_ORDERS, ingredientById, recipeById } from './config.js';
import { addRegion, clearRegions, hoveredId } from './input.js';
import { SHAKE_DURATION, matchingOrder, plateRecipe } from './state.js';

const C = COLOURS;
// Palette + layout constants (were magic numbers inline).
const PAPER = '#fff8ec', BROWN = '#8a5a33', TAN = '#e0c9a8', CREAM = '#ffcf9e';
const GOLD = '#ffc93c', GOLD_DARK = '#e8a812', GREEN = '#58b368', GREEN_LIGHT = '#6fd07f';
const RED = '#e2574c', MUTED = '#a98f6e', FLOOR_DEEP = '#b57e4e';
const FONT = '"Trebuchet MS", Verdana, sans-serif';
const HUD_H = 56;
const ORDER = { x: 40, y: 88, w: 390, h: 74, step: 405, barW: 362, barH: 8 };
const BIN = { x: 40, y: 200, w: 152, h: 92, step: 168 };
const GRILL_BOX = { x: 40, y: 316, w: 380, h: 200 };
const PLATE_BOX = { x: 460, y: 316, w: 380, h: 200 };
const SERVE_BOX = { x: 880, y: 316, w: 360, h: 200 };
const HINTS = { x: 40, y: 560, w: 1200, h: 56 };
const CUSTOMER_NAMES = ['Maya', 'Leo', 'Zoe', 'Sam', 'Ivy', 'Max'];
const ORDER_URGENT_S = 10, TIME_URGENT_S = 30;
const GRILL_SLOT_W = 140, GRILL_SLOT_H = 70;
const SHAKE_PX = 6; // serve-button shake amplitude when the plate is wrong
const TIMER_BLINK_MS = 350; // low-time warning blink half-period
// ---- shared drawing helpers ------------------------------------------------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, s, x, y, size, colour, weight = 'bold', align = 'center') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
// A filled rounded panel, optionally stroked — the same two path builds the
// old code did by hand at every call site.
function panel(ctx, x, y, w, h, r, fill, stroke = null, lw = 2) {
  if (fill) { ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; rr(ctx, x, y, w, h, r); ctx.stroke(); }
}
// Track + filled fraction, both rounded.
function bar(ctx, x, y, w, h, frac, track, fill) {
  ctx.fillStyle = track; rr(ctx, x, y, w, h, 4); ctx.fill();
  ctx.fillStyle = fill; rr(ctx, x, y, Math.max(0, w * frac), h, 4); ctx.fill();
}
function fmtTime(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
// ---- food drawing ---------------------------------------------------------
export function drawIngredient(ctx, id, cx, cy, w, burnt = false) {
  const h = w * 0.62;
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'bun') {
    ctx.fillStyle = '#f2b25c'; rr(ctx, -w / 2, -h / 2, w, h * 0.55, h * 0.28); ctx.fill();
    ctx.fillStyle = '#e09a3e'; rr(ctx, -w / 2, -h * 0.05, w, h * 0.42, h * 0.2); ctx.fill();
    ctx.fillStyle = '#fff3d0';
    for (const [dx, dy] of [[-w * 0.25, -h * 0.28], [0, -h * 0.32], [w * 0.25, -h * 0.26]]) { ellipse(ctx, dx, dy, w * 0.05, h * 0.07); ctx.fill(); }
  } else if (id === 'patty') {
    ctx.fillStyle = burnt ? '#2b1a12' : '#8a4f2c'; rr(ctx, -w / 2, -h * 0.32, w, h * 0.64, h * 0.3); ctx.fill();
    ctx.fillStyle = burnt ? '#1c0f08' : '#6e3d20';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * w * 0.16 - w * 0.02, -h * 0.3, w * 0.04, h * 0.6);
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#7ec850'; ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = -w / 2 + (i / 8) * w, y = -h * 0.2 + (i % 2 === 0 ? -h * 0.22 : h * 0.18);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(w / 2, h * 0.25); ctx.lineTo(-w / 2, h * 0.25); ctx.closePath(); ctx.fill();
  } else if (id === 'tomato') {
    ctx.fillStyle = '#ef4b3f'; ellipse(ctx, 0, 0, w / 2, h * 0.42); ctx.fill();
    ctx.fillStyle = '#ff8a7a'; ellipse(ctx, 0, -h * 0.08, w * 0.32, h * 0.22); ctx.fill();
  } else if (id === 'cheese') {
    ctx.fillStyle = '#ffc93c'; ctx.beginPath();
    ctx.moveTo(-w / 2, h * 0.25); ctx.lineTo(w / 2, h * 0.25); ctx.lineTo(w * 0.28, -h * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8a812'; circle(ctx, w * 0.1, h * 0.02, w * 0.05); ctx.fill();
  } else if (id === 'fries') {
    ctx.fillStyle = '#d63a2f'; rr(ctx, -w * 0.42, -h * 0.1, w * 0.84, h * 0.55, 4); ctx.fill();
    ctx.fillStyle = '#ffd94d';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * w * 0.16 - w * 0.055, -h * 0.5, w * 0.11, h * 0.62);
  } else if (id === 'drink') {
    ctx.fillStyle = '#e2577b'; ctx.beginPath();
    ctx.moveTo(-w * 0.36, -h * 0.45); ctx.lineTo(w * 0.36, -h * 0.45);
    ctx.lineTo(w * 0.26, h * 0.45); ctx.lineTo(-w * 0.26, h * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-w * 0.4, -h * 0.52, w * 0.8, h * 0.12);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w * 0.1, -h * 0.5); ctx.lineTo(w * 0.3, -h * 0.85); ctx.stroke();
  }
  ctx.restore();
}
// ---- sections -------------------------------------------------------------
// HUD stat columns: label, x, value, value colour.
const HUD_STATS = [
  { label: 'SCORE', x: 330, value: (s) => String(s.score), colour: () => '#fff' },
  { label: 'COINS', x: 430, value: (s) => `$${s.coins}`, colour: () => '#ffd94d' },
  { label: 'COMBO', x: 530, value: (s) => (s.combo > 1 ? `x${s.combo}` : '—'), colour: (s) => (s.combo > 1 ? '#7ec850' : '#fff') },
  { label: 'LEVEL', x: 620, value: (s) => String(s.level), colour: () => '#fff' },
];
function drawHud(ctx, state, actions) {
  ctx.fillStyle = '#5b3a1e'; ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  text(ctx, 'SIZZLE & SERVE', 20, 28, 22, '#ffd94d', 'bold', 'left');
  for (const st of HUD_STATS) {
    text(ctx, st.label, st.x, 16, 11, CREAM);
    text(ctx, st.value(state), st.x, 38, 22, st.colour(state));
  }
  const urgent = state.timeLeft <= TIME_URGENT_S;
  // Low time: the pill blinks between two reds so it cannot be missed.
  const blinkOn = urgent && Math.floor(performance.now() / TIMER_BLINK_MS) % 2 === 0;
  panel(ctx, 700, 10, 150, 36, 10, urgent ? (blinkOn ? '#ff5a4e' : '#ff8a7a') : PAPER);
  text(ctx, `TIME ${fmtTime(state.timeLeft)}`, 775, 29, 22, urgent ? '#fff' : '#3a2a1a');
  const pauseLabel = state.screen === 'paused' ? 'RESUME' : 'II PAUSE';
  panel(ctx, 900, 10, 110, 36, 10, hoveredId() === 'pause' ? GOLD_DARK : GOLD);
  text(ctx, pauseLabel, 955, 29, 15, '#3a2a1a');
  addRegion('pause', 900, 10, 110, 36, () => actions.togglePause());
  panel(ctx, 1020, 10, 110, 36, 10, hoveredId() === 'mute' ? GOLD_DARK : GOLD);
  text(ctx, state.muted ? 'SOUND OFF' : 'SOUND ON', 1075, 29, 15, '#3a2a1a');
  addRegion('mute', 1020, 10, 110, 36, () => actions.toggleMute());
}
function drawOrders(ctx, state) {
  text(ctx, 'ORDER BOARD', 40, 76, 14, BROWN, 'bold', 'left');
  state.orders.forEach((order, i) => {
    const x = ORDER.x + i * ORDER.step, y = ORDER.y;
    const recipe = recipeById(order.recipeId);
    const frac = Math.max(0, order.timeLeft / order.total);
    const urgent = order.timeLeft <= ORDER_URGENT_S;
    panel(ctx, x, y, ORDER.w, ORDER.h, 12, PAPER, urgent ? RED : TAN, urgent ? 3 : 2);
    text(ctx, `#${order.id} ${CUSTOMER_NAMES[order.id % CUSTOMER_NAMES.length]}`, x + 14, y + 16, 14, C.ink, 'bold', 'left');
    text(ctx, recipe.name, x + 14, y + 38, 16, '#8a4f2e', 'bold', 'left');
    text(ctx, `$${recipe.price}`, x + 376, y + 16, 18, '#2e8b3a', 'bold', 'right');
    recipe.items.forEach((id, j) => drawIngredient(ctx, id, x + 228 + j * 22, y + 42, 22));
    bar(ctx, x + 14, y + 58, ORDER.barW, ORDER.barH, frac, '#e8dcc8', urgent ? RED : GREEN);
    text(ctx, `${Math.ceil(order.timeLeft)}s`, x + 376, y + 40, 13, urgent ? RED : BROWN, 'bold', 'right');
  });
  for (let i = state.orders.length; i < MAX_ORDERS; i++) {
    const x = ORDER.x + i * ORDER.step;
    panel(ctx, x, ORDER.y, ORDER.w, ORDER.h, 12, 'rgba(255,248,236,0.55)');
    text(ctx, 'Waiting for the next customer…', x + 195, 125, 14, MUTED);
  }
}
function drawCounter(ctx, state, actions) {
  text(ctx, 'COUNTER — click an ingredient, or press 1–7', 40, 190, 14, BROWN, 'bold', 'left');
  INGREDIENTS.forEach((ing, i) => {
    const x = BIN.x + i * BIN.step, y = BIN.y;
    const hover = hoveredId() === `bin-${ing.id}`;
    panel(ctx, x, y, BIN.w, BIN.h, 12, hover ? '#ffe1a8' : PAPER, TAN, 2);
    drawIngredient(ctx, ing.id, x + 76, y + 42, 64);
    text(ctx, ing.name, x + 76, y + 76, 13, C.ink);
    ctx.fillStyle = BROWN; circle(ctx, x + 14, y + 14, 11); ctx.fill();
    text(ctx, ing.key, x + 14, y + 15, 12, '#fff');
    if (ing.grill) text(ctx, '→ grill', x + 138, y + 14, 11, '#c22f24', 'bold', 'right');
    addRegion(`bin-${ing.id}`, x, y, BIN.w, BIN.h, () => actions.pickIngredient(ing.id), { label: ing.name });
  });
}
function drawGrill(ctx, state, actions) {
  const { x, y, w, h } = GRILL_BOX;
  panel(ctx, x, y, w, h, 14, '#3d3d3d');
  ctx.fillStyle = '#555';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 20 + i * 72, y + 14, 52, 6);
  text(ctx, 'GRILL — patties sizzle here', x + 16, y + 34, 14, '#ffd94d', 'bold', 'left');
  state.grill.forEach((g, slot) => {
    const gx = x + 40 + slot * 180, gy = y + 70;
    panel(ctx, gx, gy, GRILL_SLOT_W, GRILL_SLOT_H, 10, '#222');
    if (!g) {
      text(ctx, 'empty slot', gx + 70, gy + 35, 13, '#888');
    } else {
      const burnt = g.doneness >= GRILL.burntAt;
      const done = g.doneness >= GRILL.perfectLow && g.doneness < GRILL.burntAt;
      drawIngredient(ctx, 'patty', gx + 70, gy + 30, 78, burnt);
      bar(ctx, gx + 10, gy + 58, 120, 8, Math.min(1, g.doneness / 100), '#444', burnt ? RED : done ? GREEN : GOLD);
      text(ctx, burnt ? 'BURNT!' : done ? 'READY — click!' : 'cooking…', gx + 70, gy + 10, 11, burnt ? '#ff8a7a' : '#fff', 'bold');
    }
    addRegion(`grill-${slot}`, gx, gy, GRILL_SLOT_W, GRILL_SLOT_H, () => actions.takeFromGrill(slot));
  });
  text(ctx, 'Click a ready patty to stack it on the plate.', x + 190, y + 186, 12, '#aaa');
}
function drawPlate(ctx, state, actions) {
  const { x, y, w, h } = PLATE_BOX;
  const ready = matchingOrder(state);
  const done = plateRecipe(state);
  panel(ctx, x, y, w, h, 14, PAPER, ready ? GREEN : TAN, ready ? 4 : 2);
  text(ctx, 'ASSEMBLY PLATE', x + 190, y + 20, 14, BROWN, 'bold');
  ctx.fillStyle = '#eef1f4'; ellipse(ctx, x + 120, y + 150, 92, 18); ctx.fill();
  ctx.strokeStyle = '#c8d0d6'; ctx.lineWidth = 2; ellipse(ctx, x + 120, y + 150, 92, 18); ctx.stroke();
  if (state.plate.length === 0) {
    text(ctx, 'Empty plate — build a dish!', x + 120, y + 132, 14, MUTED);
  } else {
    state.plate.forEach((id, i) => drawIngredient(ctx, id, x + 120, y + 144 - i * 13, 108));
  }
  const hint = done ? `${done.name} — ready!` :
    state.plate.length === 0 ? 'Start with a bun, fries or a patty.' : 'Keep stacking to match an order…';
  text(ctx, hint, x + 190, y + 182, 12, done ? '#2e8b3a' : BROWN);
  text(ctx, 'ON THE PLATE', x + 300, y + 20, 12, BROWN, 'bold');
  if (state.plate.length === 0) text(ctx, '—', x + 300, y + 60, 14, MUTED);
  state.plate.forEach((id, i) => text(ctx, `${i + 1}. ${ingredientById(id).name}`, x + 300, y + 48 + i * 20, 13, C.ink, 'bold', 'left'));
  if (state.flash && state.flashTimer > 0) {
    panel(ctx, x - 20, y + 206, 420, 30, 8, 'rgba(58,42,26,0.9)');
    text(ctx, state.flash, x + 190, y + 222, 13, '#ffd94d');
  }
}
function drawServe(ctx, state, actions) {
  const { x, y, w, h } = SERVE_BOX;
  const order = matchingOrder(state);
  const pulse = 1 + state.servePulse * 0.08;
  panel(ctx, x, y, w, h, 14, PAPER, TAN, 2);
  text(ctx, 'SERVE', x + 180, y + 20, 14, BROWN, 'bold');
  const enabled = !!order;
  // Wrong plate: the button shakes briefly so the player notices the miss.
  const shake = state.shakeTimer > 0
    ? Math.sin(state.shakeTimer * 45) * SHAKE_PX * (state.shakeTimer / SHAKE_DURATION) : 0;
  ctx.save();
  ctx.translate(x + 180 + shake, y + 95);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = enabled ? (hoveredId() === 'serve' ? GREEN_LIGHT : GREEN) : '#c9c2b8';
  rr(ctx, -110, -34, 220, 68, 16); ctx.fill();
  text(ctx, enabled ? 'SERVE!' : 'SERVE', 0, -6, 24, '#fff');
  text(ctx, enabled ? `+$${order.reward} + tip` : 'finish a dish first', 0, 18, 12, '#fff');
  ctx.restore();
  addRegion('serve', x + 70, y + 61, 220, 68, () => actions.serve(), { enabled });
  panel(ctx, x + 70, y + 150, 220, 26, 8, hoveredId() === 'trash' ? '#ff8a7a' : RED);
  text(ctx, 'TRASH PLATE  (T)', x + 180, y + 164, 13, '#fff');
  addRegion('trash', x + 70, y + 150, 220, 26, () => actions.trash());
  text(ctx, `Served: ${state.served}   Walked away: ${state.failed}`, x + 180, y + 192, 12, BROWN);
}
function drawHints(ctx) {
  panel(ctx, HINTS.x, HINTS.y, HINTS.w, HINTS.h, 12, 'rgba(91,58,30,0.92)');
  text(ctx, 'HOW TO PLAY', 60, 576, 12, '#ffd94d', 'bold', 'left');
  text(ctx, '1–7 pick ingredients · click the grill to grab a cooked patty · SPACE serves · T trashes the plate · P pauses · R restarts', 60, 598, 13, PAPER, 'normal', 'left');
}
function drawTitle(ctx, state, actions) {
  ctx.fillStyle = 'rgba(43,26,12,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, 290, 130, 700, 420, 20, PAPER);
  text(ctx, 'SIZZLE & SERVE', 640, 190, 52, RED);
  text(ctx, 'A tiny kitchen, a rush of hungry customers.', 640, 240, 18, BROWN);
  drawIngredient(ctx, 'bun', 520, 310, 90);
  drawIngredient(ctx, 'patty', 600, 310, 90);
  drawIngredient(ctx, 'lettuce', 680, 310, 90);
  drawIngredient(ctx, 'tomato', 760, 310, 90);
  text(ctx, 'Stack the order, mind the grill, serve before the timer runs out!', 640, 360, 16, C.ink);
  text(ctx, '3-minute shift · orders pay more the faster you serve', 640, 388, 14, BROWN);
  panel(ctx, 490, 420, 300, 60, 14, hoveredId() === 'start' ? GREEN_LIGHT : GREEN);
  text(ctx, 'START COOKING', 640, 451, 24, '#fff');
  addRegion('start', 490, 420, 300, 60, () => actions.start());
  text(ctx, 'Mouse + keyboard  ·  1–7 ingredients  ·  SPACE serve  ·  P pause', 640, 512, 13, BROWN);
}
function drawPaused(ctx, actions) {
  ctx.fillStyle = 'rgba(43,26,12,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  text(ctx, 'PAUSED', 640, 320, 48, '#fff');
  text(ctx, 'Take a breath — the grill is holding.', 640, 368, 16, '#ffd94d');
  panel(ctx, 520, 400, 240, 54, 12, hoveredId() === 'resume' ? GREEN_LIGHT : GREEN);
  text(ctx, 'RESUME  (P)', 640, 428, 20, '#fff');
  addRegion('resume', 520, 400, 240, 54, () => actions.togglePause());
}
function drawGameOver(ctx, state, actions) {
  ctx.fillStyle = 'rgba(43,26,12,0.78)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, 340, 150, 600, 400, 20, PAPER);
  text(ctx, 'SHIFT OVER!', 640, 200, 44, RED);
  text(ctx, `Score  ${state.score}`, 640, 260, 28, C.ink);
  text(ctx, `Coins earned  $${state.coins}`, 640, 300, 20, '#2e8b3a');
  text(ctx, `Dishes served  ${state.served}    Best combo  x${Math.max(1, state.bestCombo)}    Walked away  ${state.failed}`, 640, 336, 16, BROWN);
  const verdict = state.score >= 200 ? 'Head-chef material!' : state.score >= 120 ? 'A solid shift!' : 'The kitchen survived — barely.';
  text(ctx, verdict, 640, 372, 18, RED);
  panel(ctx, 490, 410, 300, 60, 14, hoveredId() === 'again' ? GREEN_LIGHT : GREEN);
  text(ctx, 'COOK AGAIN  (R)', 640, 441, 22, '#fff');
  addRegion('again', 490, 410, 300, 60, () => actions.start());
  text(ctx, 'Tip: serve fast — tips shrink as the order timer runs down.', 640, 510, 13, BROWN);
}
// ---- main entry -----------------------------------------------------------
export function render(ctx, state, actions) {
  clearRegions();
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, C.wallTop);
  grad.addColorStop(0.55, C.wallBottom);
  grad.addColorStop(0.55, C.floor);
  grad.addColorStop(1, FLOOR_DEEP);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let x = 0; x < CANVAS_W; x += 80) ctx.fillRect(x, 300, 2, 420);
  ctx.fillStyle = C.counterTop; ctx.fillRect(0, 300, CANVAS_W, 340);
  ctx.fillStyle = C.counter; ctx.fillRect(0, 300, CANVAS_W, 10);
  drawHud(ctx, state, actions);
  drawOrders(ctx, state);
  drawCounter(ctx, state, actions);
  drawGrill(ctx, state, actions);
  drawPlate(ctx, state, actions);
  drawServe(ctx, state, actions);
  drawHints(ctx);
  if (state.screen === 'title') drawTitle(ctx, state, actions);
  else if (state.screen === 'paused') drawPaused(ctx, actions);
  else if (state.screen === 'over') drawGameOver(ctx, state, actions);
}
