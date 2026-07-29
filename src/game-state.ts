// Neon Defender VR — Game State
import { BoxGeometry, SphereGeometry, ConeGeometry, CylinderGeometry, MeshBasicMaterial, Mesh, Group, EdgesGeometry, LineSegments, LineBasicMaterial } from '@iwsdk/core';

export const WORLD_W = 300;
export const HALF_W = WORLD_W / 2;
export const GROUND_Y = 0;
export const CEIL_Y = 35;
export const VIS_RANGE = 55;
export const PLAYER_SPEED = 30;
export const BULLET_SPEED = 60;
export const SHOOT_CD = 0.12;

export type Phase = 'menu' | 'playing' | 'paused' | 'gameover' | 'waveComplete';
export type Mode = 'arcade' | 'speed' | 'zen' | 'challenge';
export type Diff = 'normal' | 'hard' | 'insane';

export interface Bullet { x: number; y: number; vx: number; mesh: Mesh; }
export interface Mine { x: number; y: number; mesh: Mesh; timer: number; }
export interface Humanoid {
  x: number; state: 'walking' | 'grabbed' | 'falling' | 'rescued' | 'dead';
  dir: number; mesh: Group; grabbedBy: number;
}
export interface Enemy {
  type: 'lander' | 'mutant' | 'bomber' | 'swarmer';
  x: number; y: number; vx: number; vy: number;
  state: 'alive' | 'grabbing' | 'ascending' | 'dead';
  target: number; hp: number; mesh: Group;
  timer: number;
}

export const SCHEME_NAMES = ['cyan', 'green', 'magenta', 'gold'];
export const SCHEMES: Record<string, { accent: string; player: string; enemy: string; human: string; grid: string; }> = {
  cyan:    { accent: '#00ffff', player: '#00ffff', enemy: '#ff3366', human: '#33ff66', grid: '#003344' },
  green:   { accent: '#33ff66', player: '#33ff66', enemy: '#ff6633', human: '#66ffcc', grid: '#003300' },
  magenta: { accent: '#ff33ff', player: '#ff33ff', enemy: '#ffcc33', human: '#33ffcc', grid: '#330044' },
  gold:    { accent: '#ffcc33', player: '#ffcc33', enemy: '#ff3366', human: '#33ff99', grid: '#332200' },
};

export interface Achievement { id: string; name: string; desc: string; unlocked: boolean; }

export const ACH_DEFS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'first_rescue', name: 'First Rescue', desc: 'Catch a falling humanoid' },
  { id: 'wave5', name: 'Guardian', desc: 'Reach wave 5' },
  { id: 'wave10', name: 'Protector', desc: 'Reach wave 10' },
  { id: 'wave20', name: 'Sentinel', desc: 'Reach wave 20' },
  { id: 'score10k', name: 'Ace Pilot', desc: 'Score 10,000 points' },
  { id: 'score50k', name: 'Elite Defender', desc: 'Score 50,000 points' },
  { id: 'score100k', name: 'Legendary', desc: 'Score 100,000 points' },
  { id: 'smart_bomb', name: 'Nuclear Option', desc: 'Use a smart bomb' },
  { id: 'bomb_5kill', name: 'Chain Reaction', desc: '5+ kills with one bomb' },
  { id: 'mutant_kill', name: 'Mutant Hunter', desc: 'Destroy a mutant' },
  { id: 'all_humans', name: 'Perfect Wave', desc: 'All humanoids survive a wave' },
  { id: 'no_death', name: 'Untouchable', desc: 'Complete wave without dying' },
  { id: 'combo5', name: 'Combo Starter', desc: 'Reach 5x combo' },
  { id: 'combo10', name: 'Combo Master', desc: 'Reach 10x combo' },
  { id: 'rescue5', name: 'Rescue Squad', desc: 'Rescue 5 in one game' },
  { id: 'rescue20', name: 'Rescue Hero', desc: '20 career rescues' },
  { id: 'kill100', name: 'Centurion', desc: '100 career kills' },
  { id: 'kill500', name: 'Destroyer', desc: '500 career kills' },
  { id: 'games10', name: 'Veteran', desc: 'Play 10 games' },
  { id: 'all_modes', name: 'Well Rounded', desc: 'Play all 4 modes' },
];

class GameState {
  phase: Phase = 'menu';
  mode: Mode = 'arcade';
  diff: Diff = 'normal';
  scheme = 'cyan';

  px = 0; py = 15; pvx = 0; pvy = 0;
  facing = 1; lives = 3; smartBombs = 3;
  invTimer = 0; shootCD = 0;

  score = 0; wave = 1; combo = 1; comboTimer = 0;
  waveEnemiesLeft = 0; waveTimer = 0;
  diedThisWave = false; rescuesGame = 0;

  bullets: Bullet[] = [];
  mines: Mine[] = [];
  enemies: Enemy[] = [];
  humanoids: Humanoid[] = [];

  speedTimer = 120;

  // Persisted stats
  totalGames = 0; totalKills = 0; totalRescues = 0;
  totalWaves = 0; totalBombs = 0; totalDeaths = 0;
  highScore = 0; bestWave = 0;
  modesPlayed: Set<string> = new Set();
  achievements: Achievement[] = [];

  uiEvent = ''; uiData = '';

  constructor() {
    this.loadStats();
    this.achievements = ACH_DEFS.map(a => ({ ...a, unlocked: false }));
    this.loadAch();
  }

