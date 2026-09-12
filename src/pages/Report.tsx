import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, estimate1RM } from "../db";
import type { Exercise, Session, SetEntry } from "../types";
import { addDaysISO, daysBetween, formatDate, isSaturday, todayISO } from "../utils";
import Sparkline from "../components/Sparkline";

type RangePreset = "4w" | "8w" | "12w" | "all";

const RANGE_DAYS: Record<Exclude<RangePreset, "all">, number> = {
  "4w": 28,
  "8w": 56,
  "12w": 84,
};

const RANGE_LABEL: Record<RangePreset, string> = {
  "4w": "Last 4 weeks",
  "8w": "Last 8 weeks",
  "12w": "Last 12 weeks",
  all: "All time",
};

interface LiftPoint {
  date: string;
  weight: number;
  reps: number;
  est1RM: number;
}

function topSetsByExercise(
  sets: SetEntry[],
  sessionById: Map<number, Session>,
  exerciseId: number,
  rangeStart: string,
  today: string,
): LiftPoint[] {
  const bySession = new Map<number, { weight: number; reps: number }>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue;
    const session = sessionById.get(s.sessionId);
    if (!session || session.date < rangeStart || session.date > today) continue;
    const est = estimate1RM(s.weight, s.reps);
    const current = bySession.get(s.sessionId);
    if (!current || est > estimate1RM(current.weight, current.reps)) {
      bySession.set(s.sessionId, { weight: s.weight, reps: s.reps });
    }
  }
  return [...bySession.entries()]
    .map(([sessionId, top]) => ({
      date: sessionById.get(sessionId)!.date,
      weight: top.weight,
      reps: top.reps,
      est1RM: estimate1RM(top.weight, top.reps),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function longestStreak(dates: Set<string>, start: string, end: string): number {
  let longest = 0;
  let current = 0;
  let d = start;
  while (d <= end) {
    if (isSaturday(d)) {
      d = addDaysISO(d, 1);
      continue;
    }
    if (dates.has(d)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
    d = addDaysISO(d, 1);
  }
  return longest;
}

function currentStreak(dates: Set<string>, today: string): number {
  let d = dates.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (true) {
    if (isSaturday(d)) {
      d = addDaysISO(d, -1);
      continue;
    }
    if (dates.has(d)) {
      streak += 1;
      d = addDaysISO(d, -1);
    } else {
      break;
    }
  }
  return streak;
}

export default function Report() {
  const [range, setRange] = useState<RangePreset>("8w");

  const data = useLiveQuery(async () => {
    const today = todayISO();
    const [allSessions, exercises, sets, cardioEntries, bodyWeights] = await Promise.all([
      db.sessions.toArray(),
      db.exercises.toArray(),
      db.sets.toArray(),
      db.cardioEntries.toArray(),
      db.bodyWeights.orderBy("date").toArray(),
    ]);

    const rangeStart =
      range === "all"
        ? allSessions.reduce((min, s) => (s.date < min ? s.date : min), today)
        : addDaysISO(today, -(RANGE_DAYS[range] - 1));

    const sessionsInRange = allSessions.filter(
      (s) => s.date >= rangeStart && s.date <= today,
    );
    const sessionById = new Map(allSessions.map((s) => [s.id!, s]));
    const exerciseById = new Map(exercises.map((e) => [e.id!, e]));

    const trainingDates = new Set(sessionsInRange.map((s) => s.date));
    const totalDays = daysBetween(rangeStart, today) + 1;
    const saturdaysInRange = (() => {
      let count = 0;
      let d = rangeStart;
      while (d <= today) {
        if (isSaturday(d)) count += 1;
        d = addDaysISO(d, 1);
      }
      return count;
    })();
    const expectedTrainingDays = Math.max(totalDays - saturdaysInRange, 1);

    const liftSessions = sessionsInRange.filter((s) => s.type === "strength").length;
    const hiitSessions = sessionsInRange.filter((s) => s.type === "cardio").length;
    const weeks = totalDays / 7;

    const lastSessionDate = allSessions.length
      ? allSessions.reduce((max, s) => (s.date > max ? s.date : max), allSessions[0].date)
      : null;

    const consistency = {
      rangeStart,
      today,
      totalSessions: sessionsInRange.length,
      liftSessions,
      hiitSessions,
      avgSessionsPerWeek: sessionsInRange.length / weeks,
      trainingDays: trainingDates.size,
      expectedTrainingDays,
      adherencePct: (trainingDates.size / expectedTrainingDays) * 100,
      currentStreak: currentStreak(new Set(allSessions.map((s) => s.date)), today),
      longestStreak: longestStreak(trainingDates, rangeStart, today),
      daysSinceLastSession: lastSessionDate ? daysBetween(lastSessionDate, today) : null,
    };

    const liftExercises = exercises
      .filter((e) => e.type === "strength")
      .sort((a, b) =>
        a.isCoreLift === b.isCoreLift
          ? a.name.localeCompare(b.name)
          : a.isCoreLift
            ? -1
            : 1,
      );

    const liftReports = liftExercises
      .map((ex) => {
        const points = topSetsByExercise(sets, sessionById, ex.id!, rangeStart, today);
        if (points.length === 0) return null;
        const first = points[0];
        const last = points[points.length - 1];
        const change = last.est1RM - first.est1RM;
        const changePct = first.est1RM > 0 ? (change / first.est1RM) * 100 : 0;
        return { exercise: ex as Exercise, points, first, last, change, changePct };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const cardioSessionIds = new Set(
      sessionsInRange.filter((s) => s.type === "cardio").map((s) => s.id),
    );
    const cardioInRange = cardioEntries.filter((c) => cardioSessionIds.has(c.sessionId));
    const cardioMinutes = cardioInRange.reduce((sum, c) => sum + c.durationMin, 0);
    const cardioByActivity = new Map<string, number>();
    for (const c of cardioInRange) {
      const name = exerciseById.get(c.exerciseId)?.name ?? "Other";
      cardioByActivity.set(name, (cardioByActivity.get(name) ?? 0) + 1);
    }

    const bodyWeightsInRange = bodyWeights.filter(
      (bw) => bw.date >= rangeStart && bw.date <= today,
    );
    const bodyWeightReport =
      bodyWeightsInRange.length > 0
        ? {
            points: bodyWeightsInRange,
            first: bodyWeightsInRange[0],
            last: bodyWeightsInRange[bodyWeightsInRange.length - 1],
            change:
              bodyWeightsInRange[bodyWeightsInRange.length - 1].weightLbs -
              bodyWeightsInRange[0].weightLbs,
          }
        : null;

    return {
      consistency,
      liftReports,
      cardioMinutes,
      cardioCount: cardioInRange.length,
      cardioByActivity,
      bodyWeightReport,
    };
  }, [range]);

  return (
    <>
      <h1>Trainer Report</h1>

      <div className="card no-print">
        <label htmlFor="range">Report period</label>
        <select id="range" value={range} onChange={(e) => setRange(e.target.value as RangePreset)}>
          {(Object.keys(RANGE_LABEL) as RangePreset[]).map((r) => (
            <option key={r} value={r}>
              {RANGE_LABEL[r]}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <p className="muted" style={{ marginTop: 10 }}>
          On iPhone: tap Print above, then pinch open the preview and use the Share icon to
          save it to Files as a PDF or send it to your trainer.
        </p>
      </div>

      {!data ? null : (
        <div className="report">
          <div className="report-header">
            <h2 className="report-title">Workout Report</h2>
            <p className="muted">
              {formatDate(data.consistency.rangeStart)} – {formatDate(data.consistency.today)} ·
              generated {formatDate(todayISO())}
            </p>
          </div>

          <section className="card report-section">
            <h2>Consistency</h2>
            <div className="stat-grid">
              <Stat label="Sessions logged" value={String(data.consistency.totalSessions)} />
              <Stat
                label="Lift / HIIT split"
                value={`${data.consistency.liftSessions} / ${data.consistency.hiitSessions}`}
              />
              <Stat
                label="Avg sessions / week"
                value={data.consistency.avgSessionsPerWeek.toFixed(1)}
                hint="target: 6"
              />
              <Stat
                label="Training-day adherence"
                value={`${Math.round(data.consistency.adherencePct)}%`}
                hint={`${data.consistency.trainingDays} of ${data.consistency.expectedTrainingDays} non-rest days`}
              />
              <Stat label="Current streak" value={`${data.consistency.currentStreak}d`} hint="Sat rest excluded" />
              <Stat label="Longest streak" value={`${data.consistency.longestStreak}d`} hint="in this period" />
              <Stat
                label="Days since last session"
                value={data.consistency.daysSinceLastSession === null ? "—" : String(data.consistency.daysSinceLastSession)}
              />
              <Stat
                label="HIIT minutes"
                value={String(data.cardioMinutes)}
                hint={`${data.cardioCount} sessions`}
              />
            </div>
          </section>

          {data.bodyWeightReport && (
            <section className="card report-section">
              <h2>Body Weight</h2>
              <div className="stat-grid">
                <Stat label="Entries" value={String(data.bodyWeightReport.points.length)} />
                <Stat
                  label="Starting"
                  value={`${data.bodyWeightReport.first.weightLbs} lb`}
                  hint={formatDate(data.bodyWeightReport.first.date)}
                />
                <Stat
                  label="Current"
                  value={`${data.bodyWeightReport.last.weightLbs} lb`}
                  hint={formatDate(data.bodyWeightReport.last.date)}
                />
                <Stat
                  label="Change"
                  value={`${data.bodyWeightReport.change >= 0 ? "+" : ""}${data.bodyWeightReport.change.toFixed(1)} lb`}
                />
              </div>
              {data.bodyWeightReport.points.length > 1 && (
                <Sparkline
                  points={data.bodyWeightReport.points.map((p) => ({
                    date: p.date,
                    value: p.weightLbs,
                  }))}
                  formatDate={formatDate}
                  formatValue={(v) => `${v} lb`}
                />
              )}
            </section>
          )}

          {data.liftReports.length === 0 ? (
            <p className="empty-state">No lifts logged in this period yet.</p>
          ) : (
            data.liftReports.map((r) => (
              <section className="card report-section" key={r.exercise.id}>
                <h2>{r.exercise.name}</h2>
                <div className="stat-grid">
                  <Stat label="Sessions" value={String(r.points.length)} />
                  <Stat
                    label="Starting est. 1RM"
                    value={`${r.first.est1RM} lb`}
                    hint={`${r.first.weight}×${r.first.reps} on ${formatDate(r.first.date)}`}
                  />
                  <Stat
                    label="Current est. 1RM"
                    value={`${r.last.est1RM} lb`}
                    hint={`${r.last.weight}×${r.last.reps} on ${formatDate(r.last.date)}`}
                  />
                  <Stat
                    label="Change"
                    value={`${r.change >= 0 ? "+" : ""}${r.change} lb`}
                    hint={`${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(1)}%`}
                  />
                </div>
                {r.points.length > 1 && (
                  <Sparkline
                    points={r.points.map((p) => ({ date: p.date, value: p.est1RM }))}
                    formatDate={formatDate}
                    formatValue={(v) => `${v} lb`}
                  />
                )}
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Top set</th>
                      <th>Est. 1RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...r.points].reverse().map((p, i) => (
                      <tr key={i}>
                        <td>{formatDate(p.date)}</td>
                        <td>
                          {p.weight} lb × {p.reps}
                        </td>
                        <td>{p.est1RM} lb</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))
          )}

          <section className="card report-section trainer-notes">
            <h2>Notes for Trainer</h2>
            <p className="muted">Space to jot adjustments to the program below.</p>
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="note-line" key={i} />
            ))}
          </section>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
