"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock3,
  Minus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { repositories } from "@/src/data/dexie";
import type {
  AssessmentScore,
  AttendanceStatus,
  SessionTeam,
  TeacherSupportLevel,
  TeamOperationalStatus,
} from "@/src/domain/model";
import type { LabData } from "./useLabData";

const scoreLabels: Record<AssessmentScore, string> = {
  1: "Needs improvement",
  2: "Developing",
  3: "Good",
  4: "Very good",
};

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

function cx(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}

interface ScoreControlProps {
  value?: AssessmentScore;
  onChange: (score?: AssessmentScore) => void;
  compact?: boolean;
}

function ScoreControl({ value, onChange, compact = false }: ScoreControlProps) {
  return (
    <div className={cx("score-control", compact && "score-control--compact")} aria-label="Assessment score">
      <button
        className={cx(value === undefined && "is-selected is-empty")}
        onClick={() => onChange(undefined)}
        title="Not observed"
        aria-label="Not observed"
        type="button"
      >
        <Minus size={14} />
      </button>
      {([1, 2, 3, 4] as const).map((score) => (
        <button
          className={cx(value === score && "is-selected")}
          key={score}
          onClick={() => onChange(score)}
          title={String(score) + " — " + scoreLabels[score]}
          aria-label={String(score) + " — " + scoreLabels[score]}
          type="button"
        >
          {score}
        </button>
      ))}
    </div>
  );
}

function AttendanceMark({ status }: { status?: AttendanceStatus }) {
  if (!status || status === "present") return null;
  const label = status === "left-early" ? "Early" : attendanceLabels[status];
  return <span className={cx("attendance-mark", "attendance-mark--" + status)}>{label}</span>;
}

function TeamCard({
  team,
  data,
  selected,
  onSelect,
}: {
  team: SessionTeam;
  data: LabData;
  selected: boolean;
  onSelect: () => void;
}) {
  const members = team.studentIds
    .map((id) => data.students.find((student) => student.id === id))
    .filter((student) => student !== undefined);
  const observations = data.teamObservations.filter(
    (observation) => observation.teamId === team.id && observation.score !== undefined,
  );
  const average = observations.length
    ? observations.reduce((sum, observation) => sum + (observation.score ?? 0), 0) / observations.length
    : undefined;
  const assistance = data.teacherAssistance.find((item) => item.teamId === team.id);

  return (
    <button
      type="button"
      className={cx("team-card", selected && "team-card--selected")}
      onClick={onSelect}
      aria-label={"Open " + team.name}
    >
      <div className="team-card__head">
        <div>
          <span className="team-card__eyebrow">Work group</span>
          <h3>{team.name}</h3>
        </div>
        <ChevronRight size={17} aria-hidden="true" />
      </div>
      <div className="team-card__members">
        {members.map((student) => {
          const attendance = data.attendance.find((record) => record.studentId === student.id);
          return (
            <div className="team-member" key={student.id}>
              <span className="avatar">{student.firstName[0]}{student.lastName[0]}</span>
              <span>{student.shortName ?? student.firstName}</span>
              <AttendanceMark status={attendance?.status} />
            </div>
          );
        })}
      </div>
      <div className="team-card__footer">
        <span className={cx("status-badge", "status-badge--" + team.operationalStatus)}>
          {team.operationalStatus === "needs-help" && <AlertTriangle size={13} />}
          {team.operationalStatus === "finished" && <Check size={13} />}
          {statusLabels[team.operationalStatus]}
        </span>
        <span className="team-card__metrics">
          {assistance && assistance.level > 0 && (
            <span title="Teacher support level"><Wrench size={13} />{assistance.level}</span>
          )}
          <span>{average ? average.toFixed(1) : "—"} avg.</span>
        </span>
      </div>
    </button>
  );
}

interface TeamPanelProps {
  team: SessionTeam;
  data: LabData;
  onClose: () => void;
  onReload: () => Promise<void>;
}

