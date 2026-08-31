# AI search rebuild — design

**Goal:** any question a QF executive would reasonably ask returns the right indicators, risk-ordered — because the system resolves language onto the sheet's real vocabulary, not because someone anticipated the phrasing.

---

## The failure, precisely

`show me all DIFI indicators under social progress which are at risk` returns 0.

Traced through the current `interpret()`:

1. `at risk` is consumed by a status phrase → `status:atRisk` ✔
2. `social progress` matches a theme → `theme:Social Progress` ✔
3. `DIFI` — **the vocabulary loop only scans categories, themes and `proposedEntity`**, and matching is `\bDIFI\b` against a lowercased query, so it does resolve → `entity:DIFI` ✔
4. Everything left — `show me all indicators under which are` — is stripped only against a 19-word filler list. `show`, `me`, `all`, `indicators`, `which`, `are` are in it. **`under` is not.**
5. `under` survives as `residue`, which `chipsToFilters` assigns to `f.q`, and `matches()` requires every word of `f.q` to appear in the haystack.

No indicator contains the word "under". One preposition empties the result set.

This is the same class of bug as the earlier `"related to well"` chip: **an unrecognised token becomes a hard requirement.** Lengthening the filler list is not a fix — the next question will use a word that isn't on it.

---

## Approaches considered

### Rejected — extend the phrase scanner

Add `under`, `within`, `across`, `from`, `belonging to`… to the stopword list and more regexes to the status matcher.

Rejected because it fails the actual test in §2: *a question nobody anticipated still works.* Every unanticipated word is a new zero-result bug, and the failure mode is silent and total. It is also unfalsifiable — you cannot enumerate the English a CEO might use.

### Rejected — embeddings / LLM query understanding

Send the query to a model, get back structured filters or a ranked set.

Genuinely better at arbitrary phrasing, and rejected anyway:

- **No backend.** This ships as static assets behind a Cloudflare Pages password gate. An API key in a client bundle is a key you have published.
- **Non-determinism on a CEO's dashboard.** The platform's entire stance is that every number shows its arithmetic. "The model decided" is not a reason a figure can be defended in a board meeting, and the same question could return different sets on two days.
- **Not testable.** The acceptance criteria are exact counts. A stochastic retriever cannot be asserted against "exactly these 10 rows".

Worth revisiting only if a QF-hosted inference endpoint appears, and even then as a *ranking* layer over a deterministic candidate set, never as the filter itself.

### Chosen — vocabulary-first resolution

Build a lexicon from the sheet at module load — every real entity, theme, category (both levels), framework, status label with synonyms, and year. Resolve the query against it. Anything that resolves becomes a filter; **anything that does not becomes free text, which the fallback ladder is allowed to drop.**

The inversion that matters: the old parser asked *"is this word one I know?"* and made everything else a requirement. This one asks *"what in the sheet does this phrase name?"* and requires nothing it cannot name.

`under` resolves to nothing, so it is never a filter. It cannot empty anything.

---

## Architecture

Three new modules, each independently testable, none knowing about React.

```
lexicon.ts   the sheet's vocabulary, indexed      (what words exist)
query.ts     phrase → resolutions → clauses       (what did they ask)
search.ts    clauses → rows, with a relax ladder  (what can we honestly answer)
```

`dash.ts` keeps its existing export names and delegates, so no surface changes its imports.

### lexicon.ts

One `LexEntry[]`, built once:

```
{ facet: 'entity' | 'theme' | 'cat' | 'framework' | 'status' | 'dash' | 'year',
  value: string,          // the real sheet value, or the DashStatus key
  label: string,          // what a chip shows
  terms: string[] }       // lowercased surface forms that resolve to it
```

Status entries carry synonyms (`struggling`, `behind`, `failing` → `atRisk`). Everything else takes its terms from the sheet itself, so the lexicon cannot drift from the data.

Matching is **case-insensitive, trimmed, and prefix-partial on a word boundary** — `difi`→DIFI, `qatariz`→Qatarization, `sustain`→Sustainability.

### query.ts

1. Lowercase, strip punctuation.
2. Remove filler.
3. Walk the remaining tokens, longest n-gram first (up to 4 words). For each span, collect **every** lexicon entry it matches.
4. A span that matched becomes one **clause** — its entries OR together, even across facets. `education` → `cat:Education OR theme:Progressive Education`, one clause, one chip.
5. Spans that matched nothing accumulate as free text.
6. Deduplicate clauses by span, so one concept never produces two filters.

Clauses AND. Values within a clause OR. Free text is separate and soft.

### search.ts

```
run(clauses + freeText)              → if rows, done
drop freeText, retry                 → "no indicator matches 'xyzzy', so that word was set aside"
loosen clauses to text, retry        → "no exact match, so the filters were loosened"
free text across every field         → "showing a plain text search"
otherwise empty                      → names what was searched for
```

Relaxing may only *recover* a narrowed search, never replace one: a query that is nothing but an unknown word lands on the empty state rather than returning all 240. `applied` — the filters that actually ran — is what the chips render, never the attempt.

Results sort by the shared `severityOf`. The AI line is generated from the applied filters and the result set.

---

## The data question (spec §8), measured

All ten named DIFI indicators hold a literal `0` in their Q1 cell and carry a real target. The platform splits them:

| Indicator | Q1 | Prior years | Rate/score | Reads as |
|---|---|---|---|---|
| Downloads, Grants, Grant Value, Capacity Building | 0 | no | no | **At Risk** |
| Grants and Funding, Sponsorship Revenue, Research Publications | 0 | **yes** | no | Not reported |
| Summit NPS, Knowledge Dissemination, Collaboration Opportunities | 0 | no | **yes** | Not reported |

So the query returns **4**, not 10 — and the difference is entirely the absence rule the At Risk brief required: *"An indicator with no reading is Not reported, never At Risk."* A zero with closed years behind it is that row going quiet; a zero on an NPS is an empty cell.

Spec §9.1 expects 10; spec §8 says classify per the current rule, which gives 4. **These contradict.** This design implements the current rule, surfaces the ambiguity in the AI line, and raises the question rather than silently choosing. Making it 10 is a one-line change to `q1IsAbsent` — and it would also reclassify the 15 QF Human Capital rows the At Risk brief specifically protected.

---

## Testing

Model-layer vitest, since these are pure functions with exact expected answers:

- every query in §7 returns > 0 rows
- no clause is ever built from a token absent from the lexicon
- one concept produces one clause
- `under`, `show me`, `all`, `which are` never reach the filters
- the ladder never turns a one-term query into all 240
- results are severity-ordered
