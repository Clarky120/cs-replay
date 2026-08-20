import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { MapRenderer } from "./map.js";
import type {
  GrenadeEvent,
  GrenadeFlightEvent,
  GrenadeProjectileClass,
  PlayerTick,
} from "../store/demoStore.js";

const PLAYER_RADIUS = 6;
const COLOR_CT = 0x4a9eff;
const COLOUR_CT_HEALTH = 0x91c2fa;
const COLOR_T = 0xe8a030;
const COLOUR_T_HEALTH = 0xe8b266;
const HEALTH_RADIUS = PLAYER_RADIUS * 0.6;

const GRENADE_COLOR: Record<GrenadeEvent["type"], number> = {
  smoke: 0x999999,
  he: 0xff6600,
  flash: 0xffffff,
  molotov: 0xff4400,
};
const GRENADE_ALPHA: Record<GrenadeEvent["type"], number> = {
  smoke: 0.55,
  he: 0.8,
  flash: 0.75,
  molotov: 0.65,
};
const GRENADE_WORLD_RADIUS: Record<GrenadeEvent["type"], number> = {
  smoke: 144,
  he: 80,
  flash: 60,
  molotov: 120,
};

const FLIGHT_COLOR: Record<GrenadeProjectileClass, number> = {
  CSmokeGrenadeProjectile: 0x999999,
  CHEGrenadeProjectile: 0xff6600,
  CFlashbangProjectile: 0xffffff,
  CMolotovProjectile: 0xff4400,
  CIncendiaryGrenadeProjectile: 0xff4400,
  CDecoyProjectile: 0x00ccff,
};

const nameStyle = new TextStyle({
  fontSize: 10,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 3 },
});

interface PlayerGfx {
  dot: Graphics;
  healthDot: Graphics;
  yawDot: Graphics;
  label: Text;
  weponLabel: Text;
}

export class EntityRenderer {
  readonly container = new Container();
  private grenadeLayer = new Graphics();
  private grenadeFlight = new Graphics();
  private bombMarker = new Graphics();
  private players = new Map<string, PlayerGfx>();

  constructor(private map: MapRenderer) {
    this.container.addChild(this.grenadeLayer);
    this.container.addChild(this.grenadeFlight);
    this.container.addChild(this.bombMarker);
  }

  updateBomb(position: { x: number; y: number } | null) {
    this.bombMarker.clear();
    if (!position) {
      this.bombMarker.visible = false;
      return;
    }

    this.bombMarker.visible = true;
    const { x, y } = this.map.worldToCanvas(position.x, position.y);
    const r = 7;
    this.bombMarker
      .moveTo(x - r, y - r)
      .lineTo(x + r, y + r)
      .moveTo(x + r, y - r)
      .lineTo(x - r, y + r)
      .stroke({ color: 0xff2222, width: 3 });
  }

  updateGrenades(grenades: GrenadeEvent[]) {
    this.grenadeLayer.clear();
    for (const g of grenades) {
      const { x, y } = this.map.worldToCanvas(g.x, g.y);
      const r = Math.max(
        this.map.worldLengthToCanvas(GRENADE_WORLD_RADIUS[g.type]),
        8,
      );
      this.grenadeLayer
        .circle(x, y, r)
        .fill({ color: GRENADE_COLOR[g.type], alpha: GRENADE_ALPHA[g.type] });
    }
  }

  updateGrenadeFlight(projectiles: GrenadeFlightEvent[]) {
    this.grenadeFlight.clear();
    for (const g of projectiles) {
      const { x, y } = this.map.worldToCanvas(g.x, g.y);
      const color = FLIGHT_COLOR[g.grenade_type] ?? 0xffffff;
      this.grenadeFlight.circle(x, y, 5).fill({ color: 0x000000, alpha: 0.7 });
      this.grenadeFlight.circle(x, y, 4).fill({ color, alpha: 1 });
    }
  }

  update(players: PlayerTick[]) {
    const seen = new Set<string>();

    for (const p of players) {
      seen.add(p.steamid);

      let gfx = this.players.get(p.steamid);
      if (!gfx) {
        const dot = new Graphics();
        const healthDot = new Graphics();
        const yawDot = new Graphics();
        const label = new Text({ text: "", style: nameStyle });
        const weponLabel = new Text({ text: "", style: nameStyle });
        label.anchor.set(0.5, 1.8);
        weponLabel.anchor.set(0.5, -0.8);
        this.container.addChild(dot, healthDot, yawDot, label, weponLabel);
        gfx = { dot, label, healthDot, yawDot, weponLabel };
        this.players.set(p.steamid, gfx);
      }

      const { x, y } = this.map.worldToCanvas(p.X, p.Y);
      const color = p.team_num === 3 ? COLOR_CT : COLOR_T;
      const alpha = p.is_alive ? 1 : 0.2;

      gfx.dot.visible = true;
      gfx.dot.clear().circle(0, 0, PLAYER_RADIUS).fill({ color, alpha });
      gfx.dot.x = x;
      gfx.dot.y = y;

      gfx.label.text = p.player_name ?? "";
      gfx.label.x = x;
      gfx.label.y = y;
      gfx.label.visible = p.is_alive;

      gfx.weponLabel.text = p.activeWeapon ?? "";
      gfx.weponLabel.x = x;
      gfx.weponLabel.y = y;
      gfx.weponLabel.visible = p.is_alive;

      const healthFraction = Math.min(1, Math.max(0, p.health) / 100);
      const healthStart = -Math.PI / 2;
      const healthEnd = healthStart + healthFraction * Math.PI * 2;

      gfx.healthDot.clear();
      if (healthFraction > 0) {
        gfx.healthDot
          .moveTo(0, 0)
          .arc(0, 0, HEALTH_RADIUS, healthStart, healthEnd)
          .lineTo(0, 0)
          .fill({ color: 0x000000});
      }

      gfx.healthDot.x = x;
      gfx.healthDot.y = y;
      gfx.healthDot.visible = p.is_alive;

      gfx.yawDot.visible = p.is_alive;
      const yawRad = (p.yaw * Math.PI) / 180;
      const yawX = x + PLAYER_RADIUS * Math.cos(yawRad);
      const yawY = y - PLAYER_RADIUS * Math.sin(yawRad);
      gfx.yawDot.clear().circle(yawX, yawY, 2).fill({ color: 0xffffff });
    }

    for (const [id, gfx] of this.players) {
      if (!seen.has(id)) {
        gfx.dot.visible = false;
        gfx.label.visible = false;
      }
    }
  }
}
