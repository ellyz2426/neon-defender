// Neon Defender VR — Core Game System
import { createSystem, World, Scene, Mesh, Group, MeshBasicMaterial, ConeGeometry } from '@iwsdk/core';
import { S, WORLD_W, HALF_W, CEIL_Y, VIS_RANGE, BULLET_SPEED, SHOOT_CD, POWERUP_DURATION, makeShip, makeEnemy, makeHuman, makeBullet, makeMine, makePowerUp, makeBoss, Enemy, Humanoid, Bullet, Mine, PowerUp, PowerUpType, Mode } from './game-state.js';

let scene: Scene;
let shipMesh: Group;
let mountains: Group;

export class GameSystem extends createSystem({}) {
  

  init() {
    
    scene = ((this as any).world as World).scene;
    shipMesh = makeShip();
    shipMesh.visible = false;
    scene.add(shipMesh);
    mountains = new Group();
    scene.add(mountains);
    buildTerrain();
  }

  update(dt: number) {
    if (S.phase !== 'playing' && S.phase !== 'waveComplete') return;
    const d = Math.min(dt, 0.05);

    if (S.phase === 'waveComplete') {
      S.waveTimer -= d;
      if (S.waveTimer <= 0) { S.wave++; spawnWave(scene); S.phase = 'playing'; }
      updateVisuals();
      return;
    }

    // Speed mode timer
    if (S.mode === 'speed') {
      S.speedTimer -= d;
      if (S.speedTimer <= 0) { endGame(); return; }
    }

    // Player movement
    S.shootCD -= d;
    S.invTimer -= d;
    S.comboTimer -= d;
    S.hyperspaceCooldown -= d;
    if (S.comboTimer <= 0) S.combo = 1;
    if (S.waveAnnounceTimer > 0) S.waveAnnounceTimer -= d;

    // Apply velocity with drag
    S.px += S.pvx * d;
    S.py += S.pvy * d;
    S.pvx *= 0.92;
    S.pvy *= 0.92;

    // Clamp Y
    S.py = Math.max(2, Math.min(CEIL_Y - 2, S.py));
    // Wrap X
    S.px = S.wrap(S.px);

    // Bullets
    updateBullets(d);

    // Enemies
    updateEnemies(d);

    // Humanoids
    updateHumanoids(d);

    // Mines
    updateMines(d);

    // Power-ups
    updatePowerUps(d);

    // Active power-up timer
    if (S.activePowerUp) {
      S.powerUpTimer -= d;
      if (S.powerUpTimer <= 0) {
        S.activePowerUp = null;
        S.powerUpTimer = 0;
      }
    }

    // Collisions
    checkCollisions();

    // Check wave complete
    if (S.enemies.length === 0 && S.waveEnemiesLeft <= 0) {
      waveComplete();
    }

    // Extra life at score thresholds
    while (S.score >= S.nextExtraLife) {
      S.lives++;
      S.nextExtraLife += 10000;
      S.uiEvent = 'extraLife';
    }

    // Achievements
    checkAchievements();

    updateVisuals();
  }
}

