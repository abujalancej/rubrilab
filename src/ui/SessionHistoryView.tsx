"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { repositories } from "@/src/data/dexie";
import type { LabData } from "./useLabData";
import type { LabSession, SessionStatus, Student, SubjectArea } from "@/src/domain/model";

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
  const initialClassroomId = data.classrooms[0]?.id ?? "";
  const [classroomId, setClassroomId] = useState(initialClassroomId);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:50");
  const [subjectArea, setSubjectArea] = useState<SubjectArea>("robotics");
  const [teamPresetId, setTeamPresetId] = useState(() => data.presets.find((preset) => preset.scope === "team" && preset.subjectArea === "robotics")?.id ?? data.presets.find((preset) => preset.scope === "team" && preset.subjectArea === "generic")?.id ?? "");
  const [individualPresetId, setIndividualPresetId] = useState(() => data.presets.find((preset) => preset.scope === "individual" && (preset.subjectArea === "robotics" || preset.subjectArea === "generic"))?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const classroomStudents = data.students.filter((student) => student.classroomId === classroomId && student.active);
  const groupNames = Array.from(new Set(classroomStudents.map((student) => student.groupName).filter((name): name is string => Boolean(name)))).sort().join(", ") || "Whole class";
  const teamPresetOptions = data.presets.filter((preset) => preset.scope === "team" && preset.active);
  const individualPresetOptions = data.presets.filter((preset) => preset.scope === "individual" && preset.active);

  function changeClassroom(id: string) {
    setClassroomId(id);
  }

  function changeSubject(value: SubjectArea) {
    setSubjectArea(value);
    const defaultTeamPreset = data.presets.find((preset) => preset.scope === "team" && preset.active && preset.subjectArea === value)
      ?? data.presets.find((preset) => preset.scope === "team" && preset.active && preset.subjectArea === "generic");
    setTeamPresetId(defaultTeamPreset?.id ?? "");
    setIndividualPresetId(data.presets.find((preset) => preset.scope === "individual" && preset.active)?.id ?? "");
  }

  async function createSession() {
    const cleanTitle = title.trim();
    const groups = Array.from(new Set(groupNames.split(/[,\n]/).map((name) => name.trim()).filter(Boolean)));
    if (!groups.length) groups.push("Whole class");
    if (!classroomId || !cleanTitle || !date) {
      setError("Choose a class and date, and add a session title.");
      return;
    }
    const students = classroomStudents;
    if (!students.length) {
      setError("This class has no active students to add to the session.");
      return;
    }
    const memberships = groups.map((name) => ({
      name,
      studentIds: name.toLocaleLowerCase() === "whole class"
        ? students.map((student) => student.id)
        : students.filter((student) => student.groupName?.toLocaleLowerCase() === name.toLocaleLowerCase()).map((student) => student.id),
    }));
    const emptyGroup = memberships.find((group) => group.studentIds.length === 0);
    if (emptyGroup) {
      setError(`“${emptyGroup.name}” has no students. Assign students to that group in Classes first.`);
      return;
    }
    const memberIds = Array.from(new Set(memberships.flatMap((group) => group.studentIds)));

    const sessionId = "session-" + crypto.randomUUID();
    await repositories.sessions.put({
      id: sessionId,
      classroomId,
      groupName: groups.length === 1 ? groups[0] : groups.length + " groups",
      title: cleanTitle,
      date,
      startTime,
      endTime,
      subjectArea,
      teamPresetId: teamPresetId || undefined,
      individualPresetId: individualPresetId || undefined,
      status: "active",
      notes: notes.trim() || undefined,
    });
    await Promise.all(memberships.map(async ({ name, studentIds }, index) => {
      await repositories.teams.put({
        id: sessionId + "-group-" + String(index + 1),
        sessionId,
        name,
        studentIds,
        operationalStatus: "not-started",
      });
    }));
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
          <label>Class<select value={classroomId} onChange={(event) => changeClassroom(event.target.value)}>{data.classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></label>
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Sensor calibration" autoFocus /></label>
          <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Subject<select value={subjectArea} onChange={(event) => changeSubject(event.target.value as SubjectArea)}><option value="robotics">Robotics</option><option value="digital-electronics">Digital Electronics</option><option value="3d-printing">3D Printing</option><option value="generic">General</option></select></label>
          <label>Team preset<select value={teamPresetId} onChange={(event) => setTeamPresetId(event.target.value)}>{teamPresetOptions.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {subjectLabels[preset.subjectArea]}</option>)}</select></label>
          <label>Individual preset<select value={individualPresetId} onChange={(event) => setIndividualPresetId(event.target.value)}><option value="">None</option>{individualPresetOptions.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {subjectLabels[preset.subjectArea]}</option>)}</select></label>
          <label>From<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <label>To<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
          <label className="session-form__wide">Notes<textarea className="session-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Optional session note" /></label>
        </div>
        {error && <p className="session-dialog__error" role="alert">{error}</p>}
        <footer><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button type="button" className="finish-anyway" onClick={() => void createSession()}><Plus size={14} />Create</button></footer>
      </section>
    </div>
  );
}

