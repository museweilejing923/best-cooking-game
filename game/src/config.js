// Sizzle & Serve — game configuration: ingredients, recipes, levels, colours.
// Every tunable number lives here so balancing never touches game logic.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const GAME_DURATION = 180; // seconds per shift
export const MAX_ORDERS = 3;

// Ingredients the counter offers. `key` is the keyboard shortcut, `bin` the
// colour of its counter bin, `grill` means it must be cooked before plating.
export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     key: '1', colour: '#f2b25c', dark: '#c98a35', grill: false },
  { id: 'patty',   name: 'Patty',   key: '2', colour: '#a9603c', dark: '#7c4527', grill: true },
  { id: 'lettuce', name: 'Lettuce', key: '3', colour: '#7ec850', dark: '#4f9c2e', grill: false },
  { id: 'tomato',  name: 'Tomato',  key: '4', colour: '#ef4b3f', dark: '#c22f24', grill: false },
  { id: 'cheese',  name: 'Cheese',  key: '5', colour: '#ffc93c', dark: '#e8a812', grill: false },
  { id: 'fries',   name: 'Fries',   key: '6', colour: '#ffd94d', dark: '#e0a92e', grill: false },
  { id: 'drink',   name: 'Drink',   key: '7', colour: '#e2577b', dark: '#b83a5e', grill: false },
];

export const ingredientById = (id) => INGREDIENTS.find((i) => i.id === id);

// Recipes: the exact stack order, bottom to top. `price` is the base reward.
export const RECIPES = [
  { id: 'classic', name: 'Classic Burger', price: 18, items: ['bun', 'patty', 'lettuce', 'tomato', 'bun'] },
  { id: 'cheese',  name: 'Cheese Burger',  price: 22, items: ['bun', 'patty', 'cheese', 'lettuce', 'bun'] },
  { id: 'garden',  name: 'Garden Stack',   price: 16, items: ['bun', 'lettuce', 'tomato', 'cheese', 'bun'] },
  { id: 'snack',   name: 'Fries & Drink',  price: 12, items: ['fries', 'drink'] },
];

export const recipeById = (id) => RECIPES.find((r) => r.id === id);

// Level curve: orders arrive faster and expire sooner as the shift heats up.
export const LEVELS = [
  { level: 1, spawnEvery: 14, orderTime: 55, serveTarget: 0 },
  { level: 2, spawnEvery: 12, orderTime: 50, serveTarget: 4 },
  { level: 3, spawnEvery: 10, orderTime: 45, serveTarget: 9 },
  { level: 4, spawnEvery: 8,  orderTime: 40, serveTarget: 15 },
  { level: 5, spawnEvery: 7,  orderTime: 36, serveTarget: 22 },
];

export const levelFor = (served) => {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (served >= l.serveTarget) cur = l;
  return cur;
};

// Grill: a patty is perfect between these doneness values, burnt past the top.
export const GRILL = { perfectLow: 55, perfectHigh: 95, burntAt: 100, cookRate: 11 };

export const SCORES = {
  wrongIngredient: -10,
  expiredOrder: -15,
  burntPatty: -5,
  tipMax: 8,
};

// Palette for the kitchen.
export const COLOURS = {
  wallTop: '#ffe9c4',
  wallBottom: '#ffd9a0',
  floor: '#c98f5f',
  counter: '#8a5a33',
  counterTop: '#b07a45',
  steel: '#d7dde3',
  steelDark: '#9aa5ad',
  board: '#fff8ec',
  ink: '#3a2a1a',
  accent: '#e2574c',
  gold: '#ffc93c',
  green: '#58b368',
};