function updateVisuals() {
  // Ship
  shipMesh.visible = S.phase === 'playing' || S.phase === 'waveComplete';
  if (shipMesh.visible) {
    shipMesh.position.set(0, S.py, 0); // Ship always at center X of view
    shipMesh.scale.x = S.facing;
    if (S.invTimer > 0) {
      shipMesh.visible = Math.floor(S.invTimer * 10) % 2 === 0;
    }
  }

  // Enemies
  for (const e of S.enemies) {
    const rx = S.rel(e.x);
    e.mesh.visible = Math.abs(rx) < VIS_RANGE;
    if (e.mesh.visible) {
      e.mesh.position.set(rx, e.y, 0);
      e.mesh.rotation.z = Math.sin(e.timer * 3) * 0.15;
    }
  }

  // Humanoids
  for (const h of S.humanoids) {
    const rx = S.rel(h.x);
    h.mesh.visible = Math.abs(rx) < VIS_RANGE && h.state !== 'dead' && h.state !== 'rescued';
    if (h.mesh.visible) {
      const hy = h.state === 'grabbed' ? getGrabbedY(h) : h.state === 'falling' ? h.mesh.position.y : 1.0;
      h.mesh.position.set(rx, hy, 0);
    }
  }

  // Bullets
  for (const b of S.bullets) {
    const rx = S.rel(b.x);
    b.mesh.visible = Math.abs(rx) < VIS_RANGE;
    if (b.mesh.visible) b.mesh.position.set(rx, b.y, 0);
  }

  // Mines
  for (const m of S.mines) {
    const rx = S.rel(m.x);
    m.mesh.visible = Math.abs(rx) < VIS_RANGE;
    if (m.mesh.visible) m.mesh.position.set(rx, m.y, 0);
  }

  // Mountains scroll
  mountains.position.x = -(S.px % 100);

  // Camera follows player Y smoothly
  const cam = (scene as any).parent?.parent;
  // Not directly - camera is managed by World
}

function getGrabbedY(h: Humanoid): number {
  const e = S.enemies[h.grabbedBy];
  return e ? e.y - 1.2 : 1.0;
}

function updateBullets(d: number) {
  for (let i = S.bullets.length - 1; i >= 0; i--) {
    const b = S.bullets[i];
    b.x += b.vx * d;
    b.x = S.wrap(b.x);
    // Remove if far from player
    if (Math.abs(S.rel(b.x)) > VIS_RANGE + 10) {
      scene.remove(b.mesh);
      S.bullets.splice(i, 1);
    }
  }
}

function updateEnemies(d: number) {
  const dm = S.dm();
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    const e = S.enemies[i];
    e.timer += d;

    if (e.state === 'dead') {
      scene.remove(e.mesh);
      S.enemies.splice(i, 1);
      continue;
    }

    if (e.type === 'lander') {
      updateLander(e, d, dm);
    } else if (e.type === 'mutant') {
      updateMutant(e, d, dm);
    } else if (e.type === 'bomber') {
      updateBomber(e, d, dm);
    } else if (e.type === 'swarmer') {
      updateSwarmer(e, d, dm);
    } else if (e.type === 'boss' as string) {
      updateBoss(e, d, dm);
    }

    e.x = S.wrap(e.x);
    e.y = Math.max(1, Math.min(CEIL_Y, e.y));
  }
}

function updateLander(e: Enemy, d: number, dm: number) {
  if (e.state === 'alive') {
    // Find nearest walking humanoid
    if (e.target < 0) {
      let bestDist = Infinity;
      for (let j = 0; j < S.humanoids.length; j++) {
        if (S.humanoids[j].state !== 'walking') continue;
        const dx = Math.abs(S.rel(S.humanoids[j].x) - S.rel(e.x));
        if (dx < bestDist) { bestDist = dx; e.target = j; }
      }
    }
    if (e.target >= 0 && S.humanoids[e.target]?.state === 'walking') {
      const h = S.humanoids[e.target];
      // Move toward humanoid
      const dx = h.x - e.x;
      let ndx = dx;
      if (ndx > HALF_W) ndx -= WORLD_W;
      if (ndx < -HALF_W) ndx += WORLD_W;
      e.vx = Math.sign(ndx) * 8 * dm;
      e.vy = (1.5 - e.y) * 2 * dm; // Descend toward ground
      if (Math.abs(ndx) < 1.5 && e.y < 3) {
        // Grab!
        e.state = 'grabbing';
        h.state = 'grabbed';
        h.grabbedBy = S.enemies.indexOf(e);
        S.uiEvent = 'grabbed';
      }
    } else {
      // Wander
      e.vx += (Math.random() - 0.5) * 10 * d;
      e.vy += (Math.random() - 0.5) * 6 * d;
      e.vx = Math.max(-12, Math.min(12, e.vx));
      e.vy = Math.max(-8, Math.min(8, e.vy));
      e.target = -1;
    }
  } else if (e.state === 'grabbing') {
    // Ascending with humanoid
    e.vy = 10 * dm;
    e.vx *= 0.95;
    if (e.y >= CEIL_Y - 1) {
      // Mutate!
      const h = S.humanoids[e.target];
      if (h && h.state === 'grabbed') h.state = 'dead';
      e.type = 'mutant';
      e.state = 'alive';
      e.hp = 2;
      // Replace mesh
      scene.remove(e.mesh);
      e.mesh = makeEnemy('mutant');
      scene.add(e.mesh);
      S.uiEvent = 'mutated';
    }
  }
  e.x += e.vx * d;
  e.y += e.vy * d;
}

