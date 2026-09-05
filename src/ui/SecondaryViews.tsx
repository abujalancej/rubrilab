"use client";

import {
  Archive,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleUserRound,
  Download,
  RotateCcw,
  Settings2,
  Users,
} from "lucide-react";
import { repositories } from "@/src/data/dexie";
import type { AttendanceStatus, SubjectArea } from "@/src/domain/model";
import type { LabData } from "./useLabData";

const subjectLabels: Record<SubjectArea, string> = {
  robotics: "Robotics",
  "digital-electronics": "Digital Electronics",
  "3d-printing": "3D Printing",
  generic: "General",
};

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  "left-early": "Left early",
  partial: "Partial",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(date + "T12:00:00"),
  );
}

export function ClassesView({ data }: { data: LabData }) {
  const classroom = data.classrooms[0];
  return (
    <div className="view-stack">
      <section className="class-overview">
        <div className="class-monogram">3B</div>
        <div className="class-overview__copy">
          <span className="eyebrow">Active class</span>
          <h1>{classroom?.name}</h1>
          <p>{classroom?.academicYear} · {data.students.filter((student) => student.active).length} active students</p>
        </div>
        <div className="class-overview__stats">
          <div><strong>{data.sessions.length}</strong><span>practical sessions</span></div>
          <div><strong>{data.individualObservations.length}</strong><span>individual observations</span></div>
        </div>
      </section>

      <section className="surface">
        <div className="surface__header">
          <div><h2>Students</h2><p>Only classroom-essential information is stored.</p></div>
          <span className="record-count">{data.students.length} records</span>
        </div>
        <div className="student-table" role="table" aria-label="Student list">
          <div className="student-row student-row--header" role="row">
            <span>Student</span><span>Session attendance</span><span>Evidence</span><span />
          </div>
          {data.students.map((student, index) => {
            const attendance = data.attendance.find((record) => record.studentId === student.id);
            const evidence = data.individualObservations.filter((item) => item.studentId === student.id).length;
            return (
              <div className="student-row" role="row" key={student.id}>
                <span className="student-identity">
                  <span className="row-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="avatar avatar--large">{student.firstName[0]}{student.lastName[0]}</span>
                  <span><strong>{student.lastName}, {student.firstName}</strong><small>{student.shortName}</small></span>
                </span>
                <span>
                  <span className={"attendance-badge attendance-badge--" + (attendance?.status ?? "present")}>
                    {attendanceLabels[attendance?.status ?? "present"]}
                  </span>
                </span>
                <span className="evidence-count">{evidence ? String(evidence) + " observation" + (evidence === 1 ? "" : "s") : "Not observed"}</span>
                <span><ChevronRight size={16} /></span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function HistoryView({ data }: { data: LabData }) {
  return (
    <div className="view-stack">
      <div className="view-intro">
        <div><span className="eyebrow">Session record</span><h1>History</h1><p>Past and current practical work, in teaching order.</p></div>
        <div className="filter-pills"><button className="is-selected" type="button">All</button><button type="button">Robotics</button><button type="button">Electronics</button><button type="button">3D printing</button></div>
      </div>
      <section className="surface session-list">
        {data.sessions.map((session) => {
          const sessionTeams = data.teams.filter((team) => team.sessionId === session.id);
          const observations = data.teamObservations.filter((item) => item.sessionId === session.id).length;
          return (
            <article className="session-list__row" key={session.id}>
              <div className={"session-type-icon session-type-icon--" + session.subjectArea}><BookOpenCheck size={18} /></div>
              <div className="session-list__date"><strong>{formatDate(session.date)}</strong><span>{session.startTime}–{session.endTime}</span></div>
              <div className="session-list__title"><h3>{session.title}</h3><p>{subjectLabels[session.subjectArea]} · 3 ESO B</p></div>
              <div className="session-list__facts">
                <span>{sessionTeams.length ? String(sessionTeams.length) + " teams" : "Archived team snapshot"}</span>
                <span>{observations ? String(observations) + " observations" : "Evidence archived"}</span>
              </div>
              <span className={"session-status session-status--" + session.status}>{session.status === "active" ? "Live now" : "Completed"}</span>
              <ChevronRight size={17} />
            </article>
          );
        })}
      </section>
      <p className="integrity-banner"><Archive size={15} /> Team membership is stored with each session, so later regrouping never rewrites history.</p>
    </div>
  );
}

export function AssessmentView({ data }: { data: LabData }) {
  const scoredTeam = data.teamObservations.filter((item) => item.score !== undefined);
  const avg = scoredTeam.length
    ? scoredTeam.reduce((sum, item) => sum + (item.score ?? 0), 0) / scoredTeam.length
    : 0;
  return (
    <div className="view-stack">
      <div className="view-intro">
        <div><span className="eyebrow">Evidence register</span><h1>Assessment</h1><p>Technical evidence is reviewable without becoming a final grade formula.</p></div>
      </div>
      <div className="metric-grid">
        <div className="metric"><span>Team observations</span><strong>{data.teamObservations.length}</strong><small>Across {new Set(data.teamObservations.map((item) => item.teamId)).size} teams</small></div>
        <div className="metric"><span>Individual observations</span><strong>{data.individualObservations.length}</strong><small>Optional evidence only</small></div>
        <div className="metric"><span>Observed team average</span><strong>{avg.toFixed(1)}</strong><small>Indicative, not a grade</small></div>
        <div className="metric"><span>Behaviour records</span><strong>{data.behaviourObservations.length}</strong><small>Stored separately</small></div>
      </div>
      <section className="surface">
        <div className="surface__header"><div><h2>Recent evidence</h2><p>Obstacle Avoiding Robot · 3 ESO B</p></div></div>
        <div className="evidence-table">
          <div className="evidence-row evidence-row--header"><span>Scope</span><span>Person / team</span><span>Criterion</span><span>Level</span><span>Recorded</span></div>
          {data.teamObservations.slice(0, 7).map((observation) => {
            const team = data.teams.find((item) => item.id === observation.teamId);
            const criterion = data.criteria.find((item) => item.id === observation.criterionId);
            return (
              <div className="evidence-row" key={observation.id}>
                <span><span className="scope-icon"><Users size={14} />Team</span></span>
                <strong>{team?.name}</strong>
                <span>{criterion?.name}</span>
                <span>{observation.score ? <span className="level-chip">Level {observation.score}</span> : "Not observed"}</span>
                <span>{new Date(observation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            );
          })}
          {data.individualObservations.slice(0, 3).map((observation) => {
            const student = data.students.find((item) => item.id === observation.studentId);
            const criterion = data.criteria.find((item) => item.id === observation.criterionId);
            return (
              <div className="evidence-row" key={observation.id}>
                <span><span className="scope-icon scope-icon--individual"><CircleUserRound size={14} />Individual</span></span>
                <strong>{student?.firstName} {student?.lastName}</strong>
                <span>{criterion?.name}</span>
                <span>{observation.score ? <span className="level-chip">Level {observation.score}</span> : "Not observed"}</span>
                <span>{new Date(observation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function SettingsView({ data, onReload }: { data: LabData; onReload: () => Promise<void> }) {
  async function exportData() {
    const snapshot = await repositories.exportSnapshot();
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "rubrilab-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function resetDemo() {
    await repositories.resetDemo();
    await onReload();
  }

  return (
    <div className="view-stack">
      <div className="view-intro">
        <div><span className="eyebrow">Workspace configuration</span><h1>Settings</h1><p>Subject presets are starting points and can evolve without changing historical evidence.</p></div>
      </div>
      <section className="surface">
        <div className="surface__header"><div><h2>Assessment presets</h2><p>Four-level scale · Not observed is stored as an empty value, never zero.</p></div><Settings2 size={19} /></div>
        <div className="preset-grid">
          {data.presets.map((preset) => {
            const criteria = preset.criterionIds
              .map((id) => data.criteria.find((criterion) => criterion.id === id))
              .filter((criterion) => criterion !== undefined);
            return (
              <article className="preset-card" key={preset.id}>
                <div className="preset-card__head">
                  <div><span className="preset-scope">{preset.scope}</span><h3>{preset.name}</h3></div>
                  <span className="active-check"><Check size={13} />Active</span>
                </div>
                <ol>{criteria.map((criterion) => <li key={criterion.id}><span>{criterion.position + 1}</span>{criterion.name}</li>)}</ol>
              </article>
            );
          })}
        </div>
      </section>
      <section className="surface data-section">
        <div><Download size={19} /><div><h2>Local data</h2><p>All records stay in this browser and persist across restarts. Keep a portable JSON backup when needed.</p></div></div>
        <div className="data-actions">
          <button className="button-secondary" type="button" onClick={() => void exportData()}><Download size={15} />Export backup</button>
          <button className="button-quiet" type="button" onClick={() => void resetDemo()}><RotateCcw size={15} />Reset demo</button>
        </div>
      </section>
    </div>
  );
}
