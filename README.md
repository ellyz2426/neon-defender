# Neon Burger VR

A BurgerTime-inspired platformer arcade game built with [IWSDK](https://iwsdk.dev) (Immersive Web SDK). Walk over burger ingredients to drop them onto plates while avoiding enemies!

**[Play Now](https://ellyz2426.github.io/neon-burger/)**

## Features

- **Classic BurgerTime Mechanics** — Walk over ingredients on platforms to drop them, stack burgers on plates
- **4 Game Modes** — Arcade, Speed Run, Zen, Challenge
- **3 Difficulty Levels** — Normal, Hard, Insane
- **Enemy AI** — Mr. Hot Dog, Mr. Pickle, Mr. Egg with pathfinding
- **Pepper Power** — Stun nearby enemies with pepper attacks
- **20 Achievements** — Track your progress across games
- **PanelUI Spatial Interface** — 8 spatial panels (menu, HUD, pause, results, settings, tutorial, stats, achievements)
- **XR Controller Support** — Thumbstick movement, trigger/A for pepper, B for pause
- **Procedural Audio** — Synthesized sound effects and ambient music
- **Particle Effects** — Burst particles on events, ambient floating orbs
- **Holodeck Environment** — Neon wireframe aesthetic with fog, grid floor, pillars, star ceiling
- **Persistent Stats** — LocalStorage saves scores, achievements, and preferences

## Controls

### Keyboard
- Arrow Keys / WASD — Move left/right, climb ladders
- Space / F — Throw pepper (stuns enemies)
- Escape / P — Pause

### VR Controllers
- Thumbstick — Move
- Trigger / A Button — Throw pepper
- B Button — Pause

## Tech Stack

- IWSDK 0.4.1 (Meta's WebXR framework)
- PanelUI + uikitml for spatial UI
- TypeScript + Vite
- Procedural Web Audio API