function updateMutant(e: Enemy, d: number, dm: number) {
  // Chase player aggressively
  const dx = S.rel(e.x);
  const targetVX = -Math.sign(dx) * 18 * dm;
  const targetVY = (S.py - e.y) * 3 * dm;
  e.vx += (targetVX - e.vx) * 2 * d;
  e.vy += (targetVY - e.vy) * 2 * d;
  e.x += e.vx * d;
  e.y += e.vy * d;
}

function updateBomber(e: Enemy, d: number, dm: number) {
  // Fly horizontally, drop mines
  e.x += e.vx * d;
  e.y += Math.sin(e.timer * 1.5) * 3 * d; // Sinusoidal altitude
  if (e.timer > 3 && Math.random() < 0.5 * d * dm) {
    // Drop mine
    if (S.mines.length < 20 && S.vis(e.x)) {
      const m: Mine = { x: e.x, y: e.y - 0.5, mesh: makeMine(), timer: 8 };
      scene.add(m.mesh);
      S.mines.push(m);
    }
    e.timer = 0;
  }
}

function updateSwarmer(e: Enemy, d: number, dm: number) {
  // Erratic movement toward player
  e.vx += ((Math.random() - 0.5) * 40 - Math.sign(S.rel(e.x)) * 15) * d * dm;
  e.vy += ((Math.random() - 0.5) * 30 + (S.py - e.y) * 2) * d * dm;
  e.vx = Math.max(-25, Math.min(25, e.vx));
  e.vy = Math.max(-20, Math.min(20, e.vy));
  e.x += e.vx * d;
  e.y += e.vy * d;
}

function updateBoss(e: Enemy, d: number, dm: number) {
  // Slow, menacing movement — tracks player horizontally, bobs vertically
  const dx = S.rel(e.x);
  const targetVX = -Math.sign(dx) * 10 * dm;
  e.vx += (targetVX - e.vx) * 0.8 * d;
  e.vy = Math.sin(e.timer * 1.2) * 5;
  e.x += e.vx * d;
  e.y += e.vy * d;
  e.y = Math.max(CEIL_Y * 0.3, Math.min(CEIL_Y * 0.85, e.y));

  // Boss mesh pulses size
  const pulse = 1.0 + Math.sin(e.timer * 4) * 0.05;
  e.mesh.scale.setScalar(pulse);

  // Track boss HP for HUD
  S.bossHP = e.hp;

  // Boss periodically fires projectiles (mines toward player)
  if (e.timer > 2 && Math.abs(dx) < VIS_RANGE && Math.random() < 0.8 * d * dm) {
    if (S.mines.length < 25) {
      const m: Mine = { x: e.x, y: e.y - 1, mesh: makeMine(), timer: 6 };
      scene.add(m.mesh);
      S.mines.push(m);
    }
    e.timer = 0;
  }
}

