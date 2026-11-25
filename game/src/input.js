// Sizzle & Serve — mouse and keyboard input.
// Render registers clickable rectangles each frame; this module hit-tests them.

const regions = [];
let mouse = { x: 0, y: 0 };
let hoverId = null;

export function clearRegions() { regions.length = 0; }

export function addRegion(id, x, y, w, h, onClick, opts = {}) {
  regions.push({ id, x, y, w, h, onClick, enabled: opts.enabled !== false, label: opts.label ?? '' });
}

export function pointerPos() { return mouse; }
export function hoveredId() { return hoverId; }

function hitAt(x, y) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (!r.enabled) continue;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

// Attach to a canvas that is scaled with CSS: convert client coords to the
// logical 1280x720 space using the canvas bounding box.
export function attachInput(canvas, scale, handlers) {
  const toLogical = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * scale.w,
      y: ((e.clientY - rect.top) / rect.height) * scale.h,
    };
  };
  canvas.addEventListener('pointermove', (e) => {
    mouse = toLogical(e);
    const r = hitAt(mouse.x, mouse.y);
    hoverId = r ? r.id : null;
    canvas.style.cursor = r ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerdown', (e) => {
    mouse = toLogical(e);
    const r = hitAt(mouse.x, mouse.y);
    if (r) {
      handlers.onRegion?.(r);
      r.onClick?.();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    handlers.onKey?.(e.key.toLowerCase());
  });
}

// Map keyboard shortcuts to game actions. Returns true when handled.
export function keyAction(key, state, actions) {
  const map = { 1: 'bun', 2: 'patty', 3: 'lettuce', 4: 'tomato', 5: 'cheese', 6: 'fries', 7: 'drink' };
  if (map[key]) { actions.pickIngredient(map[key]); return true; }
  if (key === ' ') { actions.serve(); return true; }
  if (key === 'p' || key === 'escape') { actions.togglePause(); return true; }
  if (key === 'r') { actions.restart(); return true; }
  if (key === 't') { actions.trash(); return true; }
  if (key === 'm') { actions.toggleMute(); return true; }
  if (key === 'enter' && state.screen !== 'play') { actions.start(); return true; }
  return false;
}
