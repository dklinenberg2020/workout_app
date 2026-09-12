import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import type { Exercise, ExerciseType } from "../types";

export default function Exercises() {
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [name, setName] = useState("");
  const [type, setType] = useState<ExerciseType>("strength");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const lifts = exercises?.filter((e) => e.type === "strength") ?? [];
  const cardio = exercises?.filter((e) => e.type === "cardio") ?? [];

  function isDuplicate(trimmed: string, excludeId?: number) {
    return exercises?.some(
      (ex) => ex.id !== excludeId && ex.name.toLowerCase() === trimmed.toLowerCase(),
    );
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isDuplicate(trimmed)) {
      setError("An exercise with that name already exists.");
      return;
    }
    await db.exercises.add({ name: trimmed, type, isCoreLift: false });
    setName("");
  }

  async function renameExercise(id: number, newName: string) {
    setError("");
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (isDuplicate(trimmed, id)) {
      setError("An exercise with that name already exists.");
      return;
    }
    await db.exercises.update(id, { name: trimmed });
    setEditingId(null);
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
            placeholder="e.g. Front Squat"
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
          <ExerciseRow
            key={ex.id}
            exercise={ex}
            editing={editingId === ex.id}
            onStartEdit={() => setEditingId(ex.id!)}
            onCancelEdit={() => setEditingId(null)}
            onRename={(newName) => renameExercise(ex.id!, newName)}
            onRemove={() => removeExercise(ex.id)}
          />
        ))}
      </div>

      <h2>HIIT / Cardio</h2>
      <div className="card">
        {cardio.map((ex) => (
          <ExerciseRow
            key={ex.id}
            exercise={ex}
            editing={editingId === ex.id}
            onStartEdit={() => setEditingId(ex.id!)}
            onCancelEdit={() => setEditingId(null)}
            onRename={(newName) => renameExercise(ex.id!, newName)}
            onRemove={() => removeExercise(ex.id)}
          />
        ))}
      </div>
    </>
  );
}

function ExerciseRow({
  exercise,
  editing,
  onStartEdit,
  onCancelEdit,
  onRename,
  onRemove,
}: {
  exercise: Exercise;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRename: (newName: string) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(exercise.name);

  if (editing) {
    return (
      <div className="entry-row">
        <input
          type="text"
          value={draft}
          autoFocus
          style={{ marginBottom: 0, flex: 1 }}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRename(draft);
            if (e.key === "Escape") onCancelEdit();
          }}
        />
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          <button type="button" className="small" onClick={() => onRename(draft)}>
            Save
          </button>
          <button type="button" className="secondary small" onClick={onCancelEdit}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="entry-row">
      <span>
        {exercise.name}
        {exercise.isCoreLift && <span className="tag">core</span>}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          className="secondary small"
          onClick={() => {
            setDraft(exercise.name);
            onStartEdit();
          }}
        >
          Rename
        </button>
        {!exercise.isCoreLift && (
          <button className="danger" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
