import { db } from "./db";

export type ProgramUnit = "reps" | "sec" | "yd";

export interface ProgramExercise {
  // Alternate acceptable names for this slot, in preference order. The first
  // is used as the canonical name when the exercise doesn't exist yet; if a
  // matching exercise already exists under a later name (e.g. the user
  // renamed the core "Squat" lift to "Back Squat"), that one is used instead
  // so the program never creates a duplicate.
  candidateNames: string[];
  sets: number;
  repsLabel: string; // "6-10", "60", "10-15"
  unit: ProgramUnit;
  note?: string;
}

export interface ProgramDay {
  key: string;
  label: string;
  exercises: ProgramExercise[];
}

export const PROGRAM_DAYS: Record<string, ProgramDay> = {
  "upper-a": {
    key: "upper-a",
    label: "Upper Body A",
    exercises: [
      { candidateNames: ["Bench Press"], sets: 3, repsLabel: "6-10", unit: "reps" },
      {
        candidateNames: ["Pull Ups", "Lat Pulldowns"],
        sets: 3,
        repsLabel: "6-10",
        unit: "reps",
        note: "pull ups or lat pulldowns",
      },
      { candidateNames: ["Seated Rows"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Lateral Raise"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Bicep Curls"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Rope Tricep Pulldowns"], sets: 3, repsLabel: "6-10", unit: "reps" },
    ],
  },
  "lower-a": {
    key: "lower-a",
    label: "Lower Body A",
    exercises: [
      { candidateNames: ["Squat", "Back Squat"], sets: 3, repsLabel: "5-8", unit: "reps" },
      { candidateNames: ["Romanian Deadlifts"], sets: 3, repsLabel: "6-10", unit: "reps" },
      {
        candidateNames: ["Weighted Walking Lunges"],
        sets: 2,
        repsLabel: "10-15",
        unit: "yd",
        note: "distance per set",
      },
      { candidateNames: ["Machine Leg Curls"], sets: 3, repsLabel: "10", unit: "reps" },
      { candidateNames: ["Machine Calf Raises"], sets: 3, repsLabel: "10", unit: "reps" },
      { candidateNames: ["Planks"], sets: 3, repsLabel: "60", unit: "sec" },
    ],
  },
  "upper-b": {
    key: "upper-b",
    label: "Upper Body B",
    exercises: [
      { candidateNames: ["Incline Dumbbell Press"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Rope Lat Pulldowns"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Dumbbell Shoulder Press"], sets: 3, repsLabel: "6-10", unit: "reps" },
      {
        candidateNames: ["Face Pulls"],
        sets: 3,
        repsLabel: "6-10",
        unit: "reps",
        note: "with rope",
      },
      { candidateNames: ["Machine Shoulder Raises"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Bicep Curls"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Skull Crushers"], sets: 3, repsLabel: "6-10", unit: "reps" },
    ],
  },
  "lower-b": {
    key: "lower-b",
    label: "Lower Body B",
    exercises: [
      { candidateNames: ["Deadlift"], sets: 4, repsLabel: "5-8", unit: "reps" },
      { candidateNames: ["Leg Press"], sets: 3, repsLabel: "8-10", unit: "reps" },
      {
        candidateNames: ["Bulgarian Split Squats"],
        sets: 2,
        repsLabel: "8-10",
        unit: "reps",
        note: "each leg",
      },
      { candidateNames: ["Machine Hamstring Curls"], sets: 3, repsLabel: "6-10", unit: "reps" },
      { candidateNames: ["Ukrainian Twist"], sets: 4, repsLabel: "60", unit: "sec" },
    ],
  },
};

export type ScheduleEntry =
  | { kind: "program"; day: string }
  | { kind: "cardio" }
  | { kind: "rest" };

// JS Date#getDay(): 0 = Sunday ... 6 = Saturday.
export const SCHEDULE: Record<number, ScheduleEntry> = {
  0: { kind: "rest" },
  1: { kind: "program", day: "upper-a" },
  2: { kind: "program", day: "lower-a" },
  3: { kind: "cardio" },
  4: { kind: "program", day: "upper-b" },
  5: { kind: "program", day: "lower-b" },
  6: { kind: "rest" },
};

export const PROGRAM_NOTES = [
  "Cardio days: any cardio machine or calisthenics, 30-45 min",
  "Progressively increase weight week to week rather than swapping exercises",
  "10,000-15,000 steps/day",
  "7-9 hours of sleep",
  "1g protein per lb of bodyweight",
  "80-100 oz of water per day",
];

export function scheduleFor(dateISO: string): ScheduleEntry {
  const dow = new Date(dateISO + "T00:00:00").getDay();
  return SCHEDULE[dow];
}

export async function resolveExerciseId(candidateNames: string[]): Promise<number | null> {
  const all = await db.exercises.where("type").equals("strength").toArray();
  for (const name of candidateNames) {
    const match = all.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (match) return match.id!;
  }
  return null;
}

// Idempotent: adds any program exercise that doesn't already exist under any
// of its candidate names, so the program's exercises are available even on
// a browser that already has data (renamed core lifts included) without
// creating duplicates. Safe to call on every app load.
export async function ensureProgramExercises() {
  const all = await db.exercises.where("type").equals("strength").toArray();
  const existingNames = new Set(all.map((e) => e.name.toLowerCase()));

  const toAdd: string[] = [];
  const queued = new Set<string>();
  for (const day of Object.values(PROGRAM_DAYS)) {
    for (const ex of day.exercises) {
      const hasMatch = ex.candidateNames.some((n) => existingNames.has(n.toLowerCase()));
      if (hasMatch) continue;
      const canonical = ex.candidateNames[0];
      if (queued.has(canonical.toLowerCase())) continue;
      queued.add(canonical.toLowerCase());
      toAdd.push(canonical);
    }
  }

  if (toAdd.length > 0) {
    await db.exercises.bulkAdd(
      toAdd.map((name) => ({ name, type: "strength" as const, isCoreLift: false })),
    );
  }
}
