// Sizzle & Serve — entry point: canvas setup, main loop, action wiring.
// The canvas is a fixed 1280x720 stage, letterboxed to fit the window.

import { CANVAS_H, CANVAS_W } from './config.js';
import {
  addIngredient, createState, servePlate, startGame,
  takeFromGrill, trashPlate, update,
} from './state.js';
import { render } from './render.js';
import { attachInput, keyAction } from './input.js';
import { applyShot, exposeForTests, shotFromUrl } from './shots.js';
import { setMuted, sfx, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const state = createState();
let lastTickSound = 0;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
  canvas.style.width = `${Math.floor(CANVAS_W * scale)}px`;
  canvas.style.height = `${Math.floor(CANVAS_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// ---- actions: the verbs render.js buttons and keys call -------------------

const actions = {
  start() {
    unlockAudio();
    startGame(state);
    sfx.ding();
  },
  pickIngredient(id) {
    unlockAudio();
    if (state.screen !== 'play') return;
    const result = addIngredient(state, id);
    if (result === 'grill') sfx.sizzle();
    else if (result === 'added' || result === 'done') sfx.place();
    else if (result === 'wrong') sfx.wrong();
    else if (result === 'full') sfx.wrong();
  },
  takeFromGrill(slot) {
    unlockAudio();
    if (state.screen !== 'play') return;
    const result = takeFromGrill(state, slot);
    if (result === 'added' || result === 'done') sfx.place();
    else if (result === 'burnt') sfx.wrong();
    else if (result === 'wrong') sfx.wrong();
  },
  serve() {
    unlockAudio();
    if (state.screen !== 'play') return;
    const prevLevel = state.level;
    const earned = servePlate(state);
    if (earned !== null) {
      sfx.ding();
      if (state.level > prevLevel) sfx.levelUp();
    } else {
      sfx.wrong();
    }
  },
  trash() {
    unlockAudio();
    if (state.screen !== 'play') return;
    trashPlate(state);
    sfx.click();
  },
  togglePause() {
    if (state.screen === 'play') { state.screen = 'paused'; sfx.click(); }
    else if (state.screen === 'paused') { state.screen = 'play'; sfx.click(); }
  },
  restart() {
    if (state.screen === 'over' || state.screen === 'paused') actions.start();
  },
  toggleMute() {
    state.muted = !state.muted;
    setMuted(state.muted);
  },
};

attachInput(canvas, { w: CANVAS_W, h: CANVAS_H }, {
  onRegion: () => unlockAudio(),
  onKey: (key) => {
    unlockAudio();
    keyAction(key, state, actions);
  },
});

// Deterministic screenshot states never tick: freeze the clock for shots.
const shot = shotFromUrl();
if (shot) {
  applyShot(state, shot);
  exposeForTests(state, actions);
} else {
  exposeForTests(state, actions);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shot) {
    update(state, dt);
    if (state.screen === 'play' && state.timeLeft <= 10
      && Math.floor(state.timeLeft) !== lastTickSound) {
      lastTickSound = Math.floor(state.timeLeft);
      sfx.tick();
    }
    if (state.screen === 'over' && !frame.overPlayed) {
      frame.overPlayed = true;
      sfx.gameOver();
    }
    if (state.screen === 'play') frame.overPlayed = false;
  }
  render(ctx, state, actions);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Screen-reader status line.
const status = document.getElementById('status');
setInterval(() => {
  if (!status) return;
  status.textContent = state.screen === 'play'
    ? `Score ${state.score}, ${state.orders.length} orders waiting, ${Math.ceil(state.timeLeft)} seconds left.`
    : state.screen === 'title' ? 'Sizzle and Serve. Press Enter to start cooking.'
      : `Shift over. Final score ${state.score}.`;
}, 1000);
