# Sizzle & Serve

A tiny kitchen rush: stack the order, mind the grill, serve before the timer runs out.

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/museweilejing923/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/museweilejing923/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

## The game

You run a one-cook kitchen for a 3-minute shift. Customers pin orders on the
board — a Classic Burger, a Cheese Burger, a Garden Stack, or Fries & Drink —
each with its own countdown and reward. Click ingredients on the counter to
stack them on the assembly plate in recipe order, send raw patties to the
grill and grab them while they are perfectly cooked (too long and they burn),
then hit SERVE while the order still has time on it: the faster you serve,
the bigger the tip. Wrong ingredients cost points, expired orders walk away,
and every 4 dishes served the kitchen levels up and orders arrive faster.

## How to play

- **Mouse:** click ingredient bins, grill slots, SERVE and TRASH.
- **Keyboard:** `1–7` pick ingredients, `Space` serves, `T` trashes the plate,
  `P` pauses, `R` restarts, `M` toggles sound.
- **Sounds:** all effects are synthesized live with WebAudio — no audio files.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network, no libraries: plain static files under `game/`.

## Screenshots

Deterministic states, reproducible from the URL:

- `?shot=start&seed=1` — title screen
- `?shot=play&seed=1` — mid-shift
- `?shot=orders&seed=1` — fresh orders on the board
- `?shot=assemble&seed=1` — a dish mid-assembly
- `?shot=serve&seed=1` — a finished plate ready to serve

## Files

- `game/src/config.js` — ingredients, recipes, levels, palette
- `game/src/state.js` — orders, grill, plate, scoring, timers
- `game/src/input.js` — mouse + keyboard
- `game/src/render.js` — hand-drawn canvas kitchen
- `game/src/audio.js` — WebAudio synth effects
- `game/src/shots.js` — deterministic screenshot states
- `game/src/main.js` — main loop and action wiring

---

<sub>Entered on [make.fun](https://make.fun/bounty/best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
