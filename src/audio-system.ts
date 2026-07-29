// Neon Defender VR — Audio System
import { createSystem } from '@iwsdk/core';
import { S } from './game-state.js';

let ctx: AudioContext | null = null;
let musicOsc: OscillatorNode | null = null;
let musicGain: GainNode | null = null;
let lastEvent = '';

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, dur: number, vol = 0.15, type: OscillatorType = 'square') {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  } catch { /* */ }
}

function playNoise(dur: number, vol = 0.1) {
  try {
    const c = getCtx();
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * vol;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(g).connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
  } catch { /* */ }
}

function startMusic() {
  try {
    const c = getCtx();
    if (musicOsc) { try { musicOsc.stop(); } catch { /* */ } }
    musicOsc = c.createOscillator();
    musicGain = c.createGain();
    musicOsc.type = 'sine';
    musicOsc.frequency.setValueAtTime(55, c.currentTime);
    musicGain.gain.setValueAtTime(0.04, c.currentTime);
    musicOsc.connect(musicGain).connect(c.destination);
    musicOsc.start();
  } catch { /* */ }
}

function stopMusic() {
  try { if (musicOsc) { musicOsc.stop(); musicOsc = null; } } catch { /* */ }
}

export class AudioSystem extends createSystem({}) {
  init() {}

  update() {
    if (S.uiEvent === lastEvent && S.uiEvent === '') return;
    const ev = S.uiEvent;
    if (ev === lastEvent) return;
    lastEvent = ev;

    if (ev === 'start') { startMusic(); }
    else if (ev === 'shoot') { playTone(880, 0.06, 0.08, 'square'); }
    else if (ev === 'kill') {
      playTone(600, 0.1, 0.12, 'square');
      playTone(900, 0.08, 0.1, 'sawtooth');
    }
    else if (ev === 'death') {
      playTone(200, 0.3, 0.15, 'sawtooth');
      playTone(100, 0.5, 0.12, 'sine');
      playNoise(0.3, 0.15);
    }
    else if (ev === 'bomb') {
      playNoise(0.5, 0.2);
      playTone(60, 0.6, 0.15, 'sine');
    }
    else if (ev === 'rescue') {
      playTone(523, 0.1, 0.12, 'sine');
      playTone(659, 0.1, 0.1, 'sine');
      playTone(784, 0.15, 0.12, 'sine');
    }
    else if (ev === 'hyperspace') {
      playTone(1200, 0.1, 0.1, 'sine');
      playTone(600, 0.15, 0.12, 'sine');
      playTone(300, 0.2, 0.1, 'sine');
      playNoise(0.15, 0.08);
    }
    else if (ev === 'extraLife') {
      playTone(523, 0.1, 0.12, 'sine');
      playTone(659, 0.1, 0.1, 'sine');
      playTone(784, 0.1, 0.1, 'sine');
      playTone(1047, 0.2, 0.12, 'sine');
    }
    else if (ev === 'powerup') {
      playTone(440, 0.08, 0.1, 'sine');
      playTone(660, 0.08, 0.1, 'sine');
      playTone(880, 0.1, 0.12, 'triangle');
      playTone(1100, 0.15, 0.1, 'sine');
    }
    else if (ev === 'bossSpawn') {
      playTone(80, 0.5, 0.18, 'sawtooth');
      playTone(60, 0.7, 0.15, 'sine');
      playNoise(0.3, 0.12);
    }
    else if (ev === 'shieldBreak') {
      playTone(300, 0.15, 0.12, 'square');
      playTone(500, 0.1, 0.1, 'sine');
      playNoise(0.2, 0.1);
    }
    else if (ev === 'grabbed') { playTone(300, 0.2, 0.1, 'sawtooth'); }
    else if (ev === 'mutated') {
      playTone(150, 0.3, 0.12, 'sawtooth');
      playNoise(0.2, 0.1);
    }
    else if (ev === 'waveComplete') {
      playTone(440, 0.12, 0.1, 'sine');
      playTone(554, 0.12, 0.1, 'sine');
      playTone(659, 0.15, 0.12, 'sine');
      playTone(880, 0.2, 0.12, 'sine');
    }
    else if (ev === 'gameover') {
      stopMusic();
      playTone(440, 0.3, 0.12, 'sine');
      playTone(330, 0.3, 0.1, 'sine');
      playTone(220, 0.5, 0.12, 'sine');
    }
    else if (ev === 'menu') { stopMusic(); }

    // Update music pitch based on wave intensity
    if (musicOsc && musicGain && S.phase === 'playing') {
      try {
        const c = getCtx();
        const baseFreq = 55 + S.wave * 3;
        musicOsc.frequency.setValueAtTime(baseFreq, c.currentTime);
        musicGain.gain.setValueAtTime(0.03 + S.wave * 0.002, c.currentTime);
      } catch { /* */ }
    }
  }
}
