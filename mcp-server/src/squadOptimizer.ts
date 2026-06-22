/**
 * MILP-based squad optimizer for Fantasy WC 2026.
 *
 * Uses highs-js (WASM HiGHS) to jointly optimise squad selection, formation,
 * bench assignment and captain choice under all game constraints in one solve.
 *
 * Bench insurance approximation: each bench player contributes
 * playerEV × BENCH_EV_FACTOR to the objective, representing the expected value
 * of the auto-sub triggering for that position slot.
 */

import type { PlayerEV } from "./scoring.js";

// Bench EV coefficient: P(≥1 same-position starter plays 0 min) × round coverage
const BENCH_EV_FACTOR = 0.35;
// Extra captain EV: the captain earns +1× their EV on top of their starter contribution
const CAPTAIN_EXTRA = 1.0;

// ── Public types ───────────────────────────────────────────────────────────────

export interface OptimizeInput {
  /** Player pool with pre-computed EV values (from compute_squad_ev). */
  candidatePool: PlayerEV[];
  /** Parallel array of nation team IDs for each entry in candidatePool. */
  nationIds: number[];
  /** Player IDs in the current squad (used for transfer-count constraint). */
  currentSquadIds: number[];
  /** Total squad budget in M (from get_game_rules budgetM). */
  budgetM: number;
  /** Max players per national team (from get_game_rules maxPerNationalTeam). */
  maxPerNationalTeam: number;
  /** Max new players allowed in (from get_game_rules transfersPerRound). */
  transfersAllowed: number;
}

export interface OptimizeResult {
  /** All 15 selected player IDs (starters + bench). */
  squadIds: number[];
  /** 11 starting XI player IDs. */
  starterIds: number[];
  /** 4 bench player IDs. */
  benchIds: number[];
  /** Captain player ID. */
  captainId: number;
  /** Vice-captain player ID (highest-EV starter after captain). */
  viceCaptainId: number;
  /** MILP objective value (XI EV + bench insurance EV + captain bonus). */
  totalEV: number;
  /** Player IDs to bring in (not in currentSquadIds). */
  transfersIn: number[];
  /** Player IDs to sell (in currentSquadIds but not in new squad). */
  transfersOut: number[];
  /** Formation string e.g. "4-3-3". */
  formation: string;
  /** True when MILP found an Optimal solution. */
  optimal: boolean;
  /** Reason when not optimal. */
  infeasibilityNote?: string;
}

// ── LP string builder ─────────────────────────────────────────────────────────

function buildLpString(
  pool: PlayerEV[],
  nationIds: number[],
  currentSet: Set<number>,
  budgetM: number,
  maxPerNationalTeam: number,
  transfersAllowed: number
): string {
  const n = pool.length;
  const lines: string[] = [];

  // Position index groups
  const byPos: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (let i = 0; i < n; i++) {
    (byPos[pool[i].position] ?? []).push(i);
  }

  // ── Objective ──────────────────────────────────────────────────────────────
  lines.push("Maximize");
  const objParts: string[] = [];
  for (let i = 0; i < n; i++) {
    const ev = pool[i].totalEV;
    if (Math.abs(ev) < 0.0001) continue;
    objParts.push(`${ev.toFixed(4)} s${i}`);
    objParts.push(`${(ev * BENCH_EV_FACTOR).toFixed(4)} b${i}`);
    objParts.push(`${(ev * CAPTAIN_EXTRA).toFixed(4)} c${i}`);
  }
  lines.push("  obj: " + (objParts.length > 0 ? objParts.join(" + ") : "0 s0"));

  // ── Constraints ───────────────────────────────────────────────────────────
  lines.push("Subject To");

  const allS = Array.from({ length: n }, (_, i) => `s${i}`);
  const allB = Array.from({ length: n }, (_, i) => `b${i}`);

  // 11 starters, 4 bench
  lines.push("  starters: " + allS.join(" + ") + " = 11");
  lines.push("  bench_total: " + allB.join(" + ") + " = 4");

  // No player can be both starter and bench
  for (let i = 0; i < n; i++) {
    lines.push(`  excl${i}: s${i} + b${i} <= 1`);
  }

  // GK: exactly 1 starter, 1 bench
  const gkS = byPos[1].map(i => `s${i}`).join(" + ");
  const gkB = byPos[1].map(i => `b${i}`).join(" + ");
  if (gkS) { lines.push("  gk_start: " + gkS + " = 1"); lines.push("  gk_bench: " + gkB + " = 1"); }

  // DEF: 3-5 starters, 1 bench
  const defS = byPos[2].map(i => `s${i}`).join(" + ");
  const defB = byPos[2].map(i => `b${i}`).join(" + ");
  if (defS) {
    lines.push("  def_min: " + defS + " >= 3");
    lines.push("  def_max: " + defS + " <= 5");
    lines.push("  def_bench: " + defB + " = 1");
  }

  // MID: 3-5 starters, 1 bench
  const midS = byPos[3].map(i => `s${i}`).join(" + ");
  const midB = byPos[3].map(i => `b${i}`).join(" + ");
  if (midS) {
    lines.push("  mid_min: " + midS + " >= 3");
    lines.push("  mid_max: " + midS + " <= 5");
    lines.push("  mid_bench: " + midB + " = 1");
  }

  // FWD: 1-3 starters, 1 bench
  const fwdS = byPos[4].map(i => `s${i}`).join(" + ");
  const fwdB = byPos[4].map(i => `b${i}`).join(" + ");
  if (fwdS) {
    lines.push("  fwd_min: " + fwdS + " >= 1");
    lines.push("  fwd_max: " + fwdS + " <= 3");
    lines.push("  fwd_bench: " + fwdB + " = 1");
  }

  // Budget: Σ price_i × (s_i + b_i) ≤ budgetM
  const budgetTerms = Array.from({ length: n }, (_, i) => {
    const p = pool[i].price.toFixed(1);
    return `${p} s${i} + ${p} b${i}`;
  });
  lines.push("  budget: " + budgetTerms.join(" + ") + " <= " + budgetM);

  // Nation caps
  const nationGroups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const nid = nationIds[i];
    if (!nationGroups.has(nid)) nationGroups.set(nid, []);
    nationGroups.get(nid)!.push(i);
  }
  let nc = 0;
  for (const indices of nationGroups.values()) {
    if (indices.length <= maxPerNationalTeam) continue;
    const terms = indices.flatMap(i => [`s${i}`, `b${i}`]);
    lines.push(`  nation${nc++}: ${terms.join(" + ")} <= ${maxPerNationalTeam}`);
  }

  // Exactly 1 captain; captain must be a starter
  lines.push("  cap_total: " + Array.from({ length: n }, (_, i) => `c${i}`).join(" + ") + " = 1");
  for (let i = 0; i < n; i++) {
    lines.push(`  capst${i}: c${i} - s${i} <= 0`);
  }

  // Transfer constraint: new players in ≤ transfersAllowed
  const newIdx = Array.from({ length: n }, (_, i) => i).filter(i => !currentSet.has(pool[i].playerId));
  if (newIdx.length > 0 && transfersAllowed < newIdx.length) {
    const terms = newIdx.flatMap(i => [`s${i}`, `b${i}`]);
    lines.push("  transfers: " + terms.join(" + ") + " <= " + transfersAllowed);
  }

  // ── Bounds ────────────────────────────────────────────────────────────────
  lines.push("Bounds");
  for (let i = 0; i < n; i++) {
    lines.push(`  0 <= s${i} <= 1`);
    lines.push(`  0 <= b${i} <= 1`);
    lines.push(`  0 <= c${i} <= 1`);
  }

  // ── Integer variables ─────────────────────────────────────────────────────
  lines.push("Generals");
  const genVars: string[] = [];
  for (let i = 0; i < n; i++) genVars.push(`s${i}`, `b${i}`, `c${i}`);
  lines.push("  " + genVars.join(" "));

  lines.push("End");
  return lines.join("\n");
}

