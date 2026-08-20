import { Assets, Container, Sprite, Texture } from 'pixi.js';

interface MapMeta {
  pos_x: number;
  pos_y: number;
  scale: number; // world units per radar pixel
}

// Radar metadata sourced from each map's .txt overview file.
// Radar images (1024×1024 PNG) go in public/maps/<mapname>.png
const MAP_META: Record<string, MapMeta> = {
  de_dust2:   { pos_x: -2476, pos_y:  3239, scale: 4.4  },
  de_mirage:  { pos_x: -3230, pos_y:  1713, scale: 5.0  },
  de_inferno: { pos_x: -2087, pos_y:  3870, scale: 4.9  },
  de_ancient: { pos_x: -2953, pos_y:  2164, scale: 5.0  },
  de_anubis:  { pos_x: -2796, pos_y:  3328, scale: 5.22 },
  de_nuke:    { pos_x: -3453, pos_y:  2887, scale: 7.0  },
  de_overpass: { pos_x: -4831, pos_y:  1781, scale: 5.2  },
  de_vertigo:  { pos_x: -3168, pos_y:  1762, scale: 4.0  },
};

const RADAR_PX = 1024; // standard CS radar image dimensions

export class MapRenderer {
  readonly container = new Container();
  private meta: MapMeta | null = null;
  private sprite: Sprite | null = null;

  async load(mapName: string) {
    this.meta = MAP_META[mapName] ?? null;
    if (!this.meta) console.warn(`No radar metadata for map: ${mapName}`);

    try {
      const texture = await Assets.load<Texture>(`/maps/${mapName}.png`);
      this.sprite = new Sprite(texture);
      this.sprite.anchor.set(0, 0);
      this.container.addChild(this.sprite);
      this.resize(window.innerWidth, window.innerHeight);
    } catch (e) {
      console.error(`Failed to load radar image for ${mapName}:`, e);
    }
  }

  resize(w: number, h: number) {
    const size = Math.min(w, h);
    if (this.sprite) {
      this.sprite.width = size;
      this.sprite.height = size;
      this.sprite.x = (w - size) / 2;
      this.sprite.y = (h - size) / 2;
    }
  }

  worldLengthToCanvas(units: number): number {
    if (!this.meta) return 0;
    return (units / this.meta.scale / RADAR_PX) * Math.min(window.innerWidth, window.innerHeight);
  }

  worldToCanvas(worldX: number, worldY: number): { x: number; y: number } {
    if (!this.meta) return { x: 0, y: 0 };

    const size = Math.min(window.innerWidth, window.innerHeight);
    const rx = (worldX - this.meta.pos_x) / this.meta.scale;
    const ry = (this.meta.pos_y - worldY) / this.meta.scale; // Y axis is inverted

    return {
      x: (window.innerWidth  - size) / 2 + (rx / RADAR_PX) * size,
      y: (window.innerHeight - size) / 2 + (ry / RADAR_PX) * size,
    };
  }
}
