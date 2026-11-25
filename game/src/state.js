// Sizzle & Serve — game state: orders, grill, plate, scoring, timers.
// Pure logic, no drawing and no DOM: main.js drives it, render.js reads it.
import {
  GAME_DURATION, GRILL, LEVELS, MAX_ORDERS, RECIPES, SCORES,
  ingredientById, levelFor, recipeById,
} from './config.js';

// ---- named constants (were magic numbers inline) --------------------------
// Plate capacity; combo bonus per serve already banked; serve-button pulse
// decay; doneness clamps at 100 (GRILL.burntAt); first order spawn delay.
const MAX_PLATE = 5;
const COMBO_BONUS_PER_SERVE = 2;
const PULSE_DECAY_PER_S = 1.5;
const DONENESS_MIN = 0;
const DONENESS_MAX = 100;
const FIRST_SPAWN_DELAY_S = 6;
// Flash-message lifetimes.
const FLASH_LONG = 2, FLASH_WRONG = 1.6, FLASH_INFO = 1.4, FLASH_BRIEF = 1.2;
// How long the SERVE button shakes when the plate does not match an order.
export const SHAKE_DURATION = 0.4;

// Small deterministic RNG (mulberry32) so screenshot states never wobble.
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let orderSeq = 0;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Doneness only ever lives in [0, 100]; callers pass raw values in.
const clampDoneness = (v) => clamp(v, DONENESS_MIN, DONENESS_MAX);

export function createState() {
  return {
    screen: 'title', // title | play | paused | over
    timeLeft: GAME_DURATION, score: 0, coins: 0, combo: 0, bestCombo: 0,
    served: 0, failed: 0, level: 1, spawnTimer: FIRST_SPAWN_DELAY_S,
    orders: [], plate: [], // ingredient ids, bottom to top
    grill: [null, null], // { doneness } per slot, null when empty
    flash: '', flashTimer: 0, servePulse: 0, shakeTimer: 0, muted: false, // transient message shown over the plate
    rng: makeRng((Math.random() * 1e9) | 0),
  };
}

export function startGame(state) {
  const fresh = createState();
  Object.assign(state, fresh, { screen: 'play' });
  spawnOrder(state);
  spawnOrder(state);
}

// ---- shared state helpers -------------------------------------------------
function setFlash(state, msg, secs = FLASH_INFO) { state.flash = msg; state.flashTimer = secs; }
// Every combo break goes through here so the rule lives in one place.
function resetCombo(state) { state.combo = 0; }
// Penalties never push the score below zero.
function applyPenalty(state, pts) { state.score = Math.max(0, state.score + pts); }
// ---- orders ---------------------------------------------------------------
export function spawnOrder(state, recipeId) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const level = levelFor(state.served);
  const pool = RECIPES.filter((r) => state.level >= 2 || r.id !== 'cheese');
  const recipe = recipeById(recipeId) ?? pool[Math.floor(state.rng() * pool.length)];
  const order = { id: ++orderSeq, recipeId: recipe.id, timeLeft: level.orderTime, total: level.orderTime, reward: recipe.price };
  state.orders.push(order);
  return order;
}

function expireOrder(state, order) {
  state.orders = state.orders.filter((o) => o !== order);
  state.failed += 1;
  resetCombo(state);
  applyPenalty(state, SCORES.expiredOrder);
  setFlash(state, `Order #${order.id} walked away! ${SCORES.expiredOrder}`, FLASH_LONG);
}
// ---- plate ----------------------------------------------------------------
// Recipes the current plate could still become, given its prefix.
export function plateCandidates(state) {
  return RECIPES.filter((r) => r.items.length >= state.plate.length && state.plate.every((id, i) => r.items[i] === id));
}
export function plateRecipe(state) {
  return RECIPES.find((r) => r.items.length === state.plate.length && r.items.every((id, i) => state.plate[i] === id)) ?? null;
}

// Which order, if any, this finished plate satisfies.
export function matchingOrder(state) {
  const done = plateRecipe(state);
  return done ? state.orders.find((o) => o.recipeId === done.id) ?? null : null;
}

