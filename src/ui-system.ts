// Neon Defender VR — UI System
import { createSystem, PanelUI, PanelDocument, UIKitDocument, UIKit, eq, Entity, World } from '@iwsdk/core';
import { S } from './game-state.js';
import { startGame, togglePause, returnToMenu } from './game-system.js';
import type { Mode, Diff } from './game-state.js';

const getDoc = (e: Entity) => e.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
const setText = (doc: UIKitDocument | undefined, id: string, text: string) =>
  (doc?.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
const setVis = (doc: UIKitDocument | undefined, id: string, vis: boolean) =>
  (doc?.getElementById(id) as UIKit.Text | undefined)?.setProperties({ visibility: vis ? 'visible' : 'hidden' });

let menuDoc: UIKitDocument | undefined;
let hudDoc: UIKitDocument | undefined;
let pauseDoc: UIKitDocument | undefined;
let resultsDoc: UIKitDocument | undefined;
let settingsDoc: UIKitDocument | undefined;
let tutorialDoc: UIKitDocument | undefined;
let statsDoc: UIKitDocument | undefined;
let achDoc: UIKitDocument | undefined;
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
}) {
  init() {
    const world = (this as any).world as World;

    // Create panel entities
    const panels = ['menu', 'hud', 'pause', 'results', 'settings', 'tutorial', 'stats', 'achievements'];

    for (let i = 0; i < panels.length; i++) {
      const e = world.createEntity();
      e.addComponent(PanelUI, { config: `./ui/${panels[i]}.json` });
    }

    // Bind panels
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
      btn('btn-ach-next')?.addEventListener('click', () => { if (achPage < 3) achPage++; updateAchievements(); });
    });
  }

  update() {
    const p = S.phase;
    const ev = S.uiEvent;

    // Panel visibility
    const showMenu = p === 'menu' && !['showSettings', 'showTutorial', 'showStats', 'showAch'].includes(ev);
    showPanel(menuDoc, showMenu);
    showPanel(hudDoc, p === 'playing' || p === 'waveComplete');
    showPanel(pauseDoc, p === 'paused');
    showPanel(resultsDoc, p === 'gameover');
    showPanel(settingsDoc, ev === 'showSettings');
    showPanel(tutorialDoc, ev === 'showTutorial');
    showPanel(statsDoc, ev === 'showStats');
    showPanel(achDoc, ev === 'showAch');

    // HUD updates
    if (hudDoc && (p === 'playing' || p === 'waveComplete')) {
      setText(hudDoc, 'score', `SCORE: ${S.score}`);
      setText(hudDoc, 'lives', `LIVES: ${S.lives}`);
      setText(hudDoc, 'wave', `WAVE: ${S.wave}`);
      setText(hudDoc, 'bombs', `BOMBS: ${S.smartBombs}`);
      setText(hudDoc, 'combo', S.combo > 1 ? `x${S.combo}` : '');
      if (S.mode === 'speed') {
        setText(hudDoc, 'timer', `TIME: ${Math.ceil(S.speedTimer)}s`);
      } else {
        setText(hudDoc, 'timer', '');
      }
      // Humanoid count
      const alive = S.humanoids.filter(h => h.state === 'walking').length;
      setText(hudDoc, 'humans', `HUMANS: ${alive}`);
    }

    // Results screen
    if (resultsDoc && p === 'gameover') {
      setText(resultsDoc, 'final-score', `Score: ${S.score}`);
      setText(resultsDoc, 'final-wave', `Wave: ${S.wave}`);
      setText(resultsDoc, 'final-kills', `Kills: ${S.totalKills}`);
      setText(resultsDoc, 'final-rescues', `Rescues: ${S.rescuesGame}`);
      const isHigh = S.score >= S.highScore;
      setText(resultsDoc, 'high-score', isHigh ? 'NEW HIGH SCORE!' : `Best: ${S.highScore}`);
    }

    // Stats screen
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

    // Settings
    if (settingsDoc && ev === 'showSettings') {
      setText(settingsDoc, 'diff-label', `Difficulty: ${S.diff.toUpperCase()}`);
      setText(settingsDoc, 'scheme-label', `Color: ${S.scheme.toUpperCase()}`);
    }

    // Achievements
    if (achDoc && ev === 'showAch') {
      updateAchievements();
    }

    // Clear single-fire events
    if (ev && !['showSettings', 'showTutorial', 'showStats', 'showAch'].includes(ev)) {
      S.uiEvent = '';
    }
  }
}

function updateAchievements() {
  if (!achDoc) return;
  const perPage = 5;
  const start = achPage * perPage;
  for (let i = 0; i < perPage; i++) {
    const a = S.achievements[start + i];
    const nameEl = `ach-name-${i}`;
    const descEl = `ach-desc-${i}`;
    if (a) {
      setText(achDoc, nameEl, `${a.unlocked ? '[*]' : '[ ]'} ${a.name}`);
      setText(achDoc, descEl, a.desc);
    } else {
      setText(achDoc, nameEl, '');
      setText(achDoc, descEl, '');
    }
  }
  const unlocked = S.achievements.filter(a => a.unlocked).length;
  setText(achDoc, 'ach-count', `${unlocked}/${S.achievements.length}`);
  setText(achDoc, 'ach-page', `Page ${achPage + 1}/4`);
}
