// Neon Defender VR — UI System
import { createSystem, PanelUI, PanelDocument, UIKitDocument, UIKit, eq, Entity, World } from '@iwsdk/core';
import { S, SCHEMES, WORLD_W, HALF_W } from './game-state.js';
import { startGame, togglePause, returnToMenu } from './game-system.js';
import type { Mode, Diff } from './game-state.js';

const getDoc = (e: Entity) => e.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
const setText = (doc: UIKitDocument | undefined, id: string, text: string) =>
  (doc?.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });

let menuDoc: UIKitDocument | undefined;
let hudDoc: UIKitDocument | undefined;
let pauseDoc: UIKitDocument | undefined;
let resultsDoc: UIKitDocument | undefined;
let settingsDoc: UIKitDocument | undefined;
let tutorialDoc: UIKitDocument | undefined;
let statsDoc: UIKitDocument | undefined;
let achDoc: UIKitDocument | undefined;
let scannerDoc: UIKitDocument | undefined;
let achPage = 0;

function showPanel(doc: UIKitDocument | undefined, show: boolean) {
  if (!doc) return;
  const root = doc.getElementById('root') as UIKit.Text | undefined;
  root?.setProperties({ visibility: show ? 'visible' : 'hidden' });
}

export class UISystem extends createSystem({
  menu: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/menu.json')] },
  hud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
  pause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
  results: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/results.json')] },
  settings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
  tutorial: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/tutorial.json')] },
  stats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
  achievements: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achievements.json')] },
  scanner: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/scanner.json')] },
}) {
  init() {
    const world = (this as any).world as World;

    const panels = ['menu', 'hud', 'pause', 'results', 'settings', 'tutorial', 'stats', 'achievements', 'scanner'];
    for (let i = 0; i < panels.length; i++) {
      const e = world.createEntity();
      e.addComponent(PanelUI, { config: `./ui/${panels[i]}.json` });
    }

    this.queries.menu.subscribe('qualify', (entity) => {
      menuDoc = getDoc(entity);
      if (!menuDoc) return;
      const btn = (id: string) => menuDoc?.getElementById(id) as UIKit.Text | undefined;
      btn('btn-arcade')?.addEventListener('click', () => startGame('arcade'));
      btn('btn-speed')?.addEventListener('click', () => startGame('speed'));
      btn('btn-zen')?.addEventListener('click', () => startGame('zen'));
      btn('btn-challenge')?.addEventListener('click', () => startGame('challenge'));
      btn('btn-settings')?.addEventListener('click', () => { S.uiEvent = 'showSettings'; });
      btn('btn-tutorial')?.addEventListener('click', () => { S.uiEvent = 'showTutorial'; });
      btn('btn-stats')?.addEventListener('click', () => { S.uiEvent = 'showStats'; });
      btn('btn-achievements')?.addEventListener('click', () => { S.uiEvent = 'showAch'; });
    });

    this.queries.hud.subscribe('qualify', (entity) => { hudDoc = getDoc(entity); });
    this.queries.scanner.subscribe('qualify', (entity) => { scannerDoc = getDoc(entity); });

    this.queries.pause.subscribe('qualify', (entity) => {
      pauseDoc = getDoc(entity);
      const btn = (id: string) => pauseDoc?.getElementById(id) as UIKit.Text | undefined;
      btn('btn-resume')?.addEventListener('click', () => togglePause());
      btn('btn-quit')?.addEventListener('click', () => returnToMenu());
    });

    this.queries.results.subscribe('qualify', (entity) => {
      resultsDoc = getDoc(entity);
      const btn = (id: string) => resultsDoc?.getElementById(id) as UIKit.Text | undefined;
      btn('btn-retry')?.addEventListener('click', () => startGame(S.mode));
      btn('btn-menu')?.addEventListener('click', () => returnToMenu());
    });

    this.queries.settings.subscribe('qualify', (entity) => {
      settingsDoc = getDoc(entity);
      const btn = (id: string) => settingsDoc?.getElementById(id) as UIKit.Text | undefined;
      btn('btn-normal')?.addEventListener('click', () => { S.diff = 'normal'; S.uiEvent = 'diffChanged'; });
      btn('btn-hard')?.addEventListener('click', () => { S.diff = 'hard'; S.uiEvent = 'diffChanged'; });
      btn('btn-insane')?.addEventListener('click', () => { S.diff = 'insane'; S.uiEvent = 'diffChanged'; });
      btn('btn-cyan')?.addEventListener('click', () => { S.scheme = 'cyan'; });
      btn('btn-green')?.addEventListener('click', () => { S.scheme = 'green'; });
      btn('btn-magenta')?.addEventListener('click', () => { S.scheme = 'magenta'; });
      btn('btn-gold')?.addEventListener('click', () => { S.scheme = 'gold'; });
      btn('btn-settings-back')?.addEventListener('click', () => { S.uiEvent = 'menu'; });
    });

    this.queries.tutorial.subscribe('qualify', (entity) => {
      tutorialDoc = getDoc(entity);
      const btn = (id: string) => tutorialDoc?.getElementById(id) as UIKit.Text | undefined;
      btn('btn-tutorial-back')?.addEventListener('click', () => { S.uiEvent = 'menu'; });
    });

    this.queries.stats.subscribe('qualify', (entity) => {
      statsDoc = getDoc(entity);
      const btn = (id: string) => statsDoc?.getElementById(id) as UIKit.Text | undefined;
      btn('btn-stats-back')?.addEventListener('click', () => { S.uiEvent = 'menu'; });
    });

    this.queries.achievements.subscribe('qualify', (entity) => {
      achDoc = getDoc(entity);
      const btn = (id: string) => achDoc?.getElementById(id) as UIKit.Text | undefined;
      btn('btn-ach-back')?.addEventListener('click', () => { S.uiEvent = 'menu'; });
      btn('btn-ach-prev')?.addEventListener('click', () => { if (achPage > 0) achPage--; updateAchievements(); });
      btn('btn-ach-next')?.addEventListener('click', () => { if (achPage < 4) achPage++; updateAchievements(); });
    });
  }

  update() {
    const p = S.phase;
    const ev = S.uiEvent;

    const showMenu = p === 'menu' && !['showSettings', 'showTutorial', 'showStats', 'showAch'].includes(ev);
    showPanel(menuDoc, showMenu);
    showPanel(hudDoc, p === 'playing' || p === 'waveComplete');
    showPanel(pauseDoc, p === 'paused');
    showPanel(resultsDoc, p === 'gameover');
    showPanel(settingsDoc, ev === 'showSettings');
    showPanel(tutorialDoc, ev === 'showTutorial');
    showPanel(statsDoc, ev === 'showStats');
    showPanel(achDoc, ev === 'showAch');
    showPanel(scannerDoc, p === 'playing' || p === 'waveComplete');

    if (hudDoc && (p === 'playing' || p === 'waveComplete')) {
      setText(hudDoc, 'score', `SCORE: ${S.score}`);
      setText(hudDoc, 'lives', `LIVES: ${S.lives}`);
      setText(hudDoc, 'wave', `WAVE: ${S.wave}`);
      setText(hudDoc, 'bombs', `BOMBS: ${S.smartBombs}`);
      setText(hudDoc, 'combo', S.combo > 1 ? `x${S.combo}` : '');
      setText(hudDoc, 'timer', S.mode === 'speed' ? `TIME: ${Math.ceil(S.speedTimer)}s` : '');
      const alive = S.humanoids.filter(h => h.state === 'walking').length;
      setText(hudDoc, 'humans', `HUMANS: ${alive}`);
      setText(hudDoc, 'hyperspace', S.hyperspaceCooldown > 0 ? `HS: ${Math.ceil(S.hyperspaceCooldown)}s` : 'HS: READY');
      setText(hudDoc, 'wave-announce', S.waveAnnounceTimer > 0 ? `── WAVE ${S.wave} ──` : '');
    }

    if (scannerDoc && (p === 'playing' || p === 'waveComplete')) {
      updateScanner();
    }

    if (resultsDoc && p === 'gameover') {
      setText(resultsDoc, 'final-score', `Score: ${S.score}`);
      setText(resultsDoc, 'final-wave', `Wave: ${S.wave}`);
      setText(resultsDoc, 'final-kills', `Kills: ${S.totalKills}`);
      setText(resultsDoc, 'final-rescues', `Rescues: ${S.rescuesGame}`);
      const isHigh = S.score >= S.highScore;
      setText(resultsDoc, 'high-score', isHigh ? 'NEW HIGH SCORE!' : `Best: ${S.highScore}`);
    }

    if (statsDoc && ev === 'showStats') {
      setText(statsDoc, 'stat-games', `Games: ${S.totalGames}`);
      setText(statsDoc, 'stat-kills', `Kills: ${S.totalKills}`);
      setText(statsDoc, 'stat-rescues', `Rescues: ${S.totalRescues}`);
      setText(statsDoc, 'stat-waves', `Waves: ${S.totalWaves}`);
      setText(statsDoc, 'stat-bombs', `Bombs: ${S.totalBombs}`);
      setText(statsDoc, 'stat-deaths', `Deaths: ${S.totalDeaths}`);
      setText(statsDoc, 'stat-highscore', `High Score: ${S.highScore}`);
      setText(statsDoc, 'stat-bestwave', `Best Wave: ${S.bestWave}`);
    }

    if (settingsDoc && ev === 'showSettings') {
      setText(settingsDoc, 'diff-label', `Difficulty: ${S.diff.toUpperCase()}`);
      setText(settingsDoc, 'scheme-label', `Color: ${S.scheme.toUpperCase()}`);
    }

    if (achDoc && ev === 'showAch') {
      updateAchievements();
    }

    if (ev && !['showSettings', 'showTutorial', 'showStats', 'showAch'].includes(ev)) {
      S.uiEvent = '';
    }
  }
}

