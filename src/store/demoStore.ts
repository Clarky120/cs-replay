export interface PlayerTick {
  tick: number;
  steamid: string;
  X: number;
  Y: number;
  Z: number;
  health: number;
  team_num: number; // 2 = T, 3 = CT
  is_alive: boolean;
  player_name: string;
  yaw: number;
  activeWeapon: string | null;
}

export interface WeaponEquipEvent {
  tick: number;
  steamid: string;
  weapon: string;
}

export interface BombEvent {
  tick: number;
  type: 'planted' | 'defused' | 'exploded';
  x: number | null;
  y: number | null;
}


export interface GrenadeEvent {
  tick: number;
  endTick: number;
  x: number;
  y: number;
  type: 'smoke' | 'he' | 'flash' | 'molotov';
}

export type GrenadeProjectileClass =
  | 'CSmokeGrenadeProjectile'
  | 'CHEGrenadeProjectile'
  | 'CFlashbangProjectile'
  | 'CMolotovProjectile'
  | 'CIncendiaryGrenadeProjectile'
  | 'CDecoyProjectile';

export interface GrenadeFlightEvent {
  tick: number;
  entity_id: number;
  x: number;
  y: number;
  grenade_type: GrenadeProjectileClass;
}

export interface DemoHeader {
  map_name: string;
  playback_ticks: number;
  tick_rate: number;
}

export interface ParsedDemo {
  header: DemoHeader;
  tickIndex: Map<number, PlayerTick[]>;
  maxTick: number;
  grenades: GrenadeEvent[];
  grenadesFlight: Map<number, GrenadeFlightEvent[]>;
  weaponEvents: Map<string, WeaponEquipEvent[]>; // per steamid, sorted ascending by tick
  bombEvents: BombEvent[]; // sorted ascending by tick
}

class DemoStore {
  demo: ParsedDemo | null = null;
  currentTick = 0;
  playing = false;
  speed = 1;

  load(demo: ParsedDemo) {
    this.demo = demo;
    this.currentTick = 0;
    this.playing = false;
  }

  get maxTick(): number {
    return this.demo?.maxTick ?? 0;
  }

  get tickRate(): number {
    return this.demo?.header.tick_rate ?? 64;
  }

  get mapName(): string {
    return this.demo?.header.map_name ?? '';
  }

  getPlayers(tick: number): PlayerTick[] {
    const players = this.demo?.tickIndex.get(tick) ?? [];
    return players.map((p) => ({
      ...p,
      activeWeapon: this.getActiveWeapon(p.steamid, tick),
    }));
  }

  private getActiveWeapon(steamid: string, tick: number): string | null {
    const events = this.demo?.weaponEvents.get(steamid);
    if (!events || events.length === 0) return null;

    let current: string | null = null;
    for (const e of events) {
      if (e.tick > tick) break;
      current = e.weapon;
    }
    return current;
  }

  getGrenades(tick: number): GrenadeEvent[] {
    return this.demo?.grenades?.filter(g => tick >= g.tick && tick <= g.endTick) ?? [];
  }

  isBombPlanted(tick: number): boolean {
    return this.getLatestBombEvent(tick)?.type === 'planted';
  }

  getBombPosition(tick: number): { x: number; y: number } | null {
    const e = this.getLatestBombEvent(tick);
    if (!e || e.type !== 'planted' || e.x == null || e.y == null) return null;
    return { x: e.x, y: e.y };
  }

  private getLatestBombEvent(tick: number): BombEvent | null {
    const events = this.demo?.bombEvents;
    if (!events || events.length === 0) return null;

    let current: BombEvent | null = null;
    for (const e of events) {
      if (e.tick > tick) break;
      current = e;
    }
    return current;
  }

  getGrenadeProjectiles(tick: number): GrenadeFlightEvent[] {
    return this.demo?.grenadesFlight.get(tick) ?? [];
  }
}

export const demoStore = new DemoStore();
