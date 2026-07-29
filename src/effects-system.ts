// Neon Defender VR — Effects System (particles, thrust trail, hyperspace)
import { createSystem, World, Scene, Mesh, SphereGeometry, BoxGeometry, MeshBasicMaterial } from '@iwsdk/core';
import { S, VIS_RANGE, SCHEMES } from './game-state.js';

interface Particle { mesh: Mesh; vx: number; vy: number; life: number; }
let scene: Scene;
const particles: Particle[] = [];
const ambientOrbs: Mesh[] = [];
let lastEvent = '';
let thrustTimer = 0;

export class EffectsSystem extends createSystem({}) {
  init() {
    scene = ((this as any).world as World).scene;
    const mat = new MeshBasicMaterial({ color: '#00ffff', transparent: true, opacity: 0.3 });
    for (let i = 0; i < 30; i++) {
      const orb = new Mesh(new SphereGeometry(0.12, 4, 3), mat.clone());
      orb.position.set((Math.random() - 0.5) * 100, Math.random() * 35, -3 - Math.random() * 5);
      scene.add(orb);
      ambientOrbs.push(orb);
    }
  }

  update(dt: number) {
    const d = Math.min(dt, 0.05);
    const ev = S.uiEvent;
    if (ev && ev !== lastEvent) {
      lastEvent = ev;
      const cs = SCHEMES[S.scheme];
      if (ev === 'kill') spawnBurst(0, S.py, cs.enemy, 8);
      else if (ev === 'death') spawnBurst(0, S.py, cs.player, 15);
      else if (ev === 'bomb') spawnBurst(0, S.py, '#ffffff', 25);
      else if (ev === 'rescue') spawnBurst(0, S.py, cs.human, 12);
      else if (ev === 'hyperspace') {
        spawnBurst(0, S.py, '#aa66ff', 20);
        spawnBurst(0, S.py, cs.accent, 15);
      }
      else if (ev === 'extraLife') spawnBurst(0, S.py, '#ffff00', 18);
      else if (ev === 'powerup') spawnBurst(0, S.py, '#44ff44', 15);
      else if (ev === 'bossSpawn') {
        for (let i = 0; i < 5; i++) spawnBurst((i - 2) * 10, 20, '#ff0044', 8);
      }
      else if (ev === 'shieldBreak') {
        spawnBurst(0, S.py, '#4488ff', 20);
        spawnBurst(0, S.py, '#88bbff', 10);
      }
      else if (ev === 'waveComplete') {
        for (let i = 0; i < 3; i++) spawnBurst((i - 1) * 15, 20, cs.accent, 10);
      }
    }

    // Thrust trail when moving
    if (S.phase === 'playing') {
      thrustTimer -= d;
      const speed = Math.sqrt(S.pvx * S.pvx + S.pvy * S.pvy);
      if (speed > 5 && thrustTimer <= 0) {
        thrustTimer = 0.04;
        const cs = SCHEMES[S.scheme];
        const mesh = new Mesh(
          new SphereGeometry(0.08, 3, 2),
          new MeshBasicMaterial({ color: cs.accent, transparent: true, opacity: 0.7 })
        );
        mesh.position.set(-S.facing * 1.2, S.py + (Math.random() - 0.5) * 0.3, 0.3);
        scene.add(mesh);
        particles.push({
          mesh, life: 0.3 + Math.random() * 0.2,
          vx: -S.facing * (3 + Math.random() * 4), vy: (Math.random() - 0.5) * 3,
        });
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= d;
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); continue; }
      p.mesh.position.x += p.vx * d;
      p.mesh.position.y += p.vy * d;
      p.vy -= 8 * d;
      const s = Math.max(0.1, p.life * 0.8);
      p.mesh.scale.setScalar(s);
      ((p.mesh.material as MeshBasicMaterial).opacity) = Math.min(1, p.life);
    }

    // Ambient orbs float
    for (const orb of ambientOrbs) {
      orb.position.y += Math.sin(orb.position.x + d * 0.5) * 0.3 * d;
      if (orb.position.y > 36) orb.position.y = 1;
      if (orb.position.y < 0) orb.position.y = 35;
    }
  }
}

function spawnBurst(x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const mesh = new Mesh(
      new SphereGeometry(0.15, 4, 3),
      new MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );
    mesh.position.set(x, y, 0.5);
    scene.add(mesh);
    particles.push({
      mesh, life: 0.5 + Math.random() * 0.8,
      vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.3) * 15,
    });
  }
}