function updateScanner() {
  if (!scannerDoc) return;
  const width = 56;
  const chars: string[] = new Array(width).fill('·');

  const toScanPos = (worldX: number): number => {
    let rel = worldX - S.px;
    if (rel > HALF_W) rel -= WORLD_W;
    if (rel < -HALF_W) rel += WORLD_W;
    const norm = (rel + HALF_W) / WORLD_W;
    return Math.floor(norm * width) % width;
  };

  // Player at center
  chars[Math.floor(width / 2)] = '▲';

  for (const e of S.enemies) {
    if (e.state === 'dead') continue;
    const pos = toScanPos(e.x);
    if (pos >= 0 && pos < width) chars[pos] = '◆';
  }

  for (const h of S.humanoids) {
    if (h.state === 'dead' || h.state === 'rescued') continue;
    const pos = toScanPos(h.x);
    if (pos >= 0 && pos < width && chars[pos] === '·') chars[pos] = '○';
  }

  setText(scannerDoc, 'scanner-display', chars.join(''));
}

function updateAchievements() {
  if (!achDoc) return;
  const perPage = 5;
  const start = achPage * perPage;
  for (let i = 0; i < perPage; i++) {
    const a = S.achievements[start + i];
    if (a) {
      setText(achDoc, `ach-name-${i}`, `${a.unlocked ? '[*]' : '[ ]'} ${a.name}`);
      setText(achDoc, `ach-desc-${i}`, a.desc);
    } else {
      setText(achDoc, `ach-name-${i}`, '');
      setText(achDoc, `ach-desc-${i}`, '');
    }
  }
  const unlocked = S.achievements.filter(a => a.unlocked).length;
  setText(achDoc, 'ach-count', `${unlocked}/${S.achievements.length}`);
  setText(achDoc, 'ach-page', `Page ${achPage + 1}/5`);
}