function updateHumanoids(d: number) {
  for (const h of S.humanoids) {
    if (h.state === 'walking') {
      h.x += h.dir * 1.5 * d;
      if (Math.random() < 0.3 * d) h.dir = -h.dir; // Random direction change
      h.x = S.wrap(h.x);
    } else if (h.state === 'falling') {
      const cy = h.mesh.position.y - 15 * d;
      h.mesh.position.y = cy;
      // Check if player catches
      const dx = Math.abs(S.rel(h.x));
      const dy = Math.abs(cy - S.py);
      if (dx < 2.5 && dy < 2.5) {
        h.state = 'rescued';
        h.mesh.visible = false;
        S.score += 500 * S.combo;
        S.combo++;
        S.comboTimer = 3;
        S.rescuesGame++;
        S.totalRescues++;
        S.uiEvent = 'rescue';
        S.unlock('first_rescue');
        if (S.rescuesGame >= 5) S.unlock('rescue5');
        if (S.totalRescues >= 20) S.unlock('rescue20');
      } else if (cy <= 1.2) {
        // Landed safely on ground
        h.state = 'walking';
        h.mesh.position.y = 1.0;
      }
    }
  }
}

function updateMines(d: number) {
  for (let i = S.mines.length - 1; i >= 0; i--) {
    const m = S.mines[i];
    m.timer -= d;
    m.y -= 3 * d; // Mines fall slowly
    if (m.timer <= 0 || m.y <= 0.5) {
      scene.remove(m.mesh);
      S.mines.splice(i, 1);
    }
  }
}

function updatePowerUps(d: number) {
  for (let i = S.powerUps.length - 1; i >= 0; i--) {
    const p = S.powerUps[i];
    p.timer -= d;
    // Rotate and bob
    p.mesh.rotation.y += 2 * d;
    p.mesh.position.y = p.y + Math.sin(p.timer * 3) * 0.3;
    if (p.timer <= 0) {
      scene.remove(p.mesh);
      S.powerUps.splice(i, 1);
      continue;
    }
    // Check player pickup
    let dx = S.px - p.x;
    if (dx > HALF_W) dx -= WORLD_W;
    if (dx < -HALF_W) dx += WORLD_W;
    const dy = S.py - p.y;
    if (Math.abs(dx) < 2.5 && Math.abs(dy) < 2.5) {
      S.activePowerUp = p.type;
      S.powerUpTimer = POWERUP_DURATION;
      S.powerUpsCollected.add(p.type);
      S.totalPowerUps++;
      S.unlock('first_powerup');
      if (S.powerUpsCollected.size >= 4) S.unlock('all_powerups');
      scene.remove(p.mesh);
      S.powerUps.splice(i, 1);
      S.uiEvent = 'powerup';
      S.uiData = p.type;
    }
  }
  // Update visibility
  for (const p of S.powerUps) {
    const rx = S.rel(p.x);
    p.mesh.visible = Math.abs(rx) < VIS_RANGE;
    if (p.mesh.visible) p.mesh.position.x = rx;
  }
}

function checkCollisions() {
  // Bullets vs enemies
  for (let bi = S.bullets.length - 1; bi >= 0; bi--) {
    const b = S.bullets[bi];
    for (let ei = S.enemies.length - 1; ei >= 0; ei--) {
      const e = S.enemies[ei];
      if (e.state === 'dead') continue;
      let dx = b.x - e.x;
      if (dx > HALF_W) dx -= WORLD_W;
      if (dx < -HALF_W) dx += WORLD_W;
      const dy = b.y - e.y;
      if (Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2) {
        e.hp--;
        scene.remove(b.mesh);
        S.bullets.splice(bi, 1);
        if (e.hp <= 0) {
          killEnemy(e, ei);
        }
        break;
      }
    }
  }

  // Player vs enemies (if not invincible)
  if (S.invTimer <= 0) {
    for (const e of S.enemies) {
      if (e.state === 'dead') continue;
      let dx = S.px - e.x;
      if (dx > HALF_W) dx -= WORLD_W;
      if (dx < -HALF_W) dx += WORLD_W;
      const dy = S.py - e.y;
      if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) {
        playerDeath();
        break;
      }
    }

    // Player vs mines
    for (let i = S.mines.length - 1; i >= 0; i--) {
      const m = S.mines[i];
      let dx = S.px - m.x;
      if (dx > HALF_W) dx -= WORLD_W;
      if (dx < -HALF_W) dx += WORLD_W;
      const dy = S.py - m.y;
      if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) {
        scene.remove(m.mesh);
        S.mines.splice(i, 1);
        playerDeath();
        break;
      }
    }
  }
}

