import { demoStore } from '../store/demoStore.js';

export class Controls {
  private playPause  = document.getElementById('play-pause')  as HTMLButtonElement;
  private scrubber   = document.getElementById('scrubber')    as HTMLInputElement;
  private tickLabel  = document.getElementById('tick-display') as HTMLSpanElement;
  private speedSelect = document.getElementById('speed')      as HTMLSelectElement;
  private controlsEl = document.getElementById('controls')    as HTMLDivElement;

  init() {
    this.playPause.addEventListener('click', () => {
      demoStore.playing = !demoStore.playing;
      this.syncButton();
    });

    this.scrubber.addEventListener('input', () => {
      demoStore.currentTick = Number(this.scrubber.value);
      demoStore.playing = false;
      this.syncButton();
    });

    this.speedSelect.addEventListener('change', () => {
      demoStore.speed = Number(this.speedSelect.value);
    });
  }

  show() {
    this.scrubber.max = String(demoStore.maxTick);
    this.controlsEl.classList.remove('hidden');
  }

  update() {
    const tick = Math.floor(demoStore.currentTick);
    this.scrubber.value     = String(tick);
    this.tickLabel.textContent = `${tick} / ${demoStore.maxTick}`;
    this.syncButton();
  }

  private syncButton() {
    this.playPause.textContent = demoStore.playing ? '⏸' : '▶';
  }
}
