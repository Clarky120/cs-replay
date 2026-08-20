import { Application } from 'pixi.js';
import { demoStore } from '../store/demoStore.js';
import { MapRenderer } from './map.js';
import { EntityRenderer } from './entities.js';
import type { Controls } from '../ui/controls.js';

export async function createApp(controls: Controls) {
  const app = new Application();
  await app.init({ resizeTo: window, background: 0x111111, antialias: true });
  document.body.appendChild(app.canvas);

  const mapRenderer    = new MapRenderer();
  const entityRenderer = new EntityRenderer(mapRenderer);

  app.stage.addChild(mapRenderer.container);
  app.stage.addChild(entityRenderer.container);

  window.addEventListener('resize', () => {
    mapRenderer.resize(window.innerWidth, window.innerHeight);
  });

  app.ticker.add((ticker) => {
    if (demoStore.playing) {
      demoStore.currentTick += ticker.deltaMS * (demoStore.tickRate / 1000) * demoStore.speed;

      if (demoStore.currentTick >= demoStore.maxTick) {
        demoStore.currentTick = demoStore.maxTick;
        demoStore.playing = false;
      }
    }

    const tick = Math.floor(demoStore.currentTick);
    entityRenderer.updateGrenades(demoStore.getGrenades(tick));
    entityRenderer.updateGrenadeFlight(demoStore.getGrenadeProjectiles(tick));
    entityRenderer.updateBomb(demoStore.getBombPosition(tick));
    entityRenderer.update(demoStore.getPlayers(tick));
    controls.update();
  });

  return { app, mapRenderer };
}
