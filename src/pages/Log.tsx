import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams } from "react-router-dom";
import { db, estimate1RM, upsertBodyWeight } from "../db";
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

  // A Shortcut on iPhone can deep-link here with today's Health weight
  // reading pre-filled (e.g. #/?bw=182.4), so logging it is a one-tap Save
  // instead of typing it in. With HashRouter the query string lives inside
  // the hash, so it's read via useSearchParams rather than location.search.
  // This reacts to `searchParams` itself (not a mount-only effect) because
  // navigating to a new hash on an already-open tab (e.g. the Shortcut
  // re-triggers the PWA that's still running in the background) is a
  // same-document navigation that doesn't remount this component.
  const [searchParams] = useSearchParams();
  const [bodyWeight, setBodyWeight] = useState("");
  const [bodyWeightSaved, setBodyWeightSaved] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get("bw");
    if (prefill) {
      setBodyWeight(prefill);
      setBodyWeightSaved(false);
      return;
    }
    db.bodyWeights
      .where("date")
      .equals(date)
      .first()
      .then((existing) => {
        setBodyWeight(existing ? String(existing.weightLbs) : "");
      });
    // Deliberately excludes `date`: date changes are handled explicitly by
    // handleDateChange so they can't race this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleDateChange(newDate: string) {
    setDate(newDate);
    setExerciseId("");
    const existing = await db.bodyWeights.where("date").equals(newDate).first();
    setBodyWeight(existing ? String(existing.weightLbs) : "");
    setBodyWeightSaved(false);
  }

  async function saveBodyWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!bodyWeight) return;
    await upsertBodyWeight(date, Number(bodyWeight));
    setBodyWeightSaved(true);
  }

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
          onChange={(e) => handleDateChange(e.target.value)}
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

      <div className="card">
        <form onSubmit={saveBodyWeight}>
          <label htmlFor="body-weight">Body weight (lb) — {formatDate(date)}</label>
          <div className="row">
            <input
              id="body-weight"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={bodyWeight}
              onChange={(e) => {
                setBodyWeight(e.target.value);
                setBodyWeightSaved(false);
              }}
              style={{ marginBottom: 0 }}
            />
            <button type="submit" disabled={!bodyWeight} style={{ flex: "0 0 auto" }}>
              {bodyWeightSaved ? "Saved" : "Save"}
            </button>
          </div>
        </form>
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
