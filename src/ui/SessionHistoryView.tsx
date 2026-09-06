"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { repositories } from "@/src/data/dexie";
import type { LabData } from "./useLabData";
import type { LabSession, Student, SubjectArea } from "@/src/domain/model";

const subjectLabels: Record<SubjectArea, string> = {
  robotics: "Robotics",
  "digital-electronics": "Digital Electronics",
  "3d-printing": "3D Printing",
  generic: "General",
};

function prettyDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
}

function localDate(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function NewSessionDialog({ data, onClose, onCreated }: { data: LabData; onClose: () => void; onCreated: () => Promise<void> }) {
  const [classroomId, setClassroomId] = useState(data.classrooms[0]?.id ?? "");
  const [groupName, setGroupName] = useState("Whole class");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:50");
  const [subjectArea, setSubjectArea] = useState<SubjectArea>("robotics");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const groupOptions = Array.from(new Set(
    data.teams
      .filter((team) => data.sessions.find((session) => session.id === team.sessionId)?.classroomId === classroomId)
      .map((team) => team.name),
  ));

  async function createSession() {
    const cleanTitle = title.trim();
    const cleanGroup = groupName.trim() || "Whole class";
    if (!classroomId || !cleanTitle || !date) {
      setError("Choose a class and date, and add a session title.");
      return;
    }
    const students = data.students.filter((student) => student.classroomId === classroomId && student.active);
    const previousTeam = data.teams.find((team) => team.name === cleanGroup && data.sessions.find((session) => session.id === team.sessionId)?.classroomId === classroomId);
    const memberIds = previousTeam?.studentIds ?? students.map((student) => student.id);
    if (!memberIds.length) {
      setError("This class has no active students to add to the session.");
      return;
    }

    const sessionId = "session-" + crypto.randomUUID();
    const teamId = sessionId + "-group";
    await repositories.sessions.put({
      id: sessionId,
      classroomId,
      groupName: cleanGroup,
      title: cleanTitle,
      date,
      startTime,
      endTime,
      subjectArea,
      status: "active",
      notes: notes.trim() || undefined,
    });
    await repositories.teams.put({
      id: teamId,
      sessionId,
      name: cleanGroup,
      studentIds: memberIds,
      operationalStatus: "not-started",
    });
    await Promise.all(memberIds.map((studentId) => repositories.attendance.put({
      id: "attendance-" + sessionId + "-" + studentId,
      studentId,
      sessionId,
      status: "present",
      events: [],
    })));
    await onCreated();
    onClose();
  }

  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="new-session-title">
      <section className="session-dialog">
        <header><div className="finish-icon"><Plus size={18} /></div><div><span>New practical session</span><h2 id="new-session-title">Create session</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="session-form">
          <label>Class<select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>{data.classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></label>
          <label>Group<input list="session-groups" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Whole class or Group A" /><datalist id="session-groups"><option value="Whole class" />{groupOptions.map((group) => <option key={group} value={group} />)}</datalist></label>
          <label className="session-form__wide">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Sensor calibration" autoFocus /></label>
          <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Subject<select value={subjectArea} onChange={(event) => setSubjectArea(event.target.value as SubjectArea)}><option value="robotics">Robotics</option><option value="digital-electronics">Digital Electronics</option><option value="3d-printing">3D Printing</option><option value="generic">General</option></select></label>
          <label>From<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <label>To<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
          <label className="session-form__wide">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Optional session note" /></label>
        </div>
        <p className="session-dialog__hint">If you choose an existing group, its student membership is copied into this session. “Whole class” includes all active students in the selected class.</p>
        {error && <p className="session-dialog__error" role="alert">{error}</p>}
        <footer><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button type="button" className="finish-anyway" onClick={() => void createSession()}><Plus size={14} />Create session</button></footer>
      </section>
    </div>
  );
}

function DeleteSessionDialog({ session, data, onClose, onDeleted }: { session: LabSession; data: LabData; onClose: () => void; onDeleted: () => Promise<void> }) {
  const teams = data.teams.filter((team) => team.sessionId === session.id);
  const attendance = data.attendance.filter((item) => item.sessionId === session.id);
  const evidence = data.teamObservations.filter((item) => item.sessionId === session.id).length + data.individualObservations.filter((item) => item.sessionId === session.id).length;
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    await repositories.sessions.remove(session.id);
    await onDeleted();
    onClose();
  }

  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-session-title">
      <section className="finish-dialog session-delete-dialog">
        <header><div className="finish-icon finish-icon--danger"><Trash2 size={18} /></div><div><span>Permanent action</span><h2 id="delete-session-title">Delete session?</h2></div></header>
        <p>This will permanently remove “{session.title}” and all its attendance, group membership and evidence records. This cannot be undone.</p>
        <dl><div><dt>Date</dt><dd>{prettyDate(session.date)}</dd></div><div><dt>Groups</dt><dd>{teams.length}</dd></div><div><dt>Attendance records</dt><dd>{attendance.length}</dd></div><div><dt>Evidence records</dt><dd>{evidence}</dd></div></dl>
        <footer><button type="button" className="button-quiet" onClick={onClose} disabled={deleting}>Keep session</button><button type="button" className="delete-session-button" onClick={() => void confirmDelete()} disabled={deleting}><Trash2 size={14} />{deleting ? "Deleting…" : "Delete permanently"}</button></footer>
      </section>
    </div>
  );
}