// ── Solver loader (lazy — avoids startup crash if highs-js not installed) ────

let _highs: any = null;
async function getHighs(): Promise<any> {
  if (_highs) return _highs;
  let loader: any;
  try {
    const mod = await import("highs");
    loader = mod.default ?? mod;
  } catch {
    throw new Error(
      "highs-js not available. Run: cd mcp-server && npm install  (or npm install highs-js)"
    );
  }
  _highs = await loader();
  return _highs;
}

// ── Main optimiser ────────────────────────────────────────────────────────────

export async function optimizeSquad(input: OptimizeInput): Promise<OptimizeResult> {
  const { candidatePool, nationIds, currentSquadIds, budgetM, maxPerNationalTeam, transfersAllowed } = input;

  const currentSet = new Set(currentSquadIds);
  const lpStr = buildLpString(candidatePool, nationIds, currentSet, budgetM, maxPerNationalTeam, transfersAllowed);

  let highs: any;
  try {
    highs = await getHighs();
  } catch (err) {
    return noSolution(`${err}`);
  }

  let raw: any;
  try {
    raw = highs.solve(lpStr);
  } catch (err) {
    return noSolution(`Solver threw: ${err}`);
  }

  if (raw?.Status !== "Optimal") {
    return noSolution(`MILP status: ${raw?.Status ?? "unknown"}`);
  }

  const cols = (raw.Columns as Record<string, { Primal: number }>) ?? {};
  const n = candidatePool.length;
  const starterIds: number[] = [];
  const benchIds: number[] = [];
  let captainId = 0;

  for (let i = 0; i < n; i++) {
    if (Math.round(cols[`s${i}`]?.Primal ?? 0) === 1) starterIds.push(candidatePool[i].playerId);
    if (Math.round(cols[`b${i}`]?.Primal ?? 0) === 1) benchIds.push(candidatePool[i].playerId);
    if (Math.round(cols[`c${i}`]?.Primal ?? 0) === 1) captainId = candidatePool[i].playerId;
  }

  const squadIds = [...starterIds, ...benchIds];
  const newSquadSet = new Set(squadIds);

  // Vice-captain: highest-EV starter that isn't the captain
  const starterEvs = candidatePool
    .filter(p => starterIds.includes(p.playerId) && p.playerId !== captainId)
    .sort((a, b) => b.totalEV - a.totalEV);
  const viceCaptainId = starterEvs[0]?.playerId ?? 0;

  // Formation
  const starters = candidatePool.filter(p => starterIds.includes(p.playerId));
  const def = starters.filter(p => p.position === 2).length;
  const mid = starters.filter(p => p.position === 3).length;
  const fwd = starters.filter(p => p.position === 4).length;
  const formation = `${def}-${mid}-${fwd}`;

  const transfersIn = squadIds.filter(id => !currentSet.has(id));
  const transfersOut = currentSquadIds.filter(id => !newSquadSet.has(id));

  return {
    squadIds,
    starterIds,
    benchIds,
    captainId,
    viceCaptainId,
    totalEV: +((raw.ObjectiveValue as number) ?? 0).toFixed(3),
    transfersIn,
    transfersOut,
    formation,
    optimal: true,
  };
}

function noSolution(note: string): OptimizeResult {
  return {
    squadIds: [], starterIds: [], benchIds: [],
    captainId: 0, viceCaptainId: 0,
    totalEV: 0, transfersIn: [], transfersOut: [],
    formation: "4-3-3", optimal: false, infeasibilityNote: note,
  };
}
