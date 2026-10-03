# Scoring — GreenScore methodology

Composite score 0–100 = Σ weightᵢ × subscoreᵢ, with weights configurable by admin
(default Energy 30 / Water 25 / Waste 25 / Transport 20; must sum to 100 — validated in `DEFAULT_WEIGHTS`/`validateWeights`).

## 1. Normalisation (comparability)
- Energy: kWh ÷ (students + staff) ÷ month
- Water: litres ÷ (students + staff) ÷ days in month (~30)
- Waste: kg ÷ population ÷ day, plus diversion rate % (dry + plastic + e-waste are treated as diverted streams)
- Transport: mean commute CO₂e ÷ population ÷ month, plus % sustainable-mode share (walk/cycle/bus/EV)
Campus population = `population_students + population_staff`. Hostel residents are assumed to be a
subset of the student body (they are included in the student count AND in `residents_hostel`; if your
institution counts them separately, adjust the population formula in `src/lib/scoring/compute.ts`).

## 2. Normalised metric → 0–100 sub-score
Linear interpolation between a **poor** and **excellent** benchmark
(`src/lib/scoring/config.ts → BENCHMARKS`), capped at 0 and 100. Each benchmark object has a
`source` field — **all values are PLACEHOLDERS and must be verified against the current official
green-campus rubric / state norms before use for accreditation.**

| Metric | Poor | Excellent | Direction |
|---|---|---|---|
| kWh/person/month | 150 | 60 | lower better |
| L/person/day | 200 | 80 | lower better |
| kg/person/day | 1.2 | 0.4 | lower better |
| waste diversion % | 20 | 70 | higher better |
| commute CO₂e kg/person/month | 90 | 25 | lower better |
| sustainable mode % | 25 | 70 | higher better |

## 3. Improvement component
`improvementDelta = totalScore − median(own previous totalScore values)` — campuses improving from a
weak baseline are rewarded, not just campuses already near the top.

## 4. CO₂e
`Σ value × EmissionFactor` per category. Factors are editable rows tagged with `source` and
`validFrom`; electricity uses the CEA v18 weighted-average grid factor (~0.82 kg/kWh, 2023) —
**re-verify the latest published value**. Transport CO₂e is summed from CommuteLog rows by mode.

## 5. Missing data
Never treated as zero. Missing domains reduce the reported coverage (%), `incomplete` is flagged
when coverage < 80%, and the total is re-normalised over the domains actually present — the
data-quality statement in reports makes this explicit.

## 6. Seasonality
Energy/water are compared MoM and YoY; Mar–Jun cooling-load spikes are expected to be seasonal —
interpret deltas with that context (the benchmark table is intentionally weather-agnostic, so YoY
comparison of the same month is the meaningful seasonal baseline).

## 7. Reproducibility
Every `ScoreSnapshot` stores: normalised metrics, CO₂e by category, weights, `factorsVersion`
(hash of all active factor rows) and `formulaVersion` (`greenscore-1.0.0`). Re-running
`src/lib/scoring/compute.ts` on the same readings reproduces the same snapshots.

Unit-tested in `tests/scoring.test.ts` (caps, interpolation, zero population, missing category,
outlier/improvement edge cases).