// Add an ingredient to the plate (or, for a raw patty, to the grill).
// Returns 'grill' | 'added' | 'done' | 'wrong' | 'full' | 'ignored'.
export function addIngredient(state, id) {
  if (state.screen !== 'play') return 'wrong';
  const ing = ingredientById(id);
  if (!ing) return 'ignored'; // unknown id: ignore it, change nothing
  if (ing.grill) {
    const slot = state.grill.findIndex((g) => g === null);
    if (slot === -1) { setFlash(state, 'Grill is full!', FLASH_BRIEF); return 'full'; }
    state.grill[slot] = { doneness: DONENESS_MIN };
    return 'grill';
  }
  return stackOnPlate(state, id);
}

// Stack an ingredient straight onto the plate (used by bins and by the grill).
function stackOnPlate(state, id) {
  const ing = ingredientById(id);
  if (!ing) return 'ignored';
  if (state.plate.length >= MAX_PLATE) return 'full';
  const next = [...state.plate, id];
  const ok = RECIPES.some((r) => r.items.length >= next.length && next.every((v, i) => r.items[i] === v));
  if (!ok) {
    applyPenalty(state, SCORES.wrongIngredient);
    resetCombo(state);
    setFlash(state, `No recipe needs ${ing.name} here! ${SCORES.wrongIngredient}`, FLASH_WRONG);
    return 'wrong';
  }
  state.plate = next;
  return plateRecipe(state) ? 'done' : 'added';
}

// Take a finished patty off the grill and stack it on the plate.
export function takeFromGrill(state, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= state.grill.length) return 'ignored';
  const g = state.grill[slot];
  if (!g) return 'wrong';
  if (g.doneness < GRILL.perfectLow) {
    setFlash(state, 'Still raw inside! Let it sizzle.', FLASH_INFO);
    return 'wrong';
  }
  if (g.doneness >= GRILL.burntAt) {
    state.grill[slot] = null;
    applyPenalty(state, SCORES.burntPatty);
    setFlash(state, `Burnt patty binned. ${SCORES.burntPatty}`, FLASH_INFO);
    return 'burnt';
  }
  state.grill[slot] = null;
  return stackOnPlate(state, 'patty');
}

export function trashPlate(state) {
  if (state.plate.length === 0) return;
  state.plate = [];
  resetCombo(state);
  setFlash(state, 'Plate cleared — fresh start!', FLASH_BRIEF);
}
export function servePlate(state) {
  const order = matchingOrder(state);
  if (!order) {
    if (state.plate.length > 0) state.shakeTimer = SHAKE_DURATION; // wrong plate: shake the button
    return null;
  }
  const recipe = recipeById(order.recipeId);
  const tip = Math.round((order.timeLeft / order.total) * SCORES.tipMax);
  const earned = recipe.price + tip + state.combo * COMBO_BONUS_PER_SERVE;
  state.score += earned; state.coins += earned; state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.served += 1;
  state.orders = state.orders.filter((o) => o !== order);
  state.plate = [];
  state.servePulse = 1;
  const level = levelFor(state.served);
  if (level.level !== state.level) {
    state.level = level.level;
    setFlash(state, `Level ${state.level}! Orders are coming faster!`, FLASH_LONG);
  } else setFlash(state, `Served! +$${earned} (tip $${tip})`, FLASH_LONG);
  return earned;
}

// ---- clock ----------------------------------------------------------------
export function update(state, dt) {
  if (state.screen !== 'play') return;
  state.timeLeft -= dt;
  state.flashTimer = Math.max(0, state.flashTimer - dt);
  state.servePulse = Math.max(0, state.servePulse - dt * PULSE_DECAY_PER_S);
  state.shakeTimer = Math.max(0, (state.shakeTimer ?? 0) - dt);
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.screen = 'over';
    return;
  }
  for (const g of state.grill) if (g) g.doneness = clampDoneness(g.doneness + GRILL.cookRate * dt);
  for (const order of [...state.orders]) {
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) expireOrder(state, order);
  }
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.spawnTimer = levelFor(state.served).spawnEvery;
    spawnOrder(state);
  }
}
