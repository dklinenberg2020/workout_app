import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, estimate1RM } from "../db";
import type { ExerciseType } from "../types";
import { formatDate, todayISO } from "../utils";

export default function Log() {
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<ExerciseType>("strength");
  const [exerciseId, setExerciseId] = useState<number | "">("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const exercises = useLiveQuery(
    () => db.exercises.where("type").equals(type).sortBy("name"),
    [type],
  );

  const session = useLiveQuery(
    () => db.sessions.where({ date, type }).first(),
    [date, type],
  );

  const sets = useLiveQuery(
    () => (session?.id ? db.sets.where("sessionId").equals(session.id).toArray() : []),
    [session?.id],
  );

  const cardioEntries = useLiveQuery(
    () =>
      session?.id ? db.cardioEntries.where("sessionId").equals(session.id).toArray() : [],
    [session?.id],
  );

  const setExerciseName = useLiveQuery(async () => {
    const list = sets ?? [];
    const ids = [...new Set(list.map((s) => s.exerciseId))];
    const found = await db.exercises.bulkGet(ids);
    const map = new Map<number, string>();
    found.forEach((ex, i) => {
      if (ex) map.set(ids[i], ex.name);
    });
    return map;
  }, [sets]);

  const cardioExerciseName = useLiveQuery(async () => {
    const list = cardioEntries ?? [];
    const ids = [...new Set(list.map((c) => c.exerciseId))];
    const found = await db.exercises.bulkGet(ids);
    const map = new Map<number, string>();
    found.forEach((ex, i) => {
      if (ex) map.set(ids[i], ex.name);
    });
    return map;
  }, [cardioEntries]);

  async function ensureSession(): Promise<number> {
    if (session?.id) return session.id;
    return db.sessions.add({ date, type });
  }

  async function addSet(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseId || !weight || !reps) return;
    const sessionId = await ensureSession();
    const existing = await db.sets
      .where("sessionId")
      .equals(sessionId)
      .and((s) => s.exerciseId === exerciseId)
      .count();
    await db.sets.add({
      sessionId,
      exerciseId: exerciseId as number,
      setNumber: existing + 1,
      weight: Number(weight),
      reps: Number(reps),
    });
    setReps("");
  }

  async function addCardio(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseId || !duration) return;
    const sessionId = await ensureSession();
    await db.cardioEntries.add({
      sessionId,
      exerciseId: exerciseId as number,
      durationMin: Number(duration),
      notes: notes || undefined,
    });
    setDuration("");
    setNotes("");
  }

  async function deleteSet(id?: number) {
    if (id) await db.sets.delete(id);
  }

  async function deleteCardio(id?: number) {
    if (id) await db.cardioEntries.delete(id);
  }

  return (
    <>
      <h1>Log Workout</h1>

      <div className="card">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setExerciseId("");
          }}
        />

        <div className="type-toggle">
          <button
            type="button"
            className={type === "strength" ? "active" : ""}
            onClick={() => {
              setType("strength");
              setExerciseId("");
            }}
          >
            Lift Heavy
          </button>
          <button
            type="button"
            className={type === "cardio" ? "active" : ""}
            onClick={() => {
              setType("cardio");
              setExerciseId("");
            }}
          >
            HIIT
          </button>
        </div>

        {type === "strength" ? (
          <form onSubmit={addSet}>
            <label htmlFor="exercise">Exercise</label>
            <select
              id="exercise"
              value={exerciseId}
              onChange={(e) => setExerciseId(Number(e.target.value))}
            >
              <option value="">Select an exercise…</option>
              {exercises?.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <div className="row">
              <div>
                <label htmlFor="weight">Weight (lb)</label>
                <input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reps">Reps</label>
                <input
                  id="reps"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" disabled={!exerciseId || !weight || !reps}>
              Add Set
            </button>
          </form>
        ) : (
          <form onSubmit={addCardio}>
            <label htmlFor="exercise">Activity</label>
            <select
              id="exercise"
              value={exerciseId}
              onChange={(e) => setExerciseId(Number(e.target.value))}
            >
              <option value="">Select an activity…</option>
              {exercises?.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <label htmlFor="duration">Duration (min)</label>
            <input
              id="duration"
              type="number"
              inputMode="numeric"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <label htmlFor="notes">Notes (optional)</label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" disabled={!exerciseId || !duration}>
              Add Entry
            </button>
          </form>
        )}
      </div>

      <h2>{formatDate(date)}</h2>

      {type === "strength" ? (
        (sets?.length ?? 0) === 0 ? (
          <p className="empty-state">No sets logged yet.</p>
        ) : (
          <div className="card">
            {sets!
              .sort((a, b) => a.exerciseId - b.exerciseId || a.setNumber - b.setNumber)
              .map((s) => (
                <div className="entry-row" key={s.id}>
                  <span>
                    {setExerciseName?.get(s.exerciseId) ?? "…"}{" "}
                    <span className="tag">set {s.setNumber}</span>
                  </span>
                  <span>
                    {s.weight} lb × {s.reps}{" "}
                    <span className="muted">(~{estimate1RM(s.weight, s.reps)} 1RM)</span>
                  </span>
                  <button className="danger" onClick={() => deleteSet(s.id)}>
                    ×
                  </button>
                </div>
              ))}
          </div>
        )
      ) : (cardioEntries?.length ?? 0) === 0 ? (
        <p className="empty-state">No HIIT entries logged yet.</p>
      ) : (
        <div className="card">
          {cardioEntries!.map((c) => (
            <div className="entry-row" key={c.id}>
              <span>{cardioExerciseName?.get(c.exerciseId) ?? "…"}</span>
              <span>
                {c.durationMin} min{c.notes ? ` — ${c.notes}` : ""}
              </span>
              <button className="danger" onClick={() => deleteCardio(c.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
