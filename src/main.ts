import {
  demoStore,
  type GrenadeEvent,
  type PlayerTick,
  type ParsedDemo,
  type WeaponEquipEvent,
  type BombEvent,
} from "./store/demoStore.js";
import { createApp } from "./renderer/app.js";
import { Controls } from "./ui/controls.js";
import { GrenadeFlightEvent } from "./store/demoStore";

const dropZone = document.getElementById("drop-zone") as HTMLDivElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function showStatus(msg: string, autohide = false) {
  statusEl.textContent = msg;
  statusEl.classList.add("visible");
  if (autohide) setTimeout(() => statusEl.classList.remove("visible"), 2500);
}

const controls = new Controls();
controls.init();

let appReady = false;
let mapRenderer: Awaited<ReturnType<typeof createApp>>["mapRenderer"] | null =
  null;

async function loadFile(file: File) {
  if (!file.name.endsWith(".dem")) {
    showStatus("Please select a .dem file");
    return;
  }

  try {
    showStatus(`Parsing ${file.name}…`);

    const res = await fetch("/api/parse", {
      method: "POST",
      body: file,
      headers: { "Content-Type": "application/octet-stream" },
    });

    showStatus("Processing tick data…");

    const json = (await res.json()) as {
      header?: ParsedDemo["header"];
      rawTicks?: unknown[];
      grenades?: GrenadeEvent[];
      rawGrenades: unknown[];
      weaponEvents?: unknown[];
      bombEvents?: unknown[];
      error?: string;
    };

    if (!res.ok || json.error) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }

    const header = json.header ?? {
      map_name: "",
      playback_ticks: 0,
      tick_rate: 64,
    };
    const rawTicks = json.rawTicks ?? [];
    const grenades = json.grenades ?? [];
    const grenadesRaw = json.rawGrenades ?? [];
    const weaponEventsRaw = json.weaponEvents ?? [];
    const bombEventsRaw = json.bombEvents ?? [];

    const tickIndex = new Map<number, PlayerTick[]>();
    const grenadesFlight = new Map<number, GrenadeFlightEvent[]>();
    const weaponEvents = new Map<string, WeaponEquipEvent[]>();
    const bombEvents: BombEvent[] = [];

    let maxTick = 0;
    console.log(rawTicks[0]);
    for (const row of rawTicks) {
      const r = row as PlayerTick;
      if (!tickIndex.has(r.tick)) {
        tickIndex.set(r.tick, []);
      }
      tickIndex.get(r.tick)!.push(r);
      if (r.tick > maxTick) {
        maxTick = r.tick;
      }
    }

    for (const row of grenadesRaw) {
      const r = row as GrenadeFlightEvent;
      if (!grenadesFlight.has(r.tick)) {
        grenadesFlight.set(r.tick, []);
      }
      grenadesFlight.get(r.tick)!.push(r);
      if (r.tick > maxTick) {
        maxTick = r.tick;
      }
    }



    for (const row of weaponEventsRaw as Record<string, unknown>[]) {
      const steamid = String(row.user_steamid ?? "");
      const weapon = String(row.weapon ?? row.item ?? "");
      const tick = Number(row.tick ?? 0);
      if (!steamid || !weapon) continue;

      if (!weaponEvents.has(steamid)) {
        weaponEvents.set(steamid, []);
      }
      weaponEvents.get(steamid)!.push({ tick, steamid, weapon });
    }
    for (const events of weaponEvents.values()) {
      events.sort((a, b) => a.tick - b.tick);
    }

    const BOMB_EVENT_TYPES: Record<string, BombEvent["type"]> = {
      bomb_planted: "planted",
      bomb_defused: "defused",
      bomb_exploded: "exploded",
    };

    for (const row of bombEventsRaw as Record<string, unknown>[]) {
      const type = BOMB_EVENT_TYPES[row.event_name as string];
      const tick = Number(row.tick ?? 0);
      if (!type) continue;
      const x = row.user_X != null ? Number(row.user_X) : null;
      const y = row.user_Y != null ? Number(row.user_Y) : null;
      bombEvents.push({ tick, type, x, y });
    }
    bombEvents.sort((a, b) => a.tick - b.tick);

    demoStore.load({ header, tickIndex, maxTick, grenades, grenadesFlight, weaponEvents, bombEvents });
    dropZone.classList.add("hidden");
    showStatus(
      `${header.map_name || "(unknown map)"} — ${maxTick} ticks`,
      true,
    );

    if (!appReady) {
      const result = await createApp(controls);
      mapRenderer = result.mapRenderer;
      appReady = true;
    }

    await mapRenderer!.load(header.map_name);
    controls.show();
  } catch (err) {
    console.error("[main] parse error:", err);
    showStatus(`Error: ${String(err)}`);
  }
}

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("drag-over"),
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file) void loadFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files?.[0]) void loadFile(fileInput.files[0]);
});