function EditSessionDialog({ session, data, onClose, onSaved }: { session: LabSession; data: LabData; onClose: () => void; onSaved: () => Promise<void> }) {
  const [classroomId, setClassroomId] = useState(session.classroomId);
  const [groupName, setGroupName] = useState(session.groupName ?? "Whole class");
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startTime ?? "");
  const [endTime, setEndTime] = useState(session.endTime ?? "");
  const [subjectArea, setSubjectArea] = useState<SubjectArea>(session.subjectArea);
  const [teamPresetId, setTeamPresetId] = useState(session.teamPresetId ?? "");
  const [individualPresetId, setIndividualPresetId] = useState(session.individualPresetId ?? "");
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!classroomId || !title.trim() || !date) {
      setError("Choose a class and date, and add a session title.");
      return;
    }
    setSaving(true);
    await repositories.sessions.put({
      ...session,
      classroomId,
      groupName: groupName.trim() || "Whole class",
      title: title.trim(),
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      subjectArea,
      teamPresetId: teamPresetId || undefined,
      individualPresetId: individualPresetId || undefined,
      status,
      notes: notes.trim() || undefined,
    });
    await onSaved();
    onClose();
  }

  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-session-title">
      <section className="session-dialog">
        <header><div className="finish-icon"><Pencil size={17} /></div><div><span>Editable session record</span><h2 id="edit-session-title">Edit session</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="session-form">
          <label>Class<select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>{data.classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as SessionStatus)}><option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
          <label className="session-form__wide">Title<input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
          <label>Group summary<input value={groupName} onChange={(event) => setGroupName(event.target.value)} /></label>
          <label>Subject<select value={subjectArea} onChange={(event) => setSubjectArea(event.target.value as SubjectArea)}><option value="robotics">Robotics</option><option value="digital-electronics">Digital Electronics</option><option value="3d-printing">3D Printing</option><option value="generic">General</option></select></label>
          <label>Team preset<select value={teamPresetId} onChange={(event) => setTeamPresetId(event.target.value)}><option value="">Automatic by subject</option>{data.presets.filter((preset) => preset.scope === "team").map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
          <label>Individual preset<select value={individualPresetId} onChange={(event) => setIndividualPresetId(event.target.value)}><option value="">None</option>{data.presets.filter((preset) => preset.scope === "individual").map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
          <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>From<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <label>To<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
          <label className="session-form__wide">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label>
        </div>
        <p className="session-dialog__hint">A completed session can be corrected and kept completed, or reopened by changing its status to Active.</p>
        {error && <p className="session-dialog__error" role="alert">{error}</p>}
        <footer><button type="button" className="button-quiet" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="finish-anyway" onClick={() => void save()} disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save"}</button></footer>
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
        <footer><button type="button" className="button-quiet" onClick={onClose} disabled={deleting}>Keep</button><button type="button" className="delete-session-button" onClick={() => void confirmDelete()} disabled={deleting}><Trash2 size={14} />{deleting ? "Deleting…" : "Delete"}</button></footer>
      </section>
    </div>
  );
}

function SessionDetail({ session, data, onClose, onEdit }: { session: LabSession; data: LabData; onClose: () => void; onEdit: () => void }) {
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
          <div className="history-drawer__actions"><button type="button" className="drawer-edit-button" onClick={onEdit}><Pencil size={14} />Edit</button><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
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
  const [editSession, setEditSession] = useState<LabSession | null>(null);
  const selected = data.sessions.find((session) => session.id === selectedId);
  const sessions = data.sessions.filter((session) =>
    (classroomId === "all" || session.classroomId === classroomId) &&
    (subject === "all" || session.subjectArea === subject) &&
    (status === "all" || session.status === status) &&
    (!date || session.date === date),
  );
  return (
    <div className="session-history-workspace">
      <header className="history-header"><div><span className="eyebrow">Evidence archive</span><h1>Session history</h1><p>Reconstruct attendance, membership and evidence exactly as recorded.</p></div><button type="button" className="new-session-button" onClick={() => setShowNewSession(true)}><Plus size={15} />New</button></header>
      <section className="history-filters">
        <h2><Filter size={15} />Filters</h2>
        <label>Classroom<select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}><option value="all">All classes</option>{data.classrooms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Subject<select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">All subjects</option><option value="robotics">Robotics</option><option value="digital-electronics">Digital Electronics</option><option value="3d-printing">3D Printing</option></select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Any status</option><option value="active">Active</option><option value="completed">Completed</option><option value="draft">Draft</option></select></label>
        <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <button className="history-filters__clear" type="button" disabled={classroomId === "all" && subject === "all" && status === "all" && !date} onClick={() => { setClassroomId("all"); setSubject("all"); setStatus("all"); setDate(""); }}><X size={12} />Clear</button>
      </section>
      <section className="history-browser">
        <div className="history-browser__head"><span>{sessions.length} sessions</span><span>Newest first</span></div>
        {!sessions.length && (
          <div className="history-empty">
            <CalendarDays size={26} />
            <h2>No laboratory sessions yet</h2>
            <p>Create the first session only when you need it. Deleted sessions will stay deleted.</p>
            <button type="button" className="new-session-button" onClick={() => setShowNewSession(true)}><Plus size={15} />Create</button>
          </div>
        )}
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
      {selected && <SessionDetail session={selected} data={data} onClose={() => setSelectedId(null)} onEdit={() => setEditSession(selected)} />}
      {showNewSession && <NewSessionDialog data={data} onClose={() => setShowNewSession(false)} onCreated={onReload} />}
      {editSession && <EditSessionDialog session={editSession} data={data} onClose={() => setEditSession(null)} onSaved={async () => { await onReload(); }} />}
      {deleteSession && <DeleteSessionDialog session={deleteSession} data={data} onClose={() => setDeleteSession(null)} onDeleted={async () => { setSelectedId(null); await onReload(); }} />}
    </div>
  );
}