function killEnemy(e: Enemy, idx: number) {
  // Score
  const pts: Record<string, number> = { lander: 150, mutant: 300, bomber: 200, swarmer: 100, boss: 1000 };
  S.score += (pts[e.type] || 100) * S.combo;
  S.combo++;
  S.comboTimer = 3;
  S.totalKills++;

  if (e.type === 'mutant') S.unlock('mutant_kill');
  if (e.type === 'boss' as string) {
    S.bossActive = false;
    S.bossHP = 0;
    S.bossesKilledGame++;
    S.totalBossKills++;
    S.unlock('boss_kill');
    if (S.bossesKilledGame >= 3) S.unlock('boss3');
    S.saveStats();
  }
  if (S.combo >= 5) S.unlock('combo5');
  if (S.combo >= 10) S.unlock('combo10');

  // If lander was grabbing, release humanoid
  if (e.state === 'grabbing' && e.target >= 0) {
    const h = S.humanoids[e.target];
    if (h && h.state === 'grabbed') {
      h.state = 'falling';
      h.mesh.position.y = e.y - 1;
      h.grabbedBy = -1;
    }
  }

  e.state = 'dead';
  S.uiEvent = 'kill';
  S.uiData = e.type;

  // Chance to drop power-up (15% base, higher for bosses)
  const dropChance = e.type === 'boss' as string ? 1.0 : 0.15;
  if (Math.random() < dropChance && S.powerUps.length < 5) {
    const types: PowerUpType[] = ['rapidfire', 'speedboost', 'shield', 'tripleshot'];
    const pType = types[Math.floor(Math.random() * types.length)];
    const pu: PowerUp = { x: e.x, y: e.y, type: pType, mesh: makePowerUp(pType), timer: 10 };
    pu.mesh.position.set(S.rel(e.x), e.y, 0);
    scene.add(pu.mesh);
    S.powerUps.push(pu);
  }
}

function playerDeath() {
  // Shield absorbs the hit
  if (S.activePowerUp === 'shield') {
    S.activePowerUp = null;
    S.powerUpTimer = 0;
    S.invTimer = 1.5;
    S.unlock('shield_save');
    S.uiEvent = 'shieldBreak';
    return;
  }

  S.lives--;
  S.totalDeaths++;
  S.diedThisWave = true;
  S.invTimer = 2.5;
  S.pvx = 0; S.pvy = 0;
  S.combo = 1;
  S.activePowerUp = null;
  S.powerUpTimer = 0;
  S.uiEvent = 'death';

  if (S.lives <= 0) {
    endGame();
  }
}

function endGame() {
  S.phase = 'gameover';
  S.totalGames++;
  S.modesPlayed.add(S.mode);
  if (S.score > S.highScore) S.highScore = S.score;
  if (S.wave > S.bestWave) S.bestWave = S.wave;
  S.totalWaves += S.wave - 1;
  S.saveStats();

  if (S.totalGames >= 10) S.unlock('games10');
  if (S.modesPlayed.size >= 4) S.unlock('all_modes');

  S.uiEvent = 'gameover';
  shipMesh.visible = false;
}

function waveComplete() {
  S.phase = 'waveComplete';
  S.waveTimer = 2.0;
  S.waveAnnounceTimer = 2.0;

  // Bonus: all humanoids alive
  const alive = S.humanoids.filter(h => h.state === 'walking' || h.state === 'rescued').length;
  if (alive === S.humanoids.length) {
    S.score += 1000;
    S.unlock('all_humans');
  }
  if (!S.diedThisWave) {
    S.unlock('no_death');
    S.wavesWithoutDeath++;
    if (S.wavesWithoutDeath >= 3) S.unlock('survive3');
  } else {
    S.wavesWithoutDeath = 0;
  }

  S.uiEvent = 'waveComplete';
}

