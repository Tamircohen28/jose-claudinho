# Example — full private league round report (כצים)

This is the **target output contract** for `league-round-report` and the combined
sections in `league-round-utilization` + `league-watchlist`.

**Semantics:** `played + upcoming === total` for every normal row. `total` is the
actual squad size from the tool (≤15). Insights use `{played}/{total}` — never a
hardcoded `/15` unless `total` is 15.

```markdown
# כצים — ניתוח סיבוב 1 (שלב הבתים)

**סיכום מהיר:** 11 קבוצות · ממוצע 6.2 שחקנים ששיחקו · המשחק החם: 🇪🇸 ספרד נגד 🇨🇻 כף ורדה (8 שחקני ליגה)

## 📊 שחקנים ששיחקו vs עדיין לא

| קבוצה | ✅ שיחקו | ⏳ עדיין לא | סה״כ |
|--------|---------|------------|------|
| Fureidis F.C | 7 | 8 | 15 |
| הלגיונרים | 6 | 9 | 15 |
| … | … | … | … |
| שלונג סיטי | — | — | אין שחקנים |

**תובנות:** מוביל בקצב: Fureidis F.C (7/15) · הכי מאחור: אפרוחי באר שבע (2/15) · ממוצע: 6.2 · 👤 הקבוצה שלך: AC unit (4/15)

---

## 🎯 משחקים מעניינים — שחקני ליגה במשחקים הקרובים

כל השעות לפי שעון ישראל (UTC+3).

### 🇪🇸 ספרד נגד 🇨🇻 כף ורדה ⭐

**יום ב׳ 15.06 | 19:00**

- **ספרד:**
  - Fureidis F.C — Nico Williams, Lamine Yamal
  - AC unit — Lamine Yamal
  - …

### 🇬🇧 אנגליה נגד 🇭🇷 קרואטיה

**יום ד׳ 17.06 | 23:00**

- **אנגליה:**
  - Fureidis F.C — Harry Kane
  - …

---

## 💡 סיכום — המשחקים הכי «צפייה»

| משחק | למה |
|------|-----|
| ⭐ **🇪🇸 ספרד נגד 🇨🇻 כף ורדה** | 8 שחקני ליגה |
| ⭐ **🇵🇹 פורטוגל נגד 🇬🇭 גאנה** | 11 הופעות מ-8 קבוצות |
| ⭐ **🇦🇷 ארגנטינה נגד 🇸🇦 סעודיה** | 9 הופעות |

💡 **הערה:** הספירה על כל שחקני הסגל (`total` לכל קבוצה, עד 15). במהלך סיבוב פתוח, נקודות מתעדכנות אחרי כל משחק נבחרת.
```

## Summary table rule

Column **משחק** must use the **full match label** from `topGames.label` or Hebrew
sides (`🇪🇸 ספרד נגד 🇨🇻 כף ורדה`) — never a single-nation shorthand like `ספרד` alone.

## Empty watchlist state

```markdown
אין משחקים מעניינים נותרים בסיבוב זה — כל המשחקים כבר שוחקו, או שאין שחקני ליגה במשחקים הקרובים.
```
