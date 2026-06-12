/** Local JSON snapshot persistence for week-over-week learning. */

import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export function dataDir(): string {
  return (
    process.env.FWC_DATA_DIR ||
    path.join(homedir(), ".fantasy-wc-mcp", "data")
  );
}

async function ensureDir(): Promise<string> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function timestampSlug(d: Date): string {
  // 2026-06-12T09-30-00 (filename-safe, sortable)
  return d.toISOString().replace(/:/g, "-").replace(/\..+$/, "");
}

export interface SnapshotMeta {
  file: string;
  capturedAt: string;
  roundId: number | null;
  leagueId: string | number | null;
  topN: number;
  squadsCaptured: number;
  sizeBytes: number;
}

export async function writeSnapshot(snapshot: any): Promise<{ file: string; path: string }> {
  const dir = await ensureDir();
  const captured = new Date(snapshot.capturedAt);
  const round = snapshot.roundId != null ? `r${snapshot.roundId}` : "rNA";
  const file = `snapshot-${round}-${timestampSlug(captured)}.json`;
  const full = path.join(dir, file);
  await fs.writeFile(full, JSON.stringify(snapshot, null, 2), "utf8");
  return { file, path: full };
}

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const dir = dataDir();
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const metas: SnapshotMeta[] = [];
  for (const name of names) {
    if (!name.startsWith("snapshot-") || !name.endsWith(".json")) continue;
    const full = path.join(dir, name);
    try {
      const stat = await fs.stat(full);
      const raw = await fs.readFile(full, "utf8");
      const snap = JSON.parse(raw);
      metas.push({
        file: name,
        capturedAt: snap.capturedAt ?? null,
        roundId: snap.roundId ?? null,
        leagueId: snap.leagueId ?? null,
        topN: snap.topN ?? (snap.squads ? snap.squads.length : 0),
        squadsCaptured: snap.squads ? snap.squads.length : 0,
        sizeBytes: stat.size,
      });
    } catch {
      // skip unreadable/corrupt files
    }
  }
  // Newest first.
  metas.sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1));
  return metas;
}

export async function readSnapshot(fileOrLatest: string): Promise<any> {
  if (fileOrLatest === "latest") {
    const metas = await listSnapshots();
    if (!metas.length) throw new Error("No snapshots stored yet. Run snapshot_top_teams first.");
    fileOrLatest = metas[0].file;
  }
  const full = path.join(dataDir(), path.basename(fileOrLatest));
  const raw = await fs.readFile(full, "utf8");
  return JSON.parse(raw);
}
