"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flag,
  HandHelping,
  Minus,
  NotebookPen,
  PlayCircle,
  Plus,
  RotateCcw,
  Timer,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { repositories } from "@/src/data/dexie";
import {
  type AssessmentScore,
  type AttendanceEvent,
  type AttendanceStatus,
  type BehaviourObservation,
  type LabSession,
  type SessionTeam,
  type Student,
  type TeacherSupportLevel,
  type TeamOperationalStatus,
} from "@/src/domain/model";
import type { LabData } from "./useLabData";

const scores = [1, 2, 3, 4] as const;
const teamStatuses = ["not-started", "working", "needs-help", "finished"] as const;
const statusLabels: Record<TeamOperationalStatus, string> = {
  "not-started": "Not started",
  working: "Working",
  "needs-help": "Needs help",
  finished: "Finished",
};
const attendanceLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  "left-early": "Left early",
  partial: "Partial",
};
const incidentLabels = {
  distracted: "Distracted",
  "repeated-distraction": "Repeated distraction",
  "distracts-team": "Distracts team",
  "interrupts-class": "Interrupts class",
  "inappropriate-equipment-use": "Inappropriate equipment use",
  "does-not-follow-instructions": "Does not follow instructions",
  "unsafe-behaviour": "Unsafe behaviour",
  "conflict-with-classmates": "Conflict with classmates",
  "inappropriate-phone-use": "Inappropriate phone use",
  other: "Other",
} as const;
const positiveLabels = {
  "helps-teammates": "Helps teammates",
  "takes-initiative": "Takes initiative",
  "responsible-equipment-use": "Responsible equipment use",
  "supports-another-student": "Supports another student",
  "good-attitude": "Good attitude",
  other: "Other",
} as const;

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function todayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date + "T12:00:00"));
}

function timeNow(): string {
  const now = new Date();
  return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}

