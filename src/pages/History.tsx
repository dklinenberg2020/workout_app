import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, estimate1RM } from "../db";
import { formatDate } from "../utils";
import type { Session } from "../types";

export default function History() {
  const sessions = useLiveQuery(() =>
    db.sessions.orderBy("date").reverse().toArray(),
  );
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const exerciseName = (id: number) => exercises?.find((e) => e.id === id)?.name ?? "…";

  const [openId, setOpenId] = useState<number | null>(null);

  async function deleteSession(session: Session) {
    if (!session.id) return;
    if (!confirm(`Delete the ${session.type === "strength" ? "lift" : "HIIT"} session on ${formatDate(session.date)}? This removes all its logged sets/entries.`)) {
      return;
    }
    await db.transaction("rw", db.sessions, db.sets, db.cardioEntries, async () => {
      await db.sets.where("sessionId").equals(session.id!).delete();
      await db.cardioEntries.where("sessionId").equals(session.id!).delete();
      await db.sessions.delete(session.id!);
    });
  }

  return (
    <>
      <h1>History</h1>
      {(!sessions || sessions.length === 0) && (
        <p className="empty-state">No workouts logged yet. Head to Log to get started.</p>
      )}
      {sessions?.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          open={openId === session.id}
          onToggle={() => setOpenId(openId === session.id ? null : (session.id ?? null))}
          onDelete={() => deleteSession(session)}
          exerciseName={exerciseName}
        />
      ))}
    </>
  );
}

function SessionCard({
  session,
  open,
  onToggle,
  onDelete,
  exerciseName,
}: {
  session: Session;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  exerciseName: (id: number) => string;
}) {
  const sets = useLiveQuery(
    () => (session.id ? db.sets.where("sessionId").equals(session.id).toArray() : []),
    [session.id, open],
  );
  const cardioEntries = useLiveQuery(
    () =>
      session.id ? db.cardioEntries.where("sessionId").equals(session.id).toArray() : [],
    [session.id, open],
  );

  return (
    <div className="card">
      <div className="entry-row" style={{ cursor: "pointer" }} onClick={onToggle}>
        <span>
          {formatDate(session.date)}{" "}
          <span className="tag">{session.type === "strength" ? "Lift" : "HIIT"}</span>
        </span>
        <span className="muted">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          {session.type === "strength"
            ? sets
                ?.sort((a, b) => a.exerciseId - b.exerciseId || a.setNumber - b.setNumber)
                .map((s) => (
                  <div className="entry-row" key={s.id}>
                    <span>
                      {exerciseName(s.exerciseId)} <span className="tag">set {s.setNumber}</span>
                    </span>
                    <span>
                      {s.weight} lb × {s.reps}{" "}
                      <span className="muted">(~{estimate1RM(s.weight, s.reps)} 1RM)</span>
                    </span>
                  </div>
                ))
            : cardioEntries?.map((c) => (
                <div className="entry-row" key={c.id}>
                  <span>{exerciseName(c.exerciseId)}</span>
                  <span>
                    {c.durationMin} min{c.notes ? ` — ${c.notes}` : ""}
                  </span>
                </div>
              ))}
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <button className="danger" onClick={onDelete}>
              Delete session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
