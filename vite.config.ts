/// <reference types="node" />
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

function demoParserPlugin(): Plugin {
  return {
    name: 'demo-parser',
    configureServer(server) {
      server.middlewares.use('/api/parse', (req: any, res: any, next: () => void) => {
        if (req.method !== 'POST') { next(); return; }

        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          try {
            const dp = await import('@laihoe/demoparser2');
            const buf = Buffer.concat(chunks);

            let header: Record<string, unknown> = { map_name: '', playback_ticks: 0, tick_rate: 64 };
            try {
              const raw = dp.parseHeader(buf) as Record<string, unknown>;
              header = {
                map_name: raw.map_name ?? '',
                playback_ticks: raw.playback_ticks ?? 0,
                tick_rate: raw.playback_time
                  ? Math.round((raw.playback_ticks as number) / (raw.playback_time as number))
                  : 64,
              };
            } catch {}

            const events = dp.listGameEvents(buf)
            console.log(events);
            const rawTicks = dp.parseTicks(buf, ['X', 'Y', 'Z', 'health', 'team_num', 'is_alive', 'player_name', 'yaw']);
            const rawGrenades = dp.parseGrenades(buf, null, false);

            const EVENT_DEFS: Record<string, { type: string; ticks: number }> = {
              smokegrenade_detonate: { type: 'smoke',   ticks: 1152 },
              hegrenade_detonate:    { type: 'he',      ticks: 45   },
              flashbang_detonate:    { type: 'flash',   ticks: 64   },
              inferno_startburn:     { type: 'molotov', ticks: 448  },
            };

            const grenades: unknown[] = [];
            try {
              const rows = (dp.parseEvents(buf, Object.keys(EVENT_DEFS)) ?? []) as Record<string, unknown>[];
              for (const row of rows) {
                const def = EVENT_DEFS[row.event_name as string];
                if (def && row.x != null && row.y != null) {
                  grenades.push({ tick: row.tick, endTick: (row.tick as number) + def.ticks, x: row.x, y: row.y, type: def.type });
                }
              }
            } catch {}

            let weaponEvents: unknown[] = [];
            try {
              weaponEvents = (dp.parseEvents(buf, ['item_equip']) ?? []) as unknown[];
            } catch {}

            let bombEvents: unknown[] = [];
            try {
              bombEvents = (dp.parseEvents(buf, ['bomb_planted', 'bomb_defused', 'bomb_exploded'], ['X', 'Y']) ?? []) as unknown[];
              console.log('bomb_planted sample row:', (bombEvents as Record<string, unknown>[]).find(r => r.event_name === 'bomb_planted'));
            } catch {}

            if (!res.headersSent) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ header, rawTicks, grenades, rawGrenades, weaponEvents, bombEvents }));
            }
          } catch (err) {
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: String(err) }));
            }
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [demoParserPlugin()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['demoparser2', '@laihoe/demoparser2'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