  reset() {
    this.px = 0; this.py = 15; this.pvx = 0; this.pvy = 0;
    this.facing = 1;
    this.lives = this.mode === 'zen' ? 99 : 3;
    this.smartBombs = this.mode === 'challenge' ? 1 : 3;
    this.invTimer = 2; this.shootCD = 0;
    this.score = 0; this.wave = 1; this.combo = 1; this.comboTimer = 0;
    this.waveTimer = 0; this.diedThisWave = false; this.rescuesGame = 0;
    this.speedTimer = 120;
    this.bullets = []; this.mines = []; this.enemies = []; this.humanoids = [];
  }

  dm(): number { return this.diff === 'insane' ? 1.6 : this.diff === 'hard' ? 1.3 : 1.0; }

  wrap(x: number): number {
    if (x > HALF_W) return x - WORLD_W;
    if (x < -HALF_W) return x + WORLD_W;
    return x;
  }

  rel(x: number): number {
    let d = x - this.px;
    if (d > HALF_W) d -= WORLD_W;
    if (d < -HALF_W) d += WORLD_W;
    return d;
  }

  vis(x: number): boolean { return Math.abs(this.rel(x)) < VIS_RANGE; }

  loadStats() {
    try {
      const d = JSON.parse(localStorage.getItem('neon-defender-stats') || '{}');
      this.totalGames = d.tg || 0; this.totalKills = d.tk || 0;
      this.totalRescues = d.tr || 0; this.totalWaves = d.tw || 0;
      this.totalBombs = d.tb || 0; this.totalDeaths = d.td || 0;
      this.highScore = d.hs || 0; this.bestWave = d.bw || 0;
      this.modesPlayed = new Set(d.mp || []);
    } catch { /* */ }
  }

  saveStats() {
    try {
      localStorage.setItem('neon-defender-stats', JSON.stringify({
        tg: this.totalGames, tk: this.totalKills, tr: this.totalRescues,
        tw: this.totalWaves, tb: this.totalBombs, td: this.totalDeaths,
        hs: this.highScore, bw: this.bestWave, mp: [...this.modesPlayed],
      }));
    } catch { /* */ }
  }

  loadAch() {
    try {
      const ids = JSON.parse(localStorage.getItem('neon-defender-ach') || '[]') as string[];
      for (const a of this.achievements) a.unlocked = ids.includes(a.id);
    } catch { /* */ }
  }

  saveAch() {
    try {
      localStorage.setItem('neon-defender-ach', JSON.stringify(
        this.achievements.filter(a => a.unlocked).map(a => a.id)
      ));
    } catch { /* */ }
  }

  unlock(id: string): boolean {
    const a = this.achievements.find(x => x.id === id);
    if (a && !a.unlocked) { a.unlocked = true; this.saveAch(); return true; }
    return false;
  }
}

export const S = new GameState();

// Mesh helpers
const C = (hex: string) => new MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9 });
const W = (hex: string) => new LineBasicMaterial({ color: hex });

export function makeShip(): Group {
  const g = new Group();
  const body = new Mesh(new ConeGeometry(0.6, 2.2, 4), C('#00ffff'));
  body.rotation.z = -Math.PI / 2; g.add(body);
  const w1 = new Mesh(new BoxGeometry(1.2, 0.08, 0.5), C('#00cccc'));
  w1.position.set(-0.3, 0.4, 0); g.add(w1);
  const w2 = w1.clone(); w2.position.set(-0.3, -0.4, 0); g.add(w2);
  const eng = new Mesh(new BoxGeometry(0.4, 0.3, 0.3), C('#0088aa'));
  eng.position.set(-1.0, 0, 0); g.add(eng);
  return g;
}

export function makeEnemy(type: string): Group {
  const g = new Group();
  if (type === 'lander') {
    g.add(new Mesh(new SphereGeometry(0.5, 6, 4), C('#ff3366')));
    const a1 = new Mesh(new BoxGeometry(0.1, 0.7, 0.1), C('#ff2244'));
    a1.position.set(-0.3, -0.4, 0); g.add(a1);
    const a2 = a1.clone(); a2.position.set(0.3, -0.4, 0); g.add(a2);
  } else if (type === 'mutant') {
    g.add(new Mesh(new SphereGeometry(0.55, 6, 4), C('#ff0000')));
    const s = new Mesh(new ConeGeometry(0.15, 0.5, 3), C('#ff4400'));
    s.position.set(0, 0.6, 0); g.add(s);
    const s2 = s.clone(); s2.position.set(0.5, 0.2, 0); s2.rotation.z = -1; g.add(s2);
  } else if (type === 'bomber') {
    g.add(new Mesh(new BoxGeometry(0.9, 0.5, 0.5), C('#ffaa00')));
    g.add(new LineSegments(new EdgesGeometry(new BoxGeometry(0.95, 0.55, 0.55)), W('#ffcc44')));
  } else {
    g.add(new Mesh(new SphereGeometry(0.3, 4, 3), C('#ff66cc')));
  }
  return g;
}

export function makeHuman(): Group {
  const g = new Group();
  const b = new Mesh(new CylinderGeometry(0.15, 0.15, 0.6, 6), C('#33ff66'));
  b.position.y = 0.5; g.add(b);
  const h = new Mesh(new SphereGeometry(0.18, 6, 4), C('#44ff77'));
  h.position.y = 1.0; g.add(h);
  const l1 = new Mesh(new CylinderGeometry(0.06, 0.06, 0.3, 4), C('#22cc44'));
  l1.position.set(-0.1, 0.15, 0); g.add(l1);
  const l2 = l1.clone(); l2.position.set(0.1, 0.15, 0); g.add(l2);
  return g;
}

export function makeBullet(): Mesh {
  return new Mesh(new BoxGeometry(0.5, 0.1, 0.1), C('#ffffff'));
}

export function makeMine(): Mesh {
  return new Mesh(new SphereGeometry(0.2, 4, 3), C('#ff8800'));
}
