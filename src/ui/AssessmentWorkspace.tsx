"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { repositories } from "@/src/data/dexie";
import type {
  AssessmentPeriod,
  AttendanceRecord,
  Criterion,
  IndividualObservation,
  LabSession,
  Student,
  TeamObservation,
  WeightConfiguration,
} from "@/src/domain/model";
import type { LabData } from "./useLabData";

type AssessmentTab = "overview" | "coverage" | "student" | "teams" | "configuration";
type SortKey = "name" | "attendance" | "evidence" | "incidents" | string;

function cx(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function sessionLabel(session?: LabSession): string {
  if (!session) return "Unknown session";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(session.date + "T12:00:00"));
}

function average(observations: IndividualObservation[] | TeamObservation[]): number | undefined {
  const values = observations.flatMap((item) => item.score === undefined ? [] : [item.score]);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

function attended(record: AttendanceRecord): boolean {
  return record.status !== "absent";
}

function attendanceRate(records: AttendanceRecord[]): number {
  return records.length ? records.filter(attended).length / records.length * 100 : 0;
}

function csvValue(value: unknown): string {
  const text = String(value ?? "");
  return '"' + text.replaceAll('"', '""') + '"';
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function EvidenceValue({ observations }: { observations: IndividualObservation[] }) {
  const value = average(observations);
  return (
    <span className={cx("assessment-value", observations.length > 0 && observations.length < 3 && "assessment-value--thin")}>
      <strong>{value === undefined ? "—" : value.toFixed(1)}</strong>
      <small>{observations.length} evidence</small>
    </span>
  );
}

function Sparkline({ observations }: { observations: IndividualObservation[] }) {
  const ordered = [...observations].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-8);
  return (
    <div className="evidence-sparkline" aria-label="Evidence evolution">
      {ordered.length ? ordered.map((item) => (
        <span key={item.id} style={{ height: String((item.score ?? 0) * 20) + "%" }} title={String(item.score) + " / 4"} />
      )) : <i>No evidence yet</i>}
    </div>
  );
}

function ExportMenu({
  data,
  sessionIds,
}: {
  data: LabData;
  sessionIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);

  function exportAttendance() {
    const rows: unknown[][] = [["Session", "Date", "Student", "Status", "Reason", "Events"]];
    data.attendance.filter((item) => sessionIds.has(item.sessionId)).forEach((record) => {
      const session = data.sessions.find((item) => item.id === record.sessionId);
      const student = data.students.find((item) => item.id === record.studentId);
      rows.push([
        session?.title ?? "",
        session?.date ?? "",
        student ? student.firstName + " " + student.lastName : "",
        record.status,
        record.reason ?? "",
        record.events.map((event) => event.kind + " " + new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })).join("; "),
      ]);
    });
    downloadCsv("rubrilab-attendance.csv", rows);
  }

  function exportIndividual() {
    const rows: unknown[][] = [["Session", "Date", "Student", "Criterion", "Score", "Note", "Timestamp"]];
    data.individualObservations.filter((item) => sessionIds.has(item.sessionId) && item.score !== undefined).forEach((item) => {
      const session = data.sessions.find((value) => value.id === item.sessionId);
      const student = data.students.find((value) => value.id === item.studentId);
      const criterion = data.criteria.find((value) => value.id === item.criterionId);
      rows.push([session?.title ?? "", session?.date ?? "", student ? student.firstName + " " + student.lastName : "", criterion?.name ?? "", item.score ?? "", item.note ?? "", item.timestamp]);
    });
    downloadCsv("rubrilab-individual-evidence.csv", rows);
  }

  function exportTeams() {
    const rows: unknown[][] = [["Session", "Date", "Team", "Members", "Criterion", "Score", "Teacher assistance", "Practical result", "Note"]];
    data.teams.filter((team) => sessionIds.has(team.sessionId)).forEach((team) => {
      const session = data.sessions.find((item) => item.id === team.sessionId);
      const members = team.studentIds.map((id) => data.students.find((student) => student.id === id)?.shortName).filter(Boolean).join("; ");
      const assistance = data.teacherAssistance.find((item) => item.teamId === team.id);
      const result = data.practicalResults.find((item) => item.teamId === team.id);
      const observations = data.teamObservations.filter((item) => item.teamId === team.id);
      if (!observations.length) rows.push([session?.title ?? "", session?.date ?? "", team.name, members, "", "", assistance?.level ?? 0, result?.score ?? "", team.note ?? ""]);
      observations.forEach((item) => rows.push([
        session?.title ?? "", session?.date ?? "", team.name, members,
        data.criteria.find((criterion) => criterion.id === item.criterionId)?.name ?? "",
        item.score ?? "", assistance?.level ?? 0, result?.score ?? "", item.note ?? team.note ?? "",
      ]));
    });
    downloadCsv("rubrilab-team-evidence.csv", rows);
  }

  return (
    <div className="export-menu">
      <button type="button" className="export-trigger" onClick={() => setOpen((value) => !value)}><Download size={14} />Export CSV<ChevronRight size={12} /></button>
      {open && (
        <div className="export-popover">
          <button type="button" onClick={exportAttendance}><FileSpreadsheet size={14} /><span>Attendance<small>One row per student and session</small></span></button>
          <button type="button" onClick={exportIndividual}><FileSpreadsheet size={14} /><span>Individual evidence<small>Criterion-level observations</small></span></button>
          <button type="button" onClick={exportTeams}><FileSpreadsheet size={14} /><span>Team evidence<small>Teams, scores, help and results</small></span></button>
        </div>
      )}
    </div>
  );
}

