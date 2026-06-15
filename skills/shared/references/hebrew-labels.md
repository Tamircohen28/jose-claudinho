# Hebrew labels — round utilization output

Use these consistently across all league/team round skills.

## Tournament stage (`stage` → Hebrew header label)

| `stage` | Hebrew label |
|---------|--------------|
| `group` | שלב הבתים |
| `r32` | שמינית הגמר (32) |
| `r16` | שמינית הגמר |
| `qf` | רבע גמר |
| `sf` | חצי גמר |
| `final` | גמר |

Default when unknown: infer from `roundId` + fixtures; if still unclear, ask the user.

## Player status

| State | Hebrew | Emoji |
|-------|--------|-------|
| Nation match finished | שיחק | ✅ |
| Nation match not yet played | עדיין לא / ממתין | ⏳ |
| No squad / fetch error | אין שחקנים / שגיאה | — |

## Squad role

| Field | Hebrew |
|-------|--------|
| Starter (`isStarter: true`) | פתיחה |
| Bench (`isStarter: false`) | ספסל |
| Captain (when known) | (C) after name |
| Vice-captain (when known) | (VC) after name |

## Positions

| Code | Hebrew |
|------|--------|
| GK | שוער |
| DEF | בלם |
| MID | קשר |
| FWD | חלוץ |

## Time display

- All kickoffs: **Israel time (UTC+3)**.
- Use tool fields `dateIsrael` and `timeIsrael` when present.
- Header line: `כל השעות לפי שעון ישראל (UTC+3).`

## Match line formatting

Prefer Hebrew nation names from `nationNameHe` + `nationFlag`:

```
🇪🇸 ספרד נגד 🇧🇷 ברזיל
```

When only English API names exist (`homeTeam`/`awayTeam`), keep English but add flags when
`nationFlag` is available on the involved side.

## High-interest game marker

Mark with ⭐ when **either**:

- `appearanceCount >= 6`, or
- the game is in the top 3 by `appearanceCount` for the league.
