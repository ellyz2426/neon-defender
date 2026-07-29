// Neon Defender VR — Effects System (particles + scanner)
import { createSystem, World, Scene, Mesh, SphereGeometry, BoxGeometry, MeshBasicMaterial } from '@iwsdk/core';
import { S, VIS_RANGE } from './game-state.js';

interface Particle { mesh: Mesh; vx: number; vy: number; life: number; }
let scene: Scene;
const particles: Particle[] = [];
const ambientOrbs: Mesh[] = [];
let lastEvent = '';

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
      if (ev === 'kill') spawnBurst(0, S.py, '#ff3366', 8);
      else if (ev === 'death') spawnBurst(0, S.py, '#00ffff', 15);
      else if (ev === 'bomb') spawnBurst(0, S.py, '#ffffff', 25);
      else if (ev === 'rescue') spawnBurst(0, S.py, '#33ff66', 12);
      else if (ev === 'waveComplete') {
        for (let i = 0; i < 3; i++) spawnBurst((i - 1) * 15, 20, '#ffcc33', 10);
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