function ClassOverview({
  data,
  sessions,
  sessionIds,
  criteria,
  onStudent,
}: {
  data: LabData;
  sessions: LabSession[];
  sessionIds: Set<string>;
  criteria: Criterion[];
  onStudent: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const attendance = data.attendance.filter((item) => sessionIds.has(item.sessionId));
  const evidence = data.individualObservations.filter((item) => sessionIds.has(item.sessionId) && item.score !== undefined);
  const behaviour = data.behaviourObservations.filter((item) => sessionIds.has(item.sessionId));
  const minCoverage = Math.min(...data.students.flatMap((student) => criteria.map((criterion) =>
    evidence.filter((item) => item.studentId === student.id && item.criterionId === criterion.id).length,
  )));
  const lowCoverageStudents = new Set(data.students.filter((student) => criteria.some((criterion) =>
    evidence.filter((item) => item.studentId === student.id && item.criterionId === criterion.id).length === minCoverage,
  )).map((student) => student.id));
  const highHelp = data.teacherAssistance.filter((item) => sessionIds.has(item.sessionId) && item.level >= 2).length;
  const incomplete = sessions.filter((session) => session.status !== "completed").length;

  const rows = data.students.map((student) => {
    const studentAttendance = attendance.filter((item) => item.studentId === student.id);
    const studentEvidence = evidence.filter((item) => item.studentId === student.id);
    const incidents = behaviour.filter((item) => item.studentId === student.id && item.type === "incident").length;
    return { student, studentAttendance, studentEvidence, incidents };
  }).sort((a, b) => {
    if (sortKey === "attendance") return attendanceRate(a.studentAttendance) - attendanceRate(b.studentAttendance);
    if (sortKey === "evidence") return a.studentEvidence.length - b.studentEvidence.length;
    if (sortKey === "incidents") return b.incidents - a.incidents;
    if (sortKey.startsWith("criterion:")) {
      const criterionId = sortKey.replace("criterion:", "");
      return (average(a.studentEvidence.filter((item) => item.criterionId === criterionId)) ?? -1) - (average(b.studentEvidence.filter((item) => item.criterionId === criterionId)) ?? -1);
    }
    return a.student.lastName.localeCompare(b.student.lastName);
  });

  return (
    <div className="assessment-pane">
      <div className="action-metrics">
        <div><span>Sessions in period</span><strong>{sessions.length}</strong><small>{incomplete} incomplete</small></div>
        <div><span>Average attendance</span><strong>{attendanceRate(attendance).toFixed(0)}%</strong><small>Attendance is not graded</small></div>
        <div><span>Low coverage</span><strong>{lowCoverageStudents.size}</strong><small>students to observe</small></div>
        <div><span>Recent incidents</span><strong>{behaviour.filter((item) => item.type === "incident").length}</strong><small>kept separate</small></div>
        <div><span>High-assistance teams</span><strong>{highHelp}</strong><small>level 2–3 records</small></div>
      </div>
      <section className="review-surface">
        <div className="review-surface__head"><div><h2>Class evidence overview</h2><p>Every average includes its supporting evidence count.</p></div><span><ArrowDownUp size={12} />Select a heading to sort</span></div>
        <div className="assessment-table-wrap">
          <div className="assessment-table" style={{ "--criterion-count": criteria.length } as React.CSSProperties}>
            <div className="assessment-table__row assessment-table__row--head">
              <button type="button" onClick={() => setSortKey("name")}>Student</button>
              <button type="button" onClick={() => setSortKey("attendance")}>Attendance</button>
              {criteria.map((criterion) => <button type="button" key={criterion.id} onClick={() => setSortKey("criterion:" + criterion.id)} title={"Sort by " + criterion.name}>{criterion.name.replace("Technical learning", "Technical")}</button>)}
              <button type="button" onClick={() => setSortKey("evidence")}>Evidence</button>
              <button type="button" onClick={() => setSortKey("incidents")}>Incidents</button>
            </div>
            {rows.map(({ student, studentAttendance, studentEvidence, incidents }) => (
              <button type="button" className="assessment-table__row" key={student.id} onClick={() => onStudent(student.id)}>
                <span className="assessment-student"><span className="avatar">{student.firstName[0]}{student.lastName[0]}</span><span><strong>{student.lastName}, {student.firstName}</strong>{lowCoverageStudents.has(student.id) && <small>Needs observation</small>}</span></span>
                <span className="attendance-cell"><strong>{attendanceRate(studentAttendance).toFixed(0)}%</strong><small>{studentAttendance.filter((item) => item.status === "absent").length} absent</small></span>
                {criteria.map((criterion) => <EvidenceValue key={criterion.id} observations={studentEvidence.filter((item) => item.criterionId === criterion.id)} />)}
                <span className="total-evidence"><strong>{studentEvidence.length}</strong><small>items</small></span>
                <span className={cx("incident-cell", incidents > 0 && "has-incidents")}>{incidents}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CoverageView({
  data,
  sessionIds,
  criteria,
  onStudent,
}: {
  data: LabData;
  sessionIds: Set<string>;
  criteria: Criterion[];
  onStudent: (id: string) => void;
}) {
  const evidence = data.individualObservations.filter((item) => sessionIds.has(item.sessionId) && item.score !== undefined);
  const coverage = data.students.flatMap((student) => criteria.map((criterion) => ({
    student,
    criterion,
    count: evidence.filter((item) => item.studentId === student.id && item.criterionId === criterion.id).length,
  })));
  const priorities = [...coverage].sort((a, b) => a.count - b.count || a.student.lastName.localeCompare(b.student.lastName)).slice(0, 8);
  return (
    <div className="coverage-layout">
      <section className="review-surface">
        <div className="review-surface__head"><div><h2>Evidence coverage</h2><p>Counts only—this is not a score or grade.</p></div></div>
        <div className="coverage-table">
          <div className="coverage-row coverage-row--head"><span>Student</span>{criteria.map((criterion) => <span key={criterion.id}>{criterion.name.replace("Technical learning", "Technical")}</span>)}<span>Needs observation</span></div>
          {data.students.map((student) => {
            const counts = criteria.map((criterion) => evidence.filter((item) => item.studentId === student.id && item.criterionId === criterion.id).length);
            const minimum = Math.min(...counts);
            const needs = criteria.filter((_, index) => counts[index] === minimum).map((item) => item.name).slice(0, 2);
            return (
              <button type="button" className="coverage-row" key={student.id} onClick={() => onStudent(student.id)}>
                <span><strong>{student.firstName} {student.lastName}</strong></span>
                {counts.map((count, index) => <span key={criteria[index].id} className={cx(count === 0 && "coverage-zero", count === minimum && "coverage-low")}>{count}</span>)}
                <span className="coverage-need">{needs.join(" · ")}</span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="observe-list">
        <span className="eyebrow">Planning aid</span>
        <h2>Students to observe</h2>
        <p>Lowest evidence coverage in the selected period.</p>
        <div>
          {priorities.map((item, index) => (
            <button type="button" key={item.student.id + item.criterion.id} onClick={() => onStudent(item.student.id)}>
              <span>{index + 1}</span><span><strong>{item.student.firstName} {item.student.lastName}</strong><small>{item.criterion.name} — {item.count === 0 ? "no evidence" : "only " + String(item.count) + " evidence"}</small></span><ChevronRight size={13} />
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function StudentProfile({
  student,
  data,
  sessions,
  sessionIds,
  criteria,
  onSelect,
}: {
  student: Student;
  data: LabData;
  sessions: LabSession[];
  sessionIds: Set<string>;
  criteria: Criterion[];
  onSelect: (id: string) => void;
}) {
  const observations = data.individualObservations.filter((item) => item.studentId === student.id && sessionIds.has(item.sessionId) && item.score !== undefined);
  const attendance = data.attendance.filter((item) => item.studentId === student.id && sessionIds.has(item.sessionId));
  const behaviour = data.behaviourObservations.filter((item) => item.studentId === student.id && sessionIds.has(item.sessionId));
  const teams = data.teams.filter((team) => sessionIds.has(team.sessionId) && team.studentIds.includes(student.id));
  const classroom = data.classrooms.find((item) => item.id === student.classroomId);
  return (
    <div className="student-profile">
      <header className="student-profile__header">
        <div className="profile-person"><span className="avatar profile-avatar">{student.firstName[0]}{student.lastName[0]}</span><div><span>{classroom?.name} · Student evidence</span><h2>{student.firstName} {student.lastName}</h2></div></div>
        <select value={student.id} onChange={(event) => onSelect(event.target.value)} aria-label="Select student">{data.students.map((item) => <option value={item.id} key={item.id}>{item.lastName}, {item.firstName}</option>)}</select>
        <dl><div><dt>Attendance</dt><dd>{attendanceRate(attendance).toFixed(0)}%</dd></div><div><dt>Sessions</dt><dd>{sessions.length}</dd></div><div><dt>Individual evidence</dt><dd>{observations.length}</dd></div></dl>
      </header>
      <section className="profile-criteria-grid">
        {criteria.map((criterion) => {
          const criterionEvidence = observations.filter((item) => item.criterionId === criterion.id);
          const value = average(criterionEvidence);
          return (
            <article className="criterion-profile" key={criterion.id}>
              <header><div><span>Individual criterion</span><h3>{criterion.name}</h3></div>{criterionEvidence.length < 3 && <span className="limited-evidence"><AlertTriangle size={11} />Limited evidence</span>}</header>
              <div className="criterion-profile__value"><strong>{value === undefined ? "—" : value.toFixed(1) + " / 4"}</strong><span>{criterionEvidence.length} observation{criterionEvidence.length === 1 ? "" : "s"}</span></div>
              <Sparkline observations={criterionEvidence} />
              <details>
                <summary>Recent evidence <ChevronRight size={12} /></summary>
                <div className="recent-evidence">
                  {[...criterionEvidence].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5).map((item) => {
                    const session = data.sessions.find((value) => value.id === item.sessionId);
                    return <div key={item.id}><span>{sessionLabel(session)}<small>{session?.title}</small></span><strong>{item.score} / 4</strong>{item.note && <p>{item.note}</p>}</div>;
                  })}
                  {!criterionEvidence.length && <p>No observations in this period.</p>}
                </div>
              </details>
            </article>
          );
        })}
      </section>

      <div className="profile-history-grid">
        <section className="review-surface profile-history">
          <div className="review-surface__head"><div><h2>Attendance history</h2><p>Attendance is shown separately and never changes scores.</p></div></div>
          <div className="history-summary-strip">
            {(["present", "absent", "late", "left-early", "partial"] as const).map((status) => <span key={status}><strong>{attendance.filter((item) => item.status === status).length}</strong>{status.replace("-", " ")}</span>)}
          </div>
          <div className="timeline-list">
            {[...attendance].sort((a, b) => (data.sessions.find((item) => item.id === b.sessionId)?.date ?? "").localeCompare(data.sessions.find((item) => item.id === a.sessionId)?.date ?? "")).map((record) => {
              const session = data.sessions.find((item) => item.id === record.sessionId);
              return <div key={record.id}><span className={"timeline-dot timeline-dot--" + record.status} /><div><strong>{sessionLabel(session)} · {session?.title}</strong><small>{record.status.replace("-", " ")}{record.events.length ? " · " + record.events.map((event) => new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " " + event.kind.replace("-", " ")).join("; ") : ""}</small></div></div>;
            })}
          </div>
        </section>
        <section className="review-surface profile-history">
          <div className="review-surface__head"><div><h2>Behaviour history</h2><p>Visible and mathematically separate from technical evidence.</p></div></div>
          <div className="behaviour-summary"><span className="positive-count"><CheckCircle2 size={13} />Positive <strong>{behaviour.filter((item) => item.type === "positive").length}</strong></span><span className="incident-count"><AlertTriangle size={13} />Incidents <strong>{behaviour.filter((item) => item.type === "incident").length}</strong></span></div>
          <div className="timeline-list">
            {[...behaviour].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((item) => {
              const session = data.sessions.find((value) => value.id === item.sessionId);
              return <div key={item.id}><span className={cx("timeline-dot", item.type === "positive" ? "timeline-dot--positive" : "timeline-dot--incident")} /><div><strong>{sessionLabel(session)} · {item.category.replaceAll("-", " ")}</strong><small>{session?.title}</small>{item.note && <p>{item.note}</p>}</div></div>;
            })}
            {!behaviour.length && <p className="empty-copy">No behaviour observations in this period.</p>}
          </div>
        </section>
      </div>

      <section className="review-surface">
        <div className="review-surface__head"><div><h2>Team history</h2><p>Each result stays attached to its session-specific team and membership.</p></div></div>
        <div className="student-team-history">
          {teams.map((team) => {
            const session = data.sessions.find((item) => item.id === team.sessionId);
            const members = team.studentIds.map((id) => data.students.find((item) => item.id === id)).filter((item): item is Student => item !== undefined);
            const teamEvidence = data.teamObservations.filter((item) => item.teamId === team.id && item.score !== undefined);
            const assistance = data.teacherAssistance.find((item) => item.teamId === team.id);
            const result = data.practicalResults.find((item) => item.teamId === team.id);
            return (
              <article key={team.id}>
                <div><span>{sessionLabel(session)} · {session?.subjectArea.replaceAll("-", " ")}</span><h3>{session?.title} · {team.name}</h3><p>{members.map((item) => item.shortName).join(", ")}</p></div>
                <div className="team-history-scores">{teamEvidence.slice(0, 4).map((item) => <span key={item.id}>{data.criteria.find((criterion) => criterion.id === item.criterionId)?.name}<strong>{item.score}</strong></span>)}</div>
                <div className="team-history-meta"><span>Help <strong>{assistance?.level ?? 0}</strong></span><span>Result <strong>{result?.score ?? "—"}</strong></span></div>
                {(team.note || teamEvidence.some((item) => item.note)) && <p className="team-history-note">{team.note ?? teamEvidence.find((item) => item.note)?.note}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TeamOverview({ data, sessionIds }: { data: LabData; sessionIds: Set<string> }) {
  const teams = data.teams.filter((team) => sessionIds.has(team.sessionId));
  return (
    <section className="review-surface">
      <div className="review-surface__head"><div><h2>Team-performance evidence</h2><p>Session-specific teams only. These values are never merged into individual scores.</p></div></div>
      <div className="team-overview-list">
        {teams.map((team) => {
          const session = data.sessions.find((item) => item.id === team.sessionId);
          const evidence = data.teamObservations.filter((item) => item.teamId === team.id && item.score !== undefined);
          const assistance = data.teacherAssistance.find((item) => item.teamId === team.id);
          const result = data.practicalResults.find((item) => item.teamId === team.id);
          return (
            <article key={team.id}>
              <div><span>{sessionLabel(session)}</span><strong>{session?.title}</strong><small>{team.name} · {team.studentIds.map((id) => data.students.find((item) => item.id === id)?.shortName).filter(Boolean).join(", ")}</small></div>
              <div className="team-overview-criteria">{evidence.slice(0, 4).map((item) => <span key={item.id}>{data.criteria.find((criterion) => criterion.id === item.criterionId)?.name}<strong>{item.score} / 4</strong></span>)}</div>
              <span className="team-overview-help">Assistance<strong>{assistance?.level ?? 0}</strong></span>
              <span className="team-overview-result">Result<strong>{result?.score ?? "—"}</strong></span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ConfigurationView({ data, onReload }: { data: LabData; onReload: () => Promise<void> }) {
  const classroom = data.classrooms[0];
  const config = data.weightConfigurations[0];
  const individualCriteria = data.criteria.filter((item) => item.active && item.scope === "individual");
  const teamCriteria = data.criteria.filter((item) => item.active && item.presetId === "preset-common");

  async function updateConfig(patch: Partial<WeightConfiguration>) {
    const current = config ?? {
      id: "weights-default-" + classroom.id,
      classroomId: classroom.id,
      teamPerformance: 25,
      individualPerformance: 45,
      practicalResult: 30,
      teamCriterionWeights: {},
      individualCriterionWeights: {},
    };
    await repositories.assessmentConfiguration.putWeights({ ...current, ...patch });
    await onReload();
  }

  async function addPeriod() {
    const year = new Date().getFullYear();
    const period: AssessmentPeriod = {
      id: "period-custom-" + crypto.randomUUID(),
      classroomId: classroom.id,
      name: "Custom period",
      startDate: year + "-09-01",
      endDate: year + "-12-20",
      active: false,
    };
    await repositories.assessmentConfiguration.putPeriod(period);
    await onReload();
  }

  return (
    <div className="configuration-grid">
      <section className="review-surface">
        <div className="review-surface__head"><div><h2>Assessment periods</h2><p>Periods filter session evidence; they never duplicate it.</p></div><button type="button" className="small-add" onClick={() => void addPeriod()}><Plus size={12} />Custom period</button></div>
        <div className="period-list">{data.assessmentPeriods.map((period) => <div key={period.id}><CalendarRange size={15} /><span><strong>{period.name}</strong><small>{period.startDate} — {period.endDate}</small></span>{period.active && <b>Active</b>}</div>)}</div>
      </section>
      <section className="review-surface">
        <div className="review-surface__head"><div><h2>Optional category weighting</h2><p>Configuration only—no official or calculated grade is shown.</p></div></div>
        <div className="weight-list">
          {[["Team performance", "teamPerformance"], ["Individual performance", "individualPerformance"], ["Practical result", "practicalResult"]].map(([label, key]) => (
            <label key={key}><span>{label}</span><span><input type="number" min="0" max="100" value={config?.[key as keyof WeightConfiguration] as number ?? 0} onChange={(event) => void updateConfig({ [key]: Number(event.target.value) })} />%</span></label>
          ))}
        </div>
        <p className="weight-note"><ClipboardCheck size={13} />Teacher final judgement remains distinct and is never overwritten.</p>
      </section>
      <section className="review-surface">
        <div className="review-surface__head"><div><h2>Team criterion weighting</h2><p>No universal defaults are assumed.</p></div></div>
        <div className="weight-list">{teamCriteria.map((criterion) => <label key={criterion.id}><span>{criterion.name}</span><span><input type="number" min="0" max="100" value={config?.teamCriterionWeights[criterion.id] ?? 0} onChange={(event) => void updateConfig({ teamCriterionWeights: { ...(config?.teamCriterionWeights ?? {}), [criterion.id]: Number(event.target.value) } })} />%</span></label>)}</div>
      </section>
      <section className="review-surface">
        <div className="review-surface__head"><div><h2>Individual criterion weighting</h2><p>Optional and configurable by criterion.</p></div></div>
        <div className="weight-list">{individualCriteria.map((criterion) => <label key={criterion.id}><span>{criterion.name}</span><span><input type="number" min="0" max="100" value={config?.individualCriterionWeights[criterion.id] ?? 0} onChange={(event) => void updateConfig({ individualCriterionWeights: { ...(config?.individualCriterionWeights ?? {}), [criterion.id]: Number(event.target.value) } })} />%</span></label>)}</div>
      </section>
    </div>
  );
}

export function AssessmentWorkspace({ data, onReload, initialStudentId }: { data: LabData; onReload: () => Promise<void>; initialStudentId?: string }) {
  const [tab, setTab] = useState<AssessmentTab>(initialStudentId ? "student" : "overview");
  const [periodId, setPeriodId] = useState("all");
  const [studentId, setStudentId] = useState(initialStudentId ?? data.students[0]?.id ?? "");
  const selectedPeriod = data.assessmentPeriods.find((item) => item.id === periodId);
  const sessions = data.sessions.filter((session) => !selectedPeriod || (session.date >= selectedPeriod.startDate && session.date <= selectedPeriod.endDate));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const individualPresetIds = new Set(sessions.flatMap((session) => session.individualPresetId ? [session.individualPresetId] : []));
  const individualCriteria = data.criteria.filter((item) => item.active && item.scope === "individual" && (!individualPresetIds.size || individualPresetIds.has(item.presetId)));
  const student = data.students.find((item) => item.id === studentId) ?? data.students[0];

  function openStudent(id: string) {
    setStudentId(id);
    setTab("student");
  }

  return (
    <div className="assessment-workspace">
      <header className="assessment-header">
        <div><span className="eyebrow">Evidence review</span><h1>Assessment</h1><p>Transparent evidence for teacher judgement—not an automatic grading machine.</p></div>
        <div className="assessment-header__tools">
          <label><span>Period</span><select value={periodId} onChange={(event) => setPeriodId(event.target.value)}><option value="all">All periods</option>{data.assessmentPeriods.map((period) => <option value={period.id} key={period.id}>{period.name}</option>)}</select></label>
          <ExportMenu data={data} sessionIds={sessionIds} />
        </div>
      </header>
      <nav className="assessment-tabs" aria-label="Assessment views">
        {([
          ["overview", "Class overview"],
          ["coverage", "Evidence coverage"],
          ["student", "Student profile"],
          ["teams", "Team evidence"],
          ["configuration", "Configuration"],
        ] as Array<[AssessmentTab, string]>).map(([id, label]) => <button key={id} type="button" className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {tab === "overview" && <ClassOverview data={data} sessions={sessions} sessionIds={sessionIds} criteria={individualCriteria} onStudent={openStudent} />}
      {tab === "coverage" && <CoverageView data={data} sessionIds={sessionIds} criteria={individualCriteria} onStudent={openStudent} />}
      {tab === "student" && student && <StudentProfile student={student} data={data} sessions={sessions} sessionIds={sessionIds} criteria={individualCriteria} onSelect={setStudentId} />}
      {tab === "teams" && <TeamOverview data={data} sessionIds={sessionIds} />}
      {tab === "configuration" && <ConfigurationView data={data} onReload={onReload} />}
    </div>
  );
}