function TeamPanel({ team, data, onClose, onReload }: TeamPanelProps) {
  const members = team.studentIds
    .map((id) => data.students.find((student) => student.id === id))
    .filter((student) => student !== undefined);
  const [selectedStudentId, setSelectedStudentId] = useState(members[0]?.id ?? "");
  const [savedMessage, setSavedMessage] = useState("");
  const criteria = data.criteria.filter(
    (criterion) => criterion.presetId === "preset-robotics" && criterion.name !== "Result",
  );
  const individualCriteria = data.criteria.filter((criterion) => criterion.scope === "individual");
  const assistance = data.teacherAssistance.find((item) => item.teamId === team.id);
  const practicalResult = data.practicalResults.find((item) => item.teamId === team.id);

  useEffect(() => {
    setSelectedStudentId(members[0]?.id ?? "");
  }, [team.id]);

  function flash(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 1600);
  }

  async function updateStatus(status: TeamOperationalStatus) {
    await repositories.teams.updateStatus(team.id, status);
    await onReload();
    flash("Team status saved");
  }

  async function updateTeamScore(criterionId: string, score?: AssessmentScore) {
    await repositories.teamObservations.put({
      id: "team-score-" + team.id + "-" + criterionId,
      teamId: team.id,
      sessionId: team.sessionId,
      criterionId,
      score,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash(score === undefined ? "Marked not observed" : "Team evidence saved");
  }

  async function updateSupport(level: TeacherSupportLevel) {
    await repositories.assistance.put({
      id: "assistance-" + team.id,
      teamId: team.id,
      sessionId: team.sessionId,
      level,
      interventionCount: assistance?.interventionCount,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash("Support level saved");
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
    flash("Practical result saved separately");
  }

  async function updateIndividualScore(criterionId: string, score?: AssessmentScore) {
    if (!selectedStudentId) return;
    await repositories.individualObservations.put({
      id: "individual-score-" + selectedStudentId + "-" + criterionId,
      studentId: selectedStudentId,
      sessionId: team.sessionId,
      criterionId,
      score,
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash("Individual evidence saved");
  }

  async function updateAttendance(status: AttendanceStatus) {
    if (!selectedStudentId) return;
    const existing = data.attendance.find((record) => record.studentId === selectedStudentId);
    await repositories.attendance.put({
      id: existing?.id ?? "attendance-" + selectedStudentId,
      studentId: selectedStudentId,
      sessionId: team.sessionId,
      status,
      reason: existing?.reason,
      events: [
        ...(existing?.events ?? []),
        {
          id: "event-" + crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          kind: status === "late" ? "arrived-late" : status === "left-early" ? "left-early" : "present",
        },
      ],
      note: existing?.note,
    });
    await onReload();
    flash("Attendance updated independently");
  }

  async function addBehaviour(type: "positive" | "incident") {
    if (!selectedStudentId) return;
    await repositories.behaviourObservations.put({
      id: "behaviour-" + crypto.randomUUID(),
      studentId: selectedStudentId,
      sessionId: team.sessionId,
      type,
      category: type === "positive" ? "good-attitude" : "distracted",
      timestamp: new Date().toISOString(),
    });
    await onReload();
    flash(type === "positive" ? "Positive note recorded" : "Incident recorded separately");
  }

  const selectedAttendance = data.attendance.find((record) => record.studentId === selectedStudentId);

  return (
    <aside className="team-panel" aria-label={team.name + " assessment panel"}>
      <div className="team-panel__header">
        <div>
          <span className="eyebrow">Live observation</span>
          <h2>{team.name}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close team panel">
          <X size={18} />
        </button>
      </div>

      <div className="team-panel__scroll">
        <section className="panel-section">
          <div className="section-label">Operational status</div>
          <div className="status-control">
            {(["not-started", "working", "needs-help", "finished"] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={cx(team.operationalStatus === status && "is-selected", "status-" + status)}
                onClick={() => void updateStatus(status)}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-row">
            <div>
              <div className="section-label">Team criteria</div>
              <p>1 needs improvement · 4 very good</p>
            </div>
            <span className="autosave-note">Saves instantly</span>
          </div>
          <div className="criteria-list">
            {criteria.map((criterion) => {
              const observation = data.teamObservations.find(
                (item) => item.teamId === team.id && item.criterionId === criterion.id,
              );
              return (
                <div className="criterion-row" key={criterion.id}>
                  <span>{criterion.name}</span>
                  <ScoreControl value={observation?.score} onChange={(score) => void updateTeamScore(criterion.id, score)} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel-section panel-section--separated">
          <div className="section-row">
            <div>
              <div className="section-label">Practical result</div>
              <p>Kept separate from process and behaviour</p>
            </div>
            <ScoreControl value={practicalResult?.score} compact onChange={(score) => void updateResult(score)} />
          </div>
        </section>

        <section className="panel-section">
          <div className="section-row">
            <div>
              <div className="section-label">Teacher assistance</div>
              <p>0 none · 3 continuous</p>
            </div>
            <div className="support-control" aria-label="Teacher support level">
              {([0, 1, 2, 3] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={cx((assistance?.level ?? 0) === level && "is-selected")}
                  onClick={() => void updateSupport(level)}
                  aria-label={"Teacher support level " + String(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel-section">
          <div className="section-label">Individual evidence <span className="optional-tag">Optional</span></div>
          <div className="member-tabs" role="tablist" aria-label="Team members">
            {members.map((student) => (
              <button
                key={student.id}
                type="button"
                className={cx(selectedStudentId === student.id && "is-selected")}
                onClick={() => setSelectedStudentId(student.id)}
              >
                {student.shortName ?? student.firstName}
              </button>
            ))}
          </div>
          <div className="attendance-inline">
            <span>Attendance</span>
            <select
              value={selectedAttendance?.status ?? "present"}
              onChange={(event) => void updateAttendance(event.target.value as AttendanceStatus)}
              aria-label="Attendance status"
            >
              {Object.entries(attendanceLabels).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="criteria-list criteria-list--individual">
            {individualCriteria.map((criterion) => {
              const observation = data.individualObservations.find(
                (item) => item.studentId === selectedStudentId && item.criterionId === criterion.id,
              );
              return (
                <div className="criterion-row" key={criterion.id}>
                  <span>{criterion.name}</span>
                  <ScoreControl
                    compact
                    value={observation?.score}
                    onChange={(score) => void updateIndividualScore(criterion.id, score)}
                  />
                </div>
              );
            })}
          </div>
          <div className="behaviour-actions">
            <button type="button" onClick={() => void addBehaviour("positive")}>+ Positive note</button>
            <button type="button" className="button-incident" onClick={() => void addBehaviour("incident")}>+ Incident</button>
          </div>
          <p className="integrity-note">Behaviour and attendance are recorded as separate evidence and never alter technical scores.</p>
        </section>
      </div>
      {savedMessage && <div className="save-toast"><Check size={14} />{savedMessage}</div>}
    </aside>
  );
}

export function TodayView({ data, onReload }: { data: LabData; onReload: () => Promise<void> }) {
  const session = data.sessions.find((item) => item.status === "active") ?? data.sessions[0];
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(data.teams[1]?.id ?? data.teams[0]?.id ?? null);
  const selectedTeam = data.teams.find((team) => team.id === selectedTeamId);

  const attendanceCounts = useMemo(() => {
    return data.attendance.reduce<Record<AttendanceStatus, number>>(
      (counts, record) => ({ ...counts, [record.status]: counts[record.status] + 1 }),
      { present: 0, absent: 0, late: 0, "left-early": 0, partial: 0 },
    );
  }, [data.attendance]);

  if (!session) {
    return <div className="empty-state"><h2>No session scheduled</h2><p>Create a session from the class area.</p></div>;
  }

  return (
    <div className={cx("today-layout", selectedTeam && "today-layout--panel")}>
      <div className="today-main">
        <section className="session-hero">
          <div className="session-hero__main">
            <div className="subject-icon"><Wrench size={19} /></div>
            <div>
              <div className="hero-meta">
                <span className="live-dot">Live</span>
                <span>Robotics</span>
                <span>{data.classrooms.find((item) => item.id === session.classroomId)?.name}</span>
              </div>
              <h1>{session.title}</h1>
              <p>{session.notes}</p>
            </div>
          </div>
          <div className="session-time">
            <Clock3 size={17} />
            <div><strong>{session.startTime}–{session.endTime}</strong><span>Session in progress</span></div>
          </div>
        </section>

        <section className="session-summary" aria-label="Session summary">
          <div><Users size={16} /><strong>{data.students.length}</strong><span>students</span></div>
          <div className="summary-present"><span className="summary-dot" /><strong>{attendanceCounts.present}</strong><span>present</span></div>
          <div className="summary-late"><span className="summary-dot" /><strong>{attendanceCounts.late}</strong><span>late</span></div>
          <div className="summary-absent"><span className="summary-dot" /><strong>{attendanceCounts.absent}</strong><span>absent</span></div>
          <div className="summary-early"><span className="summary-dot" /><strong>{attendanceCounts["left-early"]}</strong><span>left early</span></div>
          <div className="summary-progress">
            <span>{data.teams.filter((team) => team.operationalStatus === "finished").length}/{data.teams.length} teams finished</span>
            <div className="progress-track"><span style={{ width: String((data.teams.filter((team) => team.operationalStatus === "finished").length / data.teams.length) * 100) + "%" }} /></div>
          </div>
        </section>

        <div className="content-heading">
          <div><h2>Teams</h2><p>Select a team to record evidence</p></div>
          <span>{data.teamObservations.length} observations captured</span>
        </div>

        <div className="team-grid">
          {data.teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              data={data}
              selected={selectedTeamId === team.id}
              onSelect={() => setSelectedTeamId(team.id)}
            />
          ))}
        </div>
      </div>
      {selectedTeam && (
        <TeamPanel
          team={selectedTeam}
          data={data}
          onClose={() => setSelectedTeamId(null)}
          onReload={onReload}
        />
      )}
    </div>
  );
}