function elapsedLabel(session: LabSession, tick: number): string {
  void tick;
  if (!session.startTime || session.status !== "active") return session.status === "completed" ? "Completed" : "Not started";
  const [hours, minutes] = session.startTime.split(":").map(Number);
  const start = new Date(session.date + "T" + session.startTime + ":00");
  start.setHours(hours, minutes, 0, 0);
  const elapsed = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
  return elapsed >= 60 ? String(Math.floor(elapsed / 60)) + "h " + String(elapsed % 60) + "m" : String(elapsed) + " min";
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ScoreButtons({
  value,
  onChange,
  label,
}: {
  value?: AssessmentScore;
  onChange: (value?: AssessmentScore) => void;
  label: string;
}) {
  return (
    <div className="quick-scores" role="group" aria-label={label}>
      {scores.map((score) => (
        <button
          key={score}
          type="button"
          className={cx(value === score && "is-selected")}
          onClick={() => onChange(score)}
          aria-label={label + ", level " + String(score)}
        >
          {score}
        </button>
      ))}
      {value !== undefined && (
        <button type="button" className="score-clear" onClick={() => onChange(undefined)} title="Clear observation" aria-label={"Clear " + label}>
          <Minus size={12} />
        </button>
      )}
    </div>
  );
}

function AttendancePill({ status }: { status: AttendanceStatus }) {
  if (status === "present") return null;
  return <span className={"member-attendance member-attendance--" + status}>{status === "left-early" ? "Early" : attendanceLabels[status]}</span>;
}

interface TeamCardProps {
  team: SessionTeam;
  data: LabData;
  onReload: () => Promise<void>;
  onStudent: (studentId: string) => void;
  flash: (message: string) => void;
}

function ActiveTeamCard({ team, data, onReload, onStudent, flash }: TeamCardProps) {
  const members = team.studentIds
    .map((id) => data.students.find((student) => student.id === id))
    .filter((student): student is Student => student !== undefined);
  const criteria = data.criteria
    .filter((criterion) => criterion.presetId === "preset-robotics" && criterion.name !== "Result")
    .slice(0, 3);
  const assistance = data.teacherAssistance.find((item) => item.teamId === team.id);
  const practicalResult = data.practicalResults.find((item) => item.teamId === team.id);

  async function updateStatus(status: TeamOperationalStatus) {
    await repositories.teams.updateStatus(team.id, status);
    await onReload();
    flash(team.name + " · " + statusLabels[status]);
  }

  async function updateScore(criterionId: string, score?: AssessmentScore) {
    await repositories.teamObservations.put({
      id: "team-score-" + team.id + "-" + criterionId,
      teamId: team.id,
      sessionId: team.sessionId,
      criterionId,
      score,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash(team.name + " evidence saved");
  }

  async function updateResult(score?: AssessmentScore) {
    await repositories.practicalResults.put({
      id: "result-" + team.id,
      teamId: team.id,
      sessionId: team.sessionId,
      score,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash(team.name + " result saved separately");
  }

  async function updateSupport(level: TeacherSupportLevel, count = assistance?.interventionCount ?? 0) {
    await repositories.assistance.put({
      id: "assistance-" + team.id,
      teamId: team.id,
      sessionId: team.sessionId,
      level,
      interventionCount: count,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash(team.name + " help level " + String(level));
  }

  async function addHelp() {
    const count = (assistance?.interventionCount ?? 0) + 1;
    const suggested = count === 1 ? 1 : count <= 3 ? 2 : 3;
    const level = Math.max(assistance?.level ?? 0, suggested) as TeacherSupportLevel;
    await updateSupport(level, count);
  }

  async function saveNote(note: string) {
    if (note.trim() === (team.note ?? "")) return;
    await repositories.teams.updateNote(team.id, note);
    await onReload();
    flash(team.name + " note saved");
  }

  return (
    <article className={cx("active-team-card", team.operationalStatus === "needs-help" && "active-team-card--help", team.operationalStatus === "finished" && "active-team-card--finished")}>
      <header className="active-team-card__header">
        <div>
          <span>Team</span>
          <h2>{team.name.replace("Team ", "")}</h2>
        </div>
        <span className={"team-state team-state--" + team.operationalStatus}>
          {team.operationalStatus === "needs-help" && <AlertTriangle size={12} />}
          {team.operationalStatus === "finished" && <Check size={12} />}
          {statusLabels[team.operationalStatus]}
        </span>
      </header>

      <div className="team-status-strip" role="group" aria-label={team.name + " status"}>
        {teamStatuses.map((status) => (
          <button
            key={status}
            type="button"
            className={cx(team.operationalStatus === status && "is-selected", status === "needs-help" && "is-help")}
            onClick={() => void updateStatus(status)}
            title={statusLabels[status]}
            aria-label={team.name + ", " + statusLabels[status]}
          >
            {status === "not-started" ? "Not started" : status === "needs-help" ? "Help" : statusLabels[status]}
          </button>
        ))}
      </div>

      <div className="compact-members">
        {members.map((student) => {
          const attendance = data.attendance.find((record) => record.studentId === student.id && record.sessionId === team.sessionId);
          return (
            <button type="button" key={student.id} onClick={() => onStudent(student.id)} className={cx(attendance?.status === "absent" && "is-absent")}>
              <span className="avatar">{student.firstName[0]}{student.lastName[0]}</span>
              <span>{student.shortName ?? student.firstName}</span>
              <AttendancePill status={attendance?.status ?? "present"} />
              <ChevronRight size={12} />
            </button>
          );
        })}
      </div>

      <div className="on-card-assessment">
        {criteria.map((criterion) => {
          const observation = data.teamObservations.find((item) => item.teamId === team.id && item.criterionId === criterion.id);
          return (
            <div className="on-card-row" key={criterion.id}>
              <span>{criterion.name}</span>
              <ScoreButtons label={team.name + " " + criterion.name} value={observation?.score} onChange={(score) => void updateScore(criterion.id, score)} />
            </div>
          );
        })}
        <div className="on-card-row on-card-row--result">
          <span>Practical result</span>
          <ScoreButtons label={team.name + " practical result"} value={practicalResult?.score} onChange={(score) => void updateResult(score)} />
        </div>
      </div>

      <div className="team-help-row">
        <span><HandHelping size={13} />Teacher help</span>
        <div className="help-levels" role="group" aria-label={team.name + " teacher help"}>
          {([0, 1, 2, 3] as const).map((level) => (
            <button key={level} type="button" className={cx((assistance?.level ?? 0) === level && "is-selected")} onClick={() => void updateSupport(level)}>
              {level}
            </button>
          ))}
        </div>
        <button type="button" className="help-tap" onClick={() => void addHelp()}>
          <Plus size={12} />Help
          {(assistance?.interventionCount ?? 0) > 0 && <b>{assistance?.interventionCount}</b>}
        </button>
      </div>

      <label className="team-note">
        <NotebookPen size={13} />
        <input
          type="text"
          maxLength={240}
          defaultValue={team.note}
          placeholder="Optional team note"
          onBlur={(event) => void saveNote(event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        />
      </label>
    </article>
  );
}

interface StudentPanelProps {
  student: Student;
  team?: SessionTeam;
  session: LabSession;
  data: LabData;
  onReload: () => Promise<void>;
  onClose: () => void;
  flash: (message: string) => void;
}

function StudentPanel({ student, team, session, data, onReload, onClose, flash }: StudentPanelProps) {
  const [behaviourMode, setBehaviourMode] = useState<"positive" | "incident" | null>(null);
  const [editingEvents, setEditingEvents] = useState(false);
  const attendance = data.attendance.find((record) => record.studentId === student.id && record.sessionId === session.id);
  const individualCriteria = data.criteria.filter((criterion) => criterion.scope === "individual");

  async function saveAttendance(status: AttendanceStatus) {
    const previous = attendance?.status;
    const eventKind: AttendanceEvent["kind"] =
      status === "late" ? "arrived-late" :
      status === "left-early" ? "left-early" :
      previous === "left-early" && status === "partial" ? "returned" : "present";
    const events = status === "absent"
      ? attendance?.events ?? []
      : [...(attendance?.events ?? []), { id: "event-" + crypto.randomUUID(), timestamp: new Date().toISOString(), kind: eventKind }];
    await repositories.attendance.put({
      id: attendance?.id ?? "attendance-" + student.id,
      studentId: student.id,
      sessionId: session.id,
      status,
      reason: attendance?.reason,
      events,
      note: attendance?.note,
    });
    await onReload();
    flash(student.firstName + " · " + attendanceLabels[status]);
  }

  async function updateEvent(eventId: string, localTimestamp: string) {
    if (!attendance) return;
    await repositories.attendance.put({
      ...attendance,
      events: attendance.events.map((event) => event.id === eventId ? { ...event, timestamp: new Date(localTimestamp).toISOString() } : event),
    });
    await onReload();
    flash("Attendance time updated");
  }

  async function saveStudentNote(note: string) {
    await repositories.attendance.put({
      id: attendance?.id ?? "attendance-" + student.id,
      studentId: student.id,
      sessionId: session.id,
      status: attendance?.status ?? "present",
      events: attendance?.events ?? [],
      reason: attendance?.reason,
      note: note.trim() || undefined,
    });
    await onReload();
    flash("Student note saved");
  }

  async function updateIndividual(criterionId: string, score?: AssessmentScore) {
    await repositories.individualObservations.put({
      id: "individual-score-" + student.id + "-" + criterionId,
      studentId: student.id,
      sessionId: session.id,
      criterionId,
      score,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash(student.firstName + " evidence saved");
  }

  async function addBehaviour(category: BehaviourObservation["category"]) {
    if (!behaviourMode) return;
    await repositories.behaviourObservations.put({
      id: "behaviour-" + crypto.randomUUID(),
      studentId: student.id,
      sessionId: session.id,
      type: behaviourMode,
      category,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash((behaviourMode === "positive" ? "Positive" : "Incident") + " recorded for " + student.firstName);
    setBehaviourMode(null);
  }

  const categoryEntries = behaviourMode === "positive" ? Object.entries(positiveLabels) : Object.entries(incidentLabels);

  return (
    <>
      <button type="button" className="drawer-scrim" onClick={onClose} aria-label="Close student panel" />
      <aside className="student-drawer" aria-label={student.firstName + " quick panel"}>
        <header>
          <div className="drawer-student">
            <span className="avatar avatar--drawer">{student.firstName[0]}{student.lastName[0]}</span>
            <div><span>{team?.name} · Individual evidence</span><h2>{student.firstName} {student.lastName}</h2></div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="student-drawer__body">
          <section className="drawer-section">
            <div className="drawer-section__title">
              <div><span>Attendance</span><strong className={"attendance-current attendance-current--" + (attendance?.status ?? "present")}>{attendanceLabels[attendance?.status ?? "present"]}</strong></div>
              <button type="button" className="text-button" onClick={() => setEditingEvents((value) => !value)}>Edit times</button>
            </div>
            <div className="attendance-actions">
              <button type="button" onClick={() => void saveAttendance("present")}><UserCheck size={14} />Present</button>
              <button type="button" onClick={() => void saveAttendance("absent")}><X size={14} />Absent</button>
              <button type="button" onClick={() => void saveAttendance("late")}><Clock3 size={14} />Late</button>
              <button type="button" onClick={() => void saveAttendance("left-early")}><Flag size={14} />Leave early</button>
              <button type="button" onClick={() => void saveAttendance("partial")}><RotateCcw size={14} />Return / partial</button>
            </div>
            {editingEvents && (
              <div className="attendance-events">
                {attendance?.events.length ? attendance.events.map((event) => (
                  <label key={event.id}><span>{event.kind.replaceAll("-", " ")}</span><input type="datetime-local" value={toLocalInput(event.timestamp)} onChange={(e) => void updateEvent(event.id, e.target.value)} /></label>
                )) : <p>No timed attendance events.</p>}
              </div>
            )}
          </section>

          <section className="drawer-section">
            <div className="drawer-section__title"><div><span>Individual evidence</span><small>Record only what you observe</small></div></div>
            <div className="drawer-criteria">
              {individualCriteria.map((criterion) => {
                const observation = data.individualObservations.find((item) => item.studentId === student.id && item.sessionId === session.id && item.criterionId === criterion.id);
                return (
                  <div className="drawer-criterion" key={criterion.id}>
                    <span>{criterion.name}</span>
                    <ScoreButtons label={student.firstName + " " + criterion.name} value={observation?.score} onChange={(score) => void updateIndividual(criterion.id, score)} />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section__title"><div><span>Behaviour</span><small>Stored separately from assessment</small></div></div>
            <div className="behaviour-choice">
              <button type="button" className={cx(behaviourMode === "positive" && "is-selected")} onClick={() => setBehaviourMode("positive")}>
                <CheckCircle2 size={15} />Positive
              </button>
              <button type="button" className={cx("incident-choice", behaviourMode === "incident" && "is-selected")} onClick={() => setBehaviourMode("incident")}>
                <AlertTriangle size={15} />Incident
              </button>
            </div>
            {behaviourMode && (
              <div className={cx("behaviour-categories", behaviourMode === "incident" && "behaviour-categories--incident")}>
                {categoryEntries.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => void addBehaviour(value as BehaviourObservation["category"])}>{label}</button>
                ))}
              </div>
            )}
          </section>

          <section className="drawer-section">
            <label className="student-note">
              <span>Optional session note</span>
              <textarea defaultValue={attendance?.note} maxLength={240} rows={2} placeholder="Add a short note…" onBlur={(event) => void saveStudentNote(event.currentTarget.value)} />
            </label>
          </section>
        </div>
      </aside>
    </>
  );
}

function FinishSummary({
  session,
  data,
  onCancel,
  onFinish,
}: {
  session: LabSession;
  data: LabData;
  onCancel: () => void;
  onFinish: () => Promise<void>;
}) {
  const sessionTeams = data.teams.filter((team) => team.sessionId === session.id);
  const observedTeamIds = new Set(data.teamObservations.filter((item) => item.sessionId === session.id && item.score !== undefined).map((item) => item.teamId));
  const teamsWithoutEvidence = sessionTeams.filter((team) => !observedTeamIds.has(team.id));
  const incidentStudentIds = new Set(data.behaviourObservations.filter((item) => item.sessionId === session.id && item.type === "incident").map((item) => item.studentId));
  const unfinishedTeams = sessionTeams.filter((team) => team.operationalStatus !== "finished");
  const sessionAttendance = data.attendance.filter((item) => item.sessionId === session.id);
  const absent = sessionAttendance.filter((item) => item.status === "absent").length;
  const exceptions = sessionAttendance.filter((item) => item.status !== "present").length;
  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="finish-title">
      <section className="finish-dialog">
        <header><div className="finish-icon"><Flag size={18} /></div><div><span>Session review</span><h2 id="finish-title">Finish “{session.title}”?</h2></div></header>
        <p>Missing evidence is valid. This check is only here to prevent accidental omissions.</p>
        <dl>
          <div><dt>Attendance</dt><dd>{data.students.length - absent} attended · {exceptions} exceptions</dd></div>
          <div className={cx(teamsWithoutEvidence.length > 0 && "has-warning")}><dt>Teams with no observations</dt><dd>{teamsWithoutEvidence.length}</dd></div>
          <div><dt>Students with incidents</dt><dd>{incidentStudentIds.size}</dd></div>
          <div className={cx(unfinishedTeams.length > 0 && "has-warning")}><dt>Unfinished teams</dt><dd>{unfinishedTeams.length}</dd></div>
          <div><dt>Individual evidence items</dt><dd>{data.individualObservations.filter((item) => item.sessionId === session.id && item.score !== undefined).length}</dd></div>
        </dl>
        <footer><button type="button" className="button-quiet" onClick={onCancel}>Continue session</button><button type="button" className="finish-anyway" onClick={() => void onFinish()}><Check size={14} />Finish anyway</button></footer>
      </section>
    </div>
  );
}

export function TodayView({ data, onReload }: { data: LabData; onReload: () => Promise<void> }) {
  const session = data.sessions.find((item) => item.status === "active") ?? data.sessions[0];
  const classroom = data.classrooms.find((item) => item.id === session?.classroomId);
  const sessionTeams = data.teams.filter((team) => team.sessionId === session?.id);
  const sessionAttendance = data.attendance.filter((record) => record.sessionId === session?.id);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [message, setMessage] = useState("");
  const [tick, setTick] = useState(0);
  const selectedStudent = data.students.find((student) => student.id === selectedStudentId);
  const studentTeam = sessionTeams.find((team) => team.studentIds.includes(selectedStudentId ?? ""));

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const attendanceCounts = useMemo(() => sessionAttendance.reduce<Record<AttendanceStatus, number>>(
    (counts, record) => ({ ...counts, [record.status]: counts[record.status] + 1 }),
    { present: 0, absent: 0, late: 0, "left-early": 0, partial: 0 },
  ), [sessionAttendance]);

  function flash(next: string) {
    setMessage(next);
    window.setTimeout(() => setMessage(""), 1700);
  }

  async function markAllPresent() {
    await Promise.all(data.students.map(async (student) => {
      const existing = data.attendance.find((record) => record.studentId === student.id && record.sessionId === session.id);
      await repositories.attendance.put({
        id: existing?.id ?? "attendance-" + student.id,
        studentId: student.id,
        sessionId: session.id,
        status: "present",
        events: [...(existing?.events ?? []), { id: "event-" + crypto.randomUUID(), timestamp: new Date().toISOString(), kind: "present" }],
        note: existing?.note,
      });
    }));
    await onReload();
    flash("All students marked present — edit exceptions as needed");
  }

  async function finishSession() {
    await repositories.sessions.put({ ...session, status: "completed", endTime: timeNow() });
    await onReload();
    setShowFinish(false);
    flash("Session completed");
  }

  if (!session) return <div className="empty-state"><h2>No session scheduled</h2></div>;

  return (
    <div className="active-session">
      <header className="active-session__header">
        <div className="active-session__identity">
          <div className="active-session__class"><span>Classroom</span><strong>{classroom?.name}</strong></div>
          <div className="active-session__title">
            <span>{session.subjectArea.replace("-", " ")} · {todayLabel(session.date)}</span>
            <h1>{session.title}</h1>
          </div>
        </div>
        <div className="active-session__actions">
          <span className={"session-mode session-mode--" + session.status}>{session.status === "active" ? <PlayCircle size={13} /> : <Check size={13} />}{session.status}</span>
          <span className="elapsed"><Timer size={14} />{elapsedLabel(session, tick)}</span>
          <button type="button" className="mark-present" onClick={() => void markAllPresent()}><UserCheck size={15} />Mark all present</button>
          {session.status === "active" && <button type="button" className="finish-session" onClick={() => setShowFinish(true)}><Flag size={14} />Finish session</button>}
        </div>
      </header>

      <div className="active-session__summary">
        <span><Users size={14} /><strong>{data.students.length}</strong> students</span>
        <span className="present-summary"><i />{attendanceCounts.present} present</span>
        <span className="absent-summary"><i />{attendanceCounts.absent} absent</span>
        <span className="late-summary"><i />{attendanceCounts.late} late</span>
        <span className="early-summary"><i />{attendanceCounts["left-early"]} left early</span>
        <span className="teams-summary">{sessionTeams.filter((team) => team.operationalStatus === "finished").length}/{sessionTeams.length} teams finished</span>
      </div>

      <div className="active-grid-heading">
        <div><h2>Classroom teams</h2><p>Scores save with one tap. Select a student for attendance, individual evidence or behaviour.</p></div>
        <span>{data.teamObservations.filter((item) => item.sessionId === session.id && item.score !== undefined).length} team evidence items</span>
      </div>

      <div className="active-team-grid">
        {sessionTeams.map((team) => (
          <ActiveTeamCard key={team.id} team={team} data={data} onReload={onReload} onStudent={setSelectedStudentId} flash={flash} />
        ))}
      </div>

      {selectedStudent && (
        <StudentPanel student={selectedStudent} team={studentTeam} session={session} data={data} onReload={onReload} onClose={() => setSelectedStudentId(null)} flash={flash} />
      )}
      {showFinish && <FinishSummary session={session} data={data} onCancel={() => setShowFinish(false)} onFinish={finishSession} />}
      {message && <div className="session-toast"><Check size={14} />{message}</div>}
    </div>
  );
}
