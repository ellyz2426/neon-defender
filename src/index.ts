// Neon Defender VR — Entry Point
import { World } from '@iwsdk/core';

const container = document.getElementById('scene-container') as HTMLDivElement;

async function main() {
  const world = await World.create(container, {
    xr: { offer: 'once' },
    render: {
      camera: { position: [0, 18, 50], lookAt: [0, 15, 0] },
      defaultLighting: false,
    },
    input: { canvasPointerEvents: true },
    features: {
      locomotion: false,
      grabbing: false,
      physics: false,
    },
  });

  const { EnvironmentSystem } = await import('./environment-system.js');
  const { GameSystem } = await import('./game-system.js');
  const { InputSystem } = await import('./input-system.js');
  const { AudioSystem } = await import('./audio-system.js');
  const { EffectsSystem } = await import('./effects-system.js');
  const { UISystem } = await import('./ui-system.js');

  world.registerSystem(EnvironmentSystem);
  world.registerSystem(GameSystem);
  world.registerSystem(InputSystem);
  world.registerSystem(AudioSystem);
  world.registerSystem(EffectsSystem);
  world.registerSystem(UISystem);
}

main().catch(console.error);
