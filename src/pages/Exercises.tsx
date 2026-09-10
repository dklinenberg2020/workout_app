import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import type { ExerciseType } from "../types";

export default function Exercises() {
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [name, setName] = useState("");
  const [type, setType] = useState<ExerciseType>("strength");
  const [error, setError] = useState("");

  const lifts = exercises?.filter((e) => e.type === "strength") ?? [];
  const cardio = exercises?.filter((e) => e.type === "cardio") ?? [];

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return;
    const dup = exercises?.some(
      (ex) => ex.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (dup) {
      setError("An exercise with that name already exists.");
      return;
    }
    await db.exercises.add({ name: trimmed, type, isCoreLift: false });
    setName("");
  }

  async function removeExercise(id?: number) {
    if (!id) return;
    const inSets = await db.sets.where("exerciseId").equals(id).count();
    const inCardio = await db.cardioEntries.where("exerciseId").equals(id).count();
    if (inSets > 0 || inCardio > 0) {
      setError("Can't delete an exercise that has logged history.");
      return;
    }
    await db.exercises.delete(id);
  }

  return (
    <>
      <h1>Exercises</h1>

      <div className="card">
        <form onSubmit={addExercise}>
          <label htmlFor="name">Add custom exercise</label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Incline Dumbbell Press"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="type-toggle">
            <button
              type="button"
              className={type === "strength" ? "active" : ""}
              onClick={() => setType("strength")}
            >
              Lift
            </button>
            <button
              type="button"
              className={type === "cardio" ? "active" : ""}
              onClick={() => setType("cardio")}
            >
              HIIT
            </button>
          </div>
          <button type="submit" disabled={!name.trim()}>
            Add
          </button>
          {error && (
            <p className="muted" style={{ color: "#ff6b6b", marginTop: 8 }}>
              {error}
            </p>
          )}
        </form>
      </div>

      <h2>Lifts</h2>
      <div className="card">
        {lifts.map((ex) => (
          <div className="entry-row" key={ex.id}>
            <span>
              {ex.name}
              {ex.isCoreLift && <span className="tag">core</span>}
            </span>
            {!ex.isCoreLift && (
              <button className="danger" onClick={() => removeExercise(ex.id)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <h2>HIIT / Cardio</h2>
      <div className="card">
        {cardio.map((ex) => (
          <div className="entry-row" key={ex.id}>
            <span>{ex.name}</span>
            <button className="danger" onClick={() => removeExercise(ex.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
