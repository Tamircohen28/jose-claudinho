/**
 * MILP squad optimizer for Fantasy World Cup 2026.
 *
 * Formulates squad selection as a 0/1 mixed-integer linear program:
 *   x_i ∈ {0,1} — player i in the 15-man squad
 *   s_i ∈ {0,1} — player i in the starting XI (s_i ≤ x_i)
 *   c_i ∈ {0,1} — player i is captain (c_i ≤ s_i, Σc_i = 1)
 *
 * Objective: maximize Σ(EV_i × s_i) + Σ(EV_i × c_i)
 * (captain adds extra +1× EV on top of the starter contribution)
 *
 * Solver: HiGHS (MIT, industrial-grade, WASM) via LP string format.
 * API: const highs = await HiGHSFactory(); highs.solve(lpString)
 */

import type { Highs } from "highs";
import type { StageKey } from "./rules.js";
import { SQUAD, STAGES } from "./rules.js";

// HiGHS is loaded dynamically; cached so WASM loads only once.
let _highsPromise: Promise<Highs> | null = null;

async function getHighs(): Promise<Highs> {
  if (!_highsPromise) {
    _highsPromise = (async () => {
      const mod = await import("highs");
      const HiGHSFactory = mod.default ?? mod;
      return (HiGHSFactory as () => Promise<Highs>)();
    })();
  }
  return _highsPromise;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PlayerInput {
  playerId: number;
  playerName: string;
  /** 1=GK 2=DEF 3=MID 4=FWD */
  position: number;
  /** Price in millions */
  priceM: number;
  /** Expected fantasy points for the upcoming round(s) */
  ev: number;
  /** Unique nation identifier (Sport5 nationTeamId or name string) */
  nationKey: string | number;
  /** Force this player into the squad */
  locked?: boolean;
  /** Exclude from consideration */
  excluded?: boolean;
}

export interface OptimizedSquad {
  squadPlayerIds: number[];
  starterPlayerIds: number[];
  captainId: number;
  /** Total EV of starters including captain bonus */
  totalStarterEV: number;
  totalBenchEV: number;
  budgetRemainingM: number;
  feasible: boolean;
  message?: string;
  players: Array<PlayerInput & { inSquad: boolean; isStarter: boolean; isCaptain: boolean }>;
}

const POS: Record<number, string> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

// ─── LP string generation ─────────────────────────────────────────────────────

/** Sanitize a string so it's a valid LP identifier (alphanumerics + underscore). */
function lpId(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, "_");
}

/** Format a number for LP: avoid scientific notation, keep reasonable precision. */
function fmt(n: number): string {
  return n.toFixed(6);
}

/** Build an LP term like "+1.5 x123" or "-1.0 s456". */
function term(coef: number, varName: string): string {
  if (coef >= 0) return `+ ${fmt(coef)} ${varName}`;
  return `- ${fmt(Math.abs(coef))} ${varName}`;
}

/** Build a linear expression string from a coefficient map. */
function expr(coefs: Record<string, number>): string {
  const entries = Object.entries(coefs);
  if (!entries.length) return "0";
  const [first, ...rest] = entries;
  const head = `${fmt(first[1])} ${first[0]}`;
  const tail = rest.map(([v, c]) => term(c, v)).join(" ");
  return tail ? `${head} ${tail}` : head;
}

/**
 * Build LP format string for the squad optimization problem.
 * HiGHS accepts standard LP format: Maximize / Subject To / Bounds / Binary / End
 */
