"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Users,
  X,
} from "lucide-react";
import type { LabSession, Student, SubjectArea } from "@/src/domain/model";
import type { LabData } from "./useLabData";

const subjectLabels: Record<SubjectArea, string> = {
  robotics: "Robotics",
  "digital-electronics": "Digital Electronics",
  "3d-printing": "3D Printing",
  generic: "General",
};

function prettyDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
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
          <div><span>{prettyDate(session.date)} · {subjectLabels[session.subjectArea]}</span><h2>{session.title}</h2><p>3 ESO B · {session.startTime}–{session.endTime}</p></div>
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

export function SessionHistoryView({ data }: { data: LabData }) {
  const [classroomId, setClassroomId] = useState("all");
  const [subject, setSubject] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.sessions.find((session) => session.id === selectedId);
  const sessions = data.sessions.filter((session) =>
    (classroomId === "all" || session.classroomId === classroomId) &&
    (subject === "all" || session.subjectArea === subject) &&
    (status === "all" || session.status === status) &&
    (!date || session.date === date),
  );
  return (
    <div className="session-history-workspace">
      <header className="history-header"><div><span className="eyebrow">Evidence archive</span><h1>Session history</h1><p>Reconstruct attendance, membership and evidence exactly as recorded.</p></div></header>
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
            <button type="button" className="history-session-row" key={session.id} onClick={() => setSelectedId(session.id)}>
              <span className={"history-subject history-subject--" + session.subjectArea}><CalendarDays size={17} /></span>
              <span className="history-date"><strong>{prettyDate(session.date)}</strong><small><Clock3 size={10} />{session.startTime}–{session.endTime}</small></span>
              <span className="history-title"><strong>{session.title}</strong><small>{subjectLabels[session.subjectArea]} · {data.classrooms.find((item) => item.id === session.classroomId)?.name}</small></span>
              <span className="history-fact"><Users size={12} />{teams.length} teams</span>
              <span className="history-fact">{attendance.filter((item) => item.status !== "absent").length}/{attendance.length} attended</span>
              <span className="history-fact">{evidence} evidence</span>
              <span className={"history-status history-status--" + session.status}>{session.status}</span>
              <ChevronRight size={15} />
            </button>
          );
        })}
      </section>
      {selected && <SessionDetail session={selected} data={data} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
