import Dexie, { type Table } from "dexie";
import type { CardioEntry, Exercise, Session, SetEntry } from "./types";

class WorkoutDB extends Dexie {
  exercises!: Table<Exercise, number>;
  sessions!: Table<Session, number>;
  sets!: Table<SetEntry, number>;
  cardioEntries!: Table<CardioEntry, number>;

  constructor() {
    super("workout-tracker");
    this.version(1).stores({
      exercises: "++id, name, type, isCoreLift",
      sessions: "++id, date, type",
      sets: "++id, sessionId, exerciseId",
      cardioEntries: "++id, sessionId, exerciseId",
    });
  }
}

export const db = new WorkoutDB();

// The five basic barbell lifts.
export const CORE_LIFTS = [
  "Squat",
  "Bench Press",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
] as const;

const DEFAULT_CARDIO = ["HIIT Session"];

export async function seedExercises() {
  const count = await db.exercises.count();
  if (count > 0) return;

  await db.exercises.bulkAdd([
    ...CORE_LIFTS.map((name) => ({
      name,
      type: "strength" as const,
      isCoreLift: true,
    })),
    ...DEFAULT_CARDIO.map((name) => ({
      name,
      type: "cardio" as const,
      isCoreLift: false,
    })),
  ]);
}

// Epley formula estimated 1-rep max.
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}
