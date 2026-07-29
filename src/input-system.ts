// Neon Defender VR — Input System
import { createSystem, World } from '@iwsdk/core';
import { S, PLAYER_SPEED } from './game-state.js';
import { shoot, smartBomb, togglePause, startGame, returnToMenu } from './game-system.js';

const keys: Record<string, boolean> = {};

export class InputSystem extends createSystem({}) {
  
  private bound = false;

  init() {
    
    if (typeof document !== 'undefined' && !this.bound) {
      this.bound = true;
      document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          if (S.phase === 'playing' || S.phase === 'paused') togglePause();
        }
      });
      document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
    }
  }

  update(dt: number) {
    const d = Math.min(dt, 0.05);

    // Keyboard input during gameplay
    if (S.phase === 'playing') {
      const spd = PLAYER_SPEED;
      if (keys['arrowleft'] || keys['a']) { S.pvx -= spd * d * 2; S.facing = -1; }
      if (keys['arrowright'] || keys['d']) { S.pvx += spd * d * 2; S.facing = 1; }
      if (keys['arrowup'] || keys['w']) { S.pvy += spd * d * 2; }
      if (keys['arrowdown'] || keys['s']) { S.pvy -= spd * d * 2; }
      if (keys[' '] || keys['f']) shoot();
      if (keys['shift'] || keys['e']) { smartBomb(); keys['shift'] = false; keys['e'] = false; }
    }

    // VR controller input
    const input = ((this as any).world as World).input;
    if (!input) return;

    try {
      const inp = input as any;
      if (inp.getAxesValues) {
        const axes = inp.getAxesValues('Thumbstick');
        if (axes && S.phase === 'playing') {
          const ax = typeof axes.x === 'number' ? axes.x : 0;
          const ay = typeof axes.y === 'number' ? axes.y : 0;
          if (Math.abs(ax) > 0.15) {
            S.pvx += ax * PLAYER_SPEED * d * 2;
            S.facing = ax > 0 ? 1 : -1;
          }
          if (Math.abs(ay) > 0.15) {
            S.pvy += ay * PLAYER_SPEED * d * 2;
          }
        }
      }
      if (inp.getButtonDown) {
        if (inp.getButtonDown('Trigger') || inp.getButtonDown('A')) {
          if (S.phase === 'playing') shoot();
        }
        if (inp.getButtonDown('Grip')) {
          if (S.phase === 'playing') smartBomb();
        }
        if (inp.getButtonDown('B')) {
          if (S.phase === 'playing' || S.phase === 'paused') togglePause();
        }
      }
    } catch { /* no XR input */ }
  }
}
