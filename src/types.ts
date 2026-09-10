export type ExerciseType = "strength" | "cardio";

export interface Exercise {
  id?: number;
  name: string;
  type: ExerciseType;
  isCoreLift: boolean;
}

export interface Session {
  id?: number;
  date: string; // YYYY-MM-DD
  type: ExerciseType;
  notes?: string;
}

export interface SetEntry {
  id?: number;
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
}

export interface CardioEntry {
  id?: number;
  sessionId: number;
  exerciseId: number;
  durationMin: number;
  notes?: string;
}