export function spawnWave(sc: Scene) {
  // Clear old
  for (const e of S.enemies) sc.remove(e.mesh);
  for (const b of S.bullets) sc.remove(b.mesh);
  for (const m of S.mines) sc.remove(m.mesh);
  S.enemies = [];
  S.bullets = [];
  S.mines = [];
  S.diedThisWave = false;

  const w = S.wave;
  const dm = S.dm();

  // Spawn humanoids (only on wave 1 or if they were destroyed)
  if (w === 1) {
    for (const h of S.humanoids) sc.remove(h.mesh);
    S.humanoids = [];
    const numH = 10;
    for (let i = 0; i < numH; i++) {
      const hx = (i - numH / 2) * (WORLD_W / numH) + Math.random() * 10;
      const h: Humanoid = {
        x: hx, state: 'walking', dir: Math.random() > 0.5 ? 1 : -1,
        mesh: makeHuman(), grabbedBy: -1,
      };
      sc.add(h.mesh);
      S.humanoids.push(h);
    }
  }

  // Spawn enemies
  const numLanders = Math.min(3 + w * 2, 20);
  const numBombers = w >= 3 ? Math.min(Math.floor((w - 1) / 2), 6) : 0;
  const numSwarmers = w >= 5 ? Math.min(w - 3, 8) : 0;

  for (let i = 0; i < numLanders; i++) spawnEnemy('lander', sc, dm);
  for (let i = 0; i < numBombers; i++) spawnEnemy('bomber', sc, dm);
  for (let i = 0; i < numSwarmers; i++) spawnEnemy('swarmer', sc, dm);

  // Boss wave every 5th wave
  if (w > 0 && w % 5 === 0) {
    spawnBoss(sc, w, dm);
  }

  S.waveEnemiesLeft = 0;

  // Check wave achievements
  if (w >= 5) S.unlock('wave5');
  if (w >= 10) S.unlock('wave10');
  if (w >= 20) S.unlock('wave20');
}

function spawnEnemy(type: string, sc: Scene, dm: number) {
  const x = S.px + (Math.random() > 0.5 ? 1 : -1) * (VIS_RANGE + Math.random() * 40);
  const y = CEIL_Y * 0.4 + Math.random() * CEIL_Y * 0.5;
  const speed = (8 + Math.random() * 6) * dm;
  const e: Enemy = {
    type: type as Enemy['type'],
    x: S.wrap(x), y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * 4,
    state: 'alive', target: -1, hp: type === 'mutant' ? 2 : 1,
    mesh: makeEnemy(type), timer: Math.random() * 5,
  };
  sc.add(e.mesh);
  S.enemies.push(e);
}

function spawnBoss(sc: Scene, wave: number, dm: number) {
  const bossHP = 10 + Math.floor(wave / 5) * 5;
  const x = S.px + (Math.random() > 0.5 ? 1 : -1) * (VIS_RANGE + 20);
  const e: Enemy = {
    type: 'boss' as Enemy['type'],
    x: S.wrap(x), y: CEIL_Y * 0.6,
    vx: (Math.random() - 0.5) * 6 * dm, vy: 0,
    state: 'alive', target: -1, hp: bossHP,
    mesh: makeBoss(), timer: 0,
  };
  sc.add(e.mesh);
  S.enemies.push(e);
  S.bossActive = true;
  S.bossHP = bossHP;
  S.bossMaxHP = bossHP;
  S.uiEvent = 'bossSpawn';
}

function buildTerrain() {
  const mat = new MeshBasicMaterial({ color: '#003344', transparent: true, opacity: 0.4 });
  for (let i = -200; i < 200; i += 8) {
    const h = 1 + Math.random() * 4;
    const w = 3 + Math.random() * 5;
    const geo = new ConeGeometry(w / 2, h, 3);
    const m = new Mesh(geo, mat);
    m.position.set(i, h / 2, -1);
    mountains.add(m);
  }
}

