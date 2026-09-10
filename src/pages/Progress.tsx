import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, estimate1RM } from "../db";
import { formatDate } from "../utils";

export default function Progress() {
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
      <h1>Progress</h1>
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
            <Sparkline values={points.map((p) => p.est1RM)} />
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

function Sparkline({ values }: { values: number[] }) {
  const width = 300;
  const height = 80;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <path d={path} fill="none" stroke="#4f9dff" strokeWidth={2} />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="#3ddc97" />
      ))}
    </svg>
  );
}