function buildLP(
  pool: PlayerInput[],
  budgetM: number,
  maxPerNation: number,
  robustFactor: number
): string {
  const xv = (id: number) => `x${id}`;
  const sv = (id: number) => `s${id}`;
  const cv = (id: number) => `c${id}`;

  const lines: string[] = [];

  // ── Objective ────────────────────────────────────────────────────────────────
  lines.push("Maximize");
  const objTerms: string[] = [];
  for (const p of pool) {
    const ev = p.ev * robustFactor;
    if (ev !== 0) {
      objTerms.push(`${fmt(ev)} ${sv(p.playerId)}`);
      objTerms.push(`${fmt(ev)} ${cv(p.playerId)}`);
    }
  }
  lines.push(` obj: ${objTerms.join(" + ") || "0"}`);

  // ── Constraints ──────────────────────────────────────────────────────────────
  lines.push("Subject To");

  // Total squad = 15, starters = 11, captain = 1
  lines.push(` total_squad: ${pool.map(p => xv(p.playerId)).join(" + ")} = 15`);
  lines.push(` total_start: ${pool.map(p => sv(p.playerId)).join(" + ")} = 11`);
  lines.push(` total_cap: ${pool.map(p => cv(p.playerId)).join(" + ")} = 1`);

  // Budget
  const budgetTerms = pool.map(p => `${fmt(p.priceM)} ${xv(p.playerId)}`).join(" + ");
  lines.push(` budget: ${budgetTerms} <= ${fmt(budgetM)}`);

  // Formation (starters per position) + bench composition
  for (const [pos, posName] of Object.entries(POS)) {
    const posPlayers = pool.filter(p => p.position === Number(pos));
    if (!posPlayers.length) continue;

    const sqRule = SQUAD.startingXI[posName as "GK" | "DEF" | "MID" | "FWD"];
    const sIds = posPlayers.map(p => sv(p.playerId)).join(" + ");
    if (sqRule.min === sqRule.max) {
      lines.push(` start_${posName}: ${sIds} = ${sqRule.min}`);
    } else {
      lines.push(` start_${posName}_lb: ${sIds} >= ${sqRule.min}`);
      lines.push(` start_${posName}_ub: ${sIds} <= ${sqRule.max}`);
    }

    // Bench: squad_pos - start_pos = bench_count
    const benchCount = SQUAD.bench_composition[posName as "GK" | "DEF" | "MID" | "FWD"];
    const xIds = posPlayers.map(p => xv(p.playerId)).join(" + ");
    // Σ x_i - Σ s_i = benchCount
    const benchTerms = [
      ...posPlayers.map(p => `${xv(p.playerId)}`),
      ...posPlayers.map(p => `- ${sv(p.playerId)}`),
    ].join(" + ").replace(/\+ -/g, "-");
    lines.push(` bench_${posName}: ${xIds} - (${sIds}) = ${benchCount}`);
    // LP format doesn't support parentheses — rewrite inline
    lines[lines.length - 1] =
      ` bench_${posName}: ${posPlayers.map(p => xv(p.playerId)).join(" + ")} - ${posPlayers.map(p => sv(p.playerId)).join(" - ")} = ${benchCount}`;
  }

  // s_i ≤ x_i and c_i ≤ s_i (per player)
  for (const p of pool) {
    const id = p.playerId;
    lines.push(` sx${id}: ${sv(id)} - ${xv(id)} <= 0`);
    lines.push(` cs${id}: ${cv(id)} - ${sv(id)} <= 0`);
  }

  // National team caps
  const byNation = new Map<string, number[]>();
  for (const p of pool) {
    const k = String(p.nationKey);
    if (!byNation.has(k)) byNation.set(k, []);
    byNation.get(k)!.push(p.playerId);
  }
  for (const [nat, ids] of byNation) {
    const natId = lpId(`nation_${nat}`);
    lines.push(` ${natId}: ${ids.map(id => xv(id)).join(" + ")} <= ${maxPerNation}`);
  }

  // Locked players: x_i = 1
  for (const p of pool.filter(q => q.locked)) {
    lines.push(` lock${p.playerId}: ${xv(p.playerId)} = 1`);
  }

  // ── Binary variables ──────────────────────────────────────────────────────────
  lines.push("Binary");
  const binaryVars: string[] = [];
  for (const p of pool) {
    binaryVars.push(xv(p.playerId), sv(p.playerId), cv(p.playerId));
  }
  lines.push(` ${binaryVars.join(" ")}`);

  lines.push("End");
  return lines.join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Optimize the squad using HiGHS MILP.
 *
 * Bench composition rule (from SQUAD in rules.ts):
 *   bench = { GK:1, DEF:1, MID:1, FWD:1 }
 * → squad_GK = 2, squad_DEF ∈ [4,6], squad_MID ∈ [4,6], squad_FWD ∈ [2,4]
 */
export async function optimizeSquad(
  players: PlayerInput[],
  budgetM: number,
  stageKey: StageKey = "group",
  options: { robust?: boolean } = {}
): Promise<OptimizedSquad> {
  const pool = players.filter(p => !p.excluded && p.ev >= 0 && p.priceM > 0);

  if (pool.length < 15) {
    return infeasible(pool, budgetM, `Pool too small: ${pool.length} < 15`);
  }

  const stage = STAGES[stageKey];
  const maxPerNation = stage.maxPerNationalTeam;
  const robustFactor = options.robust ? 0.8 : 1.0;

  const xv = (id: number) => `x${id}`;
  const sv = (id: number) => `s${id}`;
  const cv = (id: number) => `c${id}`;

  const highs = await getHighs();
  const lpString = buildLP(pool, budgetM, maxPerNation, robustFactor);

  let result: ReturnType<Highs["solve"]>;
  try {
    result = highs.solve(lpString);
  } catch {
    return greedyFallback(pool, budgetM, maxPerNation);
  }

  if (result.Status !== "Optimal" && result.Status !== "Bound on objective reached") {
    return greedyFallback(pool, budgetM, maxPerNation);
  }

  // Extract solution
  const inSquad = new Set<number>();
  const inStart = new Set<number>();
  let captainId = 0;
  for (const p of pool) {
    const id = p.playerId;
    if ((result.Columns[xv(id)]?.Primal ?? 0) > 0.5) inSquad.add(id);
    if ((result.Columns[sv(id)]?.Primal ?? 0) > 0.5) inStart.add(id);
    if ((result.Columns[cv(id)]?.Primal ?? 0) > 0.5) captainId = id;
  }

  // Fallback captain: highest-EV starter if MILP returned no captain
  if (!captainId) {
    const startersSorted = pool.filter(p => inStart.has(p.playerId)).sort((a, b) => b.ev - a.ev);
    captainId = startersSorted[0]?.playerId ?? 0;
  }

  const squadPlayers = pool.filter(p => inSquad.has(p.playerId));
  const starterPlayers = pool.filter(p => inStart.has(p.playerId));
  const benchPlayers = squadPlayers.filter(p => !inStart.has(p.playerId));
  const spentM = squadPlayers.reduce((s, p) => s + p.priceM, 0);
  const captainBonus = pool.find(p => p.playerId === captainId)?.ev ?? 0;

  return {
    squadPlayerIds: squadPlayers.map(p => p.playerId),
    starterPlayerIds: starterPlayers.map(p => p.playerId),
    captainId,
    totalStarterEV: +(starterPlayers.reduce((s, p) => s + p.ev, 0) + captainBonus).toFixed(3),
    totalBenchEV: +benchPlayers.reduce((s, p) => s + p.ev, 0).toFixed(3),
    budgetRemainingM: +(budgetM - spentM).toFixed(1),
    feasible: true,
    players: pool.map(p => ({
      ...p,
      inSquad: inSquad.has(p.playerId),
      isStarter: inStart.has(p.playerId),
      isCaptain: p.playerId === captainId,
    })),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function infeasible(pool: PlayerInput[], budgetM: number, message: string): OptimizedSquad {
  return {
    squadPlayerIds: [], starterPlayerIds: [], captainId: 0,
    totalStarterEV: 0, totalBenchEV: 0, budgetRemainingM: budgetM,
    feasible: false, message,
    players: pool.map(p => ({ ...p, inSquad: false, isStarter: false, isCaptain: false })),
  };
}

/**
 * Greedy position-by-position fallback when MILP is infeasible.
 */
function greedyFallback(
  pool: PlayerInput[],
  budgetM: number,
  maxPerNation: number
): OptimizedSquad {
  const targets: Record<number, number> = { 1: 2, 2: 4, 3: 4, 4: 3 };
  const squad: PlayerInput[] = [];
  const nationCount: Record<string, number> = {};
  let spent = 0;

  const tryAdd = (p: PlayerInput): boolean => {
    const nat = String(p.nationKey);
    if ((nationCount[nat] ?? 0) >= maxPerNation) return false;
    if (spent + p.priceM > budgetM) return false;
    squad.push(p);
    nationCount[nat] = (nationCount[nat] ?? 0) + 1;
    spent += p.priceM;
    return true;
  };

  for (const pos of [1, 2, 3, 4]) {
    const needed = targets[pos];
    const sorted = pool.filter(p => p.position === pos).sort((a, b) => b.ev - a.ev);
    let added = 0;
    for (const p of sorted) {
      if (added >= needed) break;
      if (tryAdd(p)) added++;
    }
  }

  const byPos = (pos: number) => squad.filter(p => p.position === pos).sort((a, b) => b.ev - a.ev);
  const starters: PlayerInput[] = [
    ...byPos(1).slice(0, 1),
    ...byPos(2).slice(0, 3),
    ...byPos(3).slice(0, 3),
    ...byPos(4).slice(0, 1),
  ];
  const starterSet = new Set(starters.map(p => p.playerId));
  const extras = squad.filter(p => !starterSet.has(p.playerId)).sort((a, b) => b.ev - a.ev);
  starters.push(...extras.slice(0, 11 - starters.length));

  const starterIds = new Set(starters.map(p => p.playerId));
  const captainId = starters.sort((a, b) => b.ev - a.ev)[0]?.playerId ?? 0;
  const benchPlayers = squad.filter(p => !starterIds.has(p.playerId));
  const captainBonus = squad.find(p => p.playerId === captainId)?.ev ?? 0;

  return {
    squadPlayerIds: squad.map(p => p.playerId),
    starterPlayerIds: [...starterIds],
    captainId,
    totalStarterEV: +(starters.reduce((s, p) => s + p.ev, 0) + captainBonus).toFixed(3),
    totalBenchEV: +benchPlayers.reduce((s, p) => s + p.ev, 0).toFixed(3),
    budgetRemainingM: +(budgetM - spent).toFixed(1),
    feasible: true,
    message: "Greedy fallback used (MILP infeasible for this pool)",
    players: squad.map(p => ({
      ...p,
      inSquad: true,
      isStarter: starterIds.has(p.playerId),
      isCaptain: p.playerId === captainId,
    })),
  };
}