// Public API for input system
export function shoot() {
  if (S.phase !== 'playing') return;
  const cd = S.activePowerUp === 'rapidfire' ? SHOOT_CD * 0.35 : SHOOT_CD;
  if (S.shootCD > 0) return;
  S.shootCD = cd;

  const spd = BULLET_SPEED;
  const b: Bullet = {
    x: S.px + S.facing * 1.5, y: S.py,
    vx: spd * S.facing, mesh: makeBullet(),
  };
  scene.add(b.mesh);
  S.bullets.push(b);

  // Triple shot fires two additional angled bullets
  if (S.activePowerUp === 'tripleshot') {
    const b2: Bullet = {
      x: S.px + S.facing * 1.5, y: S.py + 0.4,
      vx: spd * S.facing * 0.95, mesh: makeBullet(),
    };
    scene.add(b2.mesh);
    S.bullets.push(b2);
    const b3: Bullet = {
      x: S.px + S.facing * 1.5, y: S.py - 0.4,
      vx: spd * S.facing * 0.95, mesh: makeBullet(),
    };
    scene.add(b3.mesh);
    S.bullets.push(b3);
  }

  S.uiEvent = 'shoot';
}

export function smartBomb() {
  if (S.smartBombs <= 0 || S.phase !== 'playing') return;
  S.smartBombs--;
  S.totalBombs++;
  let kills = 0;
  for (const e of S.enemies) {
    if (e.state !== 'dead' && S.vis(e.x)) {
      e.hp = 0;
      killEnemy(e, S.enemies.indexOf(e));
      kills++;
    }
  }
  S.unlock('smart_bomb');
  if (kills >= 5) S.unlock('bomb_5kill');
  S.uiEvent = 'bomb';
}

export function startGame(mode: Mode) {
  S.mode = mode;
  S.reset();
  spawnWave(scene);
  S.phase = 'playing';
  shipMesh.visible = true;
  S.uiEvent = 'start';
}

export function togglePause() {
  if (S.phase === 'playing') { S.phase = 'paused'; S.uiEvent = 'pause'; }
  else if (S.phase === 'paused') { S.phase = 'playing'; S.uiEvent = 'resume'; }
}

export function hyperspace() {
  if (S.hyperspaceCooldown > 0 || S.phase !== 'playing') return;
  S.px = S.wrap((Math.random() - 0.5) * WORLD_W);
  S.py = 5 + Math.random() * 25;
  S.pvx = 0; S.pvy = 0;
  S.hyperspaceCooldown = 3;
  S.invTimer = Math.max(S.invTimer, 1.5);
  S.unlock('hyperspace');
  S.uiEvent = 'hyperspace';
}

export function returnToMenu() {
  // Clean up
  for (const e of S.enemies) scene.remove(e.mesh);
  for (const b of S.bullets) scene.remove(b.mesh);
  for (const m of S.mines) scene.remove(m.mesh);
  for (const h of S.humanoids) scene.remove(h.mesh);
  for (const p of S.powerUps) scene.remove(p.mesh);
  S.enemies = []; S.bullets = []; S.mines = []; S.humanoids = []; S.powerUps = [];
  S.activePowerUp = null; S.powerUpTimer = 0;
  S.bossActive = false; S.bossHP = 0; S.bossMaxHP = 0;
  shipMesh.visible = false;
  S.phase = 'menu';
  S.uiEvent = 'menu';
}

function checkAchievements() {
  if (S.score >= 10000) S.unlock('score10k');
  if (S.score >= 50000) S.unlock('score50k');
  if (S.score >= 100000) S.unlock('score100k');
  if (S.totalKills >= 100) S.unlock('kill100');
  if (S.totalKills >= 500) S.unlock('kill500');
  if (S.combo >= 20) S.unlock('combo20');
  if (S.rescuesGame >= 10) S.unlock('rescue10');
  if (S.mode === 'speed' && S.wave >= 5) S.unlock('speed_clear');
}