function SessionDetail({ session, data, onClose }: { session: LabSession; data: LabData; onClose: () => void }) {
  const attendance = data.attendance.filter((item) => item.sessionId === session.id);
  const teams = data.teams.filter((item) => item.sessionId === session.id);
  const teamEvidence = data.teamObservations.filter((item) => item.sessionId === session.id && item.score !== undefined);
  const individual = data.individualObservations.filter((item) => item.sessionId === session.id && item.score !== undefined);
  const behaviour = data.behaviourObservations.filter((item) => item.sessionId === session.id);
  return (
    <>
      <button type="button" className="history-scrim" onClick={onClose} aria-label="Close session history" />
      <aside className="history-drawer" aria-label={session.title + " session record"}>
        <header>
          <div><span>{prettyDate(session.date)} · {subjectLabels[session.subjectArea]}</span><h2>{session.title}</h2><p>{data.classrooms.find((item) => item.id === session.classroomId)?.name} · {session.groupName ?? "Whole class"} · {session.startTime}–{session.endTime}</p></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="history-drawer__body">
          <section className="history-detail-summary">
            <div><strong>{attendance.filter((item) => item.status !== "absent").length}/{attendance.length}</strong><span>attended</span></div>
            <div><strong>{teams.length}</strong><span>team snapshots</span></div>
            <div><strong>{teamEvidence.length}</strong><span>team evidence</span></div>
            <div><strong>{individual.length}</strong><span>individual evidence</span></div>
          </section>
          {session.notes && <p className="session-record-note">{session.notes}</p>}

          <section className="history-detail-section">
            <h3>Attendance</h3>
            <div className="history-attendance-grid">
              {attendance.map((record) => {
                const student = data.students.find((item) => item.id === record.studentId);
                return <div key={record.id}><span className={"history-attendance-dot history-attendance-dot--" + record.status} /><span><strong>{student?.firstName} {student?.lastName}</strong><small>{record.status.replaceAll("-", " ")}{record.events.length ? " · " + record.events.map((event) => new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })).join(", ") : ""}</small></span></div>;
              })}
            </div>
          </section>

          <section className="history-detail-section">
            <h3>Session teams</h3>
            <div className="history-team-list">
              {teams.map((team) => {
                const members = team.studentIds.map((id) => data.students.find((student) => student.id === id)).filter((item): item is Student => item !== undefined);
                const observations = teamEvidence.filter((item) => item.teamId === team.id);
                const assistance = data.teacherAssistance.find((item) => item.teamId === team.id);
                const result = data.practicalResults.find((item) => item.teamId === team.id);
                return (
                  <article key={team.id}>
                    <header><div><strong>{team.name}</strong><small>{members.map((member) => member.shortName).join(", ")}</small></div><span>{team.operationalStatus.replaceAll("-", " ")}</span></header>
                    <div className="history-team-scores">
                      {observations.map((item) => <span key={item.id}>{data.criteria.find((criterion) => criterion.id === item.criterionId)?.name}<strong>{item.score}</strong></span>)}
                    </div>
                    <footer><span>Teacher assistance <strong>{assistance?.level ?? 0}</strong></span><span>Practical result <strong>{result?.score ?? "—"}</strong></span></footer>
                    {(team.note || observations.some((item) => item.note)) && <p>{team.note ?? observations.find((item) => item.note)?.note}</p>}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="history-detail-section">
            <h3>Individual evidence</h3>
            <div className="history-evidence-list">
              {individual.map((item) => {
                const student = data.students.find((value) => value.id === item.studentId);
                const criterion = data.criteria.find((value) => value.id === item.criterionId);
                return <div key={item.id}><span><strong>{student?.firstName} {student?.lastName}</strong><small>{criterion?.name}</small></span><b>{item.score} / 4</b>{item.note && <p>{item.note}</p>}</div>;
              })}
              {!individual.length && <p>No individual evidence recorded. Missing evidence is valid.</p>}
            </div>
          </section>

          <section className="history-detail-section">
            <h3>Behaviour observations</h3>
            <div className="history-behaviour-list">
              {behaviour.map((item) => {
                const student = data.students.find((value) => value.id === item.studentId);
                return <div key={item.id} className={"history-behaviour history-behaviour--" + item.type}>{item.type === "positive" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}<span><strong>{student?.firstName} {student?.lastName}</strong><small>{item.category.replaceAll("-", " ")}</small></span>{item.note && <p>{item.note}</p>}</div>;
              })}
              {!behaviour.length && <p>No behaviour observations.</p>}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

export function SessionHistoryView({ data, onReload }: { data: LabData; onReload: () => Promise<void> }) {
  const [classroomId, setClassroomId] = useState("all");
  const [subject, setSubject] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [deleteSession, setDeleteSession] = useState<LabSession | null>(null);
  const selected = data.sessions.find((session) => session.id === selectedId);
  const sessions = data.sessions.filter((session) =>
    (classroomId === "all" || session.classroomId === classroomId) &&
    (subject === "all" || session.subjectArea === subject) &&
    (status === "all" || session.status === status) &&
    (!date || session.date === date),
  );
  return (
    <div className="session-history-workspace">
      <header className="history-header"><div><span className="eyebrow">Evidence archive</span><h1>Session history</h1><p>Reconstruct attendance, membership and evidence exactly as recorded.</p></div><button type="button" className="new-session-button" onClick={() => setShowNewSession(true)}><Plus size={15} />New session</button></header>
      <section className="history-filters">
        <span><Filter size={13} />Filters</span>
        <label>Classroom<select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}><option value="all">All classes</option>{data.classrooms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Subject<select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">All subjects</option><option value="robotics">Robotics</option><option value="digital-electronics">Digital Electronics</option><option value="3d-printing">3D Printing</option></select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Any status</option><option value="active">Active</option><option value="completed">Completed</option><option value="draft">Draft</option></select></label>
        <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        {(classroomId !== "all" || subject !== "all" || status !== "all" || date) && <button type="button" onClick={() => { setClassroomId("all"); setSubject("all"); setStatus("all"); setDate(""); }}><X size={12} />Clear</button>}
      </section>
      <section className="history-browser">
        <div className="history-browser__head"><span>{sessions.length} sessions</span><span>Newest first</span></div>
        {sessions.map((session) => {
          const attendance = data.attendance.filter((item) => item.sessionId === session.id);
          const teams = data.teams.filter((item) => item.sessionId === session.id);
          const evidence = data.teamObservations.filter((item) => item.sessionId === session.id && item.score !== undefined).length +
            data.individualObservations.filter((item) => item.sessionId === session.id && item.score !== undefined).length;
          return (
            <div className="history-session-row" key={session.id} role="button" tabIndex={0} onClick={() => setSelectedId(session.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(session.id); } }}>
              <span className={"history-subject history-subject--" + session.subjectArea}><CalendarDays size={17} /></span>
              <span className="history-date"><strong>{prettyDate(session.date)}</strong><small><Clock3 size={10} />{session.startTime}–{session.endTime}</small></span>
              <span className="history-title"><strong>{session.title}</strong><small>{subjectLabels[session.subjectArea]} · {data.classrooms.find((item) => item.id === session.classroomId)?.name} · {session.groupName ?? "Whole class"}</small></span>
              <span className="history-fact"><Users size={12} />{teams.length} teams</span>
              <span className="history-fact">{attendance.filter((item) => item.status !== "absent").length}/{attendance.length} attended</span>
              <span className="history-fact">{evidence} evidence</span>
              <span className={"history-status history-status--" + session.status}>{session.status}</span>
              <span className="history-row-actions"><ChevronRight size={15} /><button type="button" className="history-delete-button" aria-label={"Delete " + session.title} title="Delete session" onClick={(event) => { event.stopPropagation(); setDeleteSession(session); }}><Trash2 size={14} /></button></span>
            </div>
          );
        })}
      </section>
      {selected && <SessionDetail session={selected} data={data} onClose={() => setSelectedId(null)} />}
      {showNewSession && <NewSessionDialog data={data} onClose={() => setShowNewSession(false)} onCreated={onReload} />}
      {deleteSession && <DeleteSessionDialog session={deleteSession} data={data} onClose={() => setDeleteSession(null)} onDeleted={async () => { setSelectedId(null); await onReload(); }} />}
    </div>
  );
}
