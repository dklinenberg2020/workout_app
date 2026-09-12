import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, estimate1RM } from "../db";
import { formatDate } from "../utils";
import Sparkline from "../components/Sparkline";

export default function Progress() {
  const [mode, setMode] = useState<"lift" | "bodyweight">("lift");

  return (
    <>
      <h1>Progress</h1>
      <div className="type-toggle">
        <button
          type="button"
          className={mode === "lift" ? "active" : ""}
          onClick={() => setMode("lift")}
        >
          Lifts
        </button>
        <button
          type="button"
          className={mode === "bodyweight" ? "active" : ""}
          onClick={() => setMode("bodyweight")}
        >
          Body Weight
        </button>
      </div>
      {mode === "lift" ? <LiftProgress /> : <BodyWeightProgress />}
    </>
  );
}

function LiftProgress() {
  const liftExercises = useLiveQuery(() =>
    db.exercises.where("type").equals("strength").sortBy("name"),
  );

  const [exerciseId, setExerciseId] = useState<number | "">("");

  const points = useLiveQuery(async () => {
    if (!exerciseId) return [];
    const sets = await db.sets.where("exerciseId").equals(exerciseId).toArray();
    if (sets.length === 0) return [];

    const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
    const sessions = await db.sessions.bulkGet(sessionIds);
    const dateBySession = new Map(
      sessions.filter(Boolean).map((s) => [s!.id!, s!.date]),
    );

    const bySession = new Map<number, { weight: number; reps: number }>();
    for (const s of sets) {
      const est = estimate1RM(s.weight, s.reps);
      const current = bySession.get(s.sessionId);
      if (!current || est > estimate1RM(current.weight, current.reps)) {
        bySession.set(s.sessionId, { weight: s.weight, reps: s.reps });
      }
    }

    return [...bySession.entries()]
      .map(([sessionId, top]) => ({
        date: dateBySession.get(sessionId) ?? "",
        weight: top.weight,
        reps: top.reps,
        est1RM: estimate1RM(top.weight, top.reps),
      }))
      .filter((p) => p.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exerciseId]);

  return (
    <>
      <div className="card">
        <label htmlFor="exercise">Exercise</label>
        <select
          id="exercise"
          value={exerciseId}
          onChange={(e) => setExerciseId(Number(e.target.value))}
        >
          <option value="">Select a lift…</option>
          {liftExercises?.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {exerciseId && (!points || points.length === 0) && (
        <p className="empty-state">No sets logged for this lift yet.</p>
      )}

      {points && points.length > 0 && (
        <>
          <div className="card">
            <Sparkline
              points={points.map((p) => ({ date: p.date, value: p.est1RM }))}
              formatDate={formatDate}
              formatValue={(v) => `${v} lb`}
            />
            <p className="muted" style={{ textAlign: "center", marginTop: 6 }}>
              Estimated 1-rep max over time
            </p>
          </div>

          <div className="card">
            {[...points].reverse().map((p, i) => (
              <div className="entry-row" key={i}>
                <span>{formatDate(p.date)}</span>
                <span>
                  {p.weight} lb × {p.reps}{" "}
                  <span className="muted">(~{p.est1RM} 1RM)</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function BodyWeightProgress() {
  const entries = useLiveQuery(() => db.bodyWeights.orderBy("date").toArray());

  if (entries && entries.length === 0) {
    return <p className="empty-state">No body weight logged yet. Add it on the Log tab.</p>;
  }

  return (
    <>
      {entries && entries.length > 0 && (
        <div className="card">
          <Sparkline
            points={entries.map((e) => ({ date: e.date, value: e.weightLbs }))}
            formatDate={formatDate}
            formatValue={(v) => `${v} lb`}
          />
          <p className="muted" style={{ textAlign: "center", marginTop: 6 }}>
            Body weight over time
          </p>
        </div>
      )}

      <div className="card">
        {[...(entries ?? [])].reverse().map((e) => (
          <div className="entry-row" key={e.id}>
            <span>{formatDate(e.date)}</span>
            <span>{e.weightLbs} lb</span>
          </div>
        ))}
      </div>
    </>
  );
}
