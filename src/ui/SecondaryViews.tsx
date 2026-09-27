"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleUserRound,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { repositories } from "@/src/data/dexie";
import type { AssessmentPreset, CriterionScope, SubjectArea } from "@/src/domain/model";
import type { LabData } from "./useLabData";
import { StudentImportDialog } from "./StudentImportDialog";

const subjectLabels: Record<SubjectArea, string> = {
  robotics: "Robotics",
  "digital-electronics": "Digital Electronics",
  "3d-printing": "3D Printing",
  generic: "General",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(date + "T12:00:00"),
  );
}

export function ClassesView({ data }: { data: LabData }) {
  const [classroomId, setClassroomId] = useState(data.classrooms[0]?.id ?? "");
  const classroom = data.classrooms.find((item) => item.id === classroomId) ?? data.classrooms[0];
  const classroomStudents = data.students
    .filter((student) => student.classroomId === classroom?.id)
    .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`));
  const groups = Array.from(new Set(classroomStudents.map((student) => student.groupName).filter((name): name is string => Boolean(name)))).sort();
  const activeStudents = data.students.filter((student) => student.active).length;
  const loadedGroups = new Set(data.students.map((student) => student.groupName).filter(Boolean)).size;

  return (
    <div className="view-stack">
      <div className="view-intro">
        <div><span className="eyebrow">Classroom data</span><h1>Classroom viewer</h1><p>{data.classrooms.length} classes · {activeStudents} active students · {loadedGroups} laboratory groups loaded</p></div>
      </div>
      <section className="surface class-catalog">
        <div className="surface__header">
          <div><h2>Imported roster</h2><p>Students and laboratory groups from the school package.</p></div>
          {data.classrooms.length > 0 && <label className="class-selector"><span className="sr-only">Select class</span><select value={classroom?.id ?? ""} onChange={(event) => setClassroomId(event.target.value)}>{data.classrooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        </div>
        {classroom ? <>
          <div className="class-catalog__summary">
            <div><span>Class</span><strong>{classroom.name}</strong></div>
            <div><span>Academic year</span><strong>{classroom.academicYear}</strong></div>
            <div><span>Students</span><strong>{classroomStudents.filter((student) => student.active).length}</strong></div>
            <div><span>Laboratory groups</span><strong>{groups.length || "—"}</strong></div>
          </div>
          <div className="class-viewer" role="table" aria-label={`${classroom.name} imported roster`}>
            <div className="class-viewer__row class-viewer__row--header" role="row"><span>Student</span><span>Laboratory group</span><span>School ID</span></div>
            {classroomStudents.map((student, index) => <div className="class-viewer__row" role="row" key={student.id}><span><small>{String(index + 1).padStart(2, "0")}</small><strong>{student.lastName}, {student.firstName}</strong></span><span>{student.groupName ?? "Unassigned"}</span><span>{student.externalId ?? "—"}</span></div>)}
            {classroomStudents.length === 0 && <div className="student-table__empty"><Users size={24} /><strong>No students in this class</strong><span>Import the school package from Settings to view students and laboratory groups here.</span></div>}
          </div>
        </> : <div className="student-table__empty"><Users size={24} /><strong>No classroom package loaded</strong><span>Import a CSV or JSON package from Settings to inspect its classes, students and groups.</span></div>}
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

function PresetEditorDialog({ preset, data, onClose, onSaved, onDelete }: { preset?: AssessmentPreset; data: LabData; onClose: () => void; onSaved: () => Promise<void>; onDelete?: () => void }) {
  const existingCriteria = preset
    ? data.criteria.filter((criterion) => criterion.presetId === preset.id).sort((left, right) => left.position - right.position)
    : [];
  const [name, setName] = useState(preset?.name ?? "");
  const [scope, setScope] = useState<CriterionScope>(preset?.scope ?? "team");
  const [subjectArea, setSubjectArea] = useState<SubjectArea>(preset?.subjectArea ?? "generic");
  const [active, setActive] = useState(preset?.active ?? true);
  const [criteriaText, setCriteriaText] = useState(existingCriteria.filter((criterion) => criterion.active).map((criterion) => criterion.name).join("\n"));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cleanName = name.trim();
    const criterionNames = criteriaText.split("\n").map((value) => value.trim()).filter(Boolean);
    if (!cleanName) {
      setError("Give this preset a name.");
      return;
    }
    if (!criterionNames.length) {
      setError("Add at least one criterion.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const presetId = preset?.id ?? `preset-${crypto.randomUUID()}`;
      const nextCriteria = criterionNames.map((criterionName, position) => {
        const current = existingCriteria[position];
        return {
          id: current?.id ?? `criterion-${crypto.randomUUID()}`,
          name: criterionName,
          scope,
          subjectArea,
          presetId,
          position,
          active: true,
        };
      });
      await Promise.all([
        repositories.presets.put({ id: presetId, name: cleanName, scope, subjectArea, criterionIds: nextCriteria.map((criterion) => criterion.id), active }),
        ...nextCriteria.map((criterion) => repositories.presets.putCriterion(criterion)),
        ...existingCriteria.slice(criterionNames.length).map((criterion) => repositories.presets.putCriterion({ ...criterion, active: false })),
      ]);
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The preset could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="preset-editor-title">
      <section className="session-dialog preset-editor">
        <header><div className="finish-icon"><Settings2 size={18} /></div><div><span>{preset ? "Assessment preset" : "New assessment preset"}</span><h2 id="preset-editor-title">{preset ? "Edit preset" : "Create preset"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="session-form">
          <label className="session-form__wide">Preset name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Workshop safety" autoFocus /></label>
          <label>Applies to<select value={scope} onChange={(event) => setScope(event.target.value as CriterionScope)}><option value="team">Teams</option><option value="individual">Individuals</option></select></label>
          <label>Subject<select value={subjectArea} onChange={(event) => setSubjectArea(event.target.value as SubjectArea)}><option value="generic">General</option><option value="robotics">Robotics</option><option value="digital-electronics">Digital Electronics</option><option value="3d-printing">3D Printing</option></select></label>
          <label className="session-form__wide preset-editor__criteria">Criteria <textarea value={criteriaText} onChange={(event) => setCriteriaText(event.target.value)} rows={6} placeholder={"One criterion per line\ne.g. Uses tools safely"} /><small>One criterion per line. Saving keeps existing evidence records; removed lines are disabled for future sessions.</small></label>
          <label className="session-form__wide preset-editor__active"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Available when creating new sessions</label>
        </div>
        {error && <p className="session-dialog__error" role="alert">{error}</p>}
        <footer className="preset-editor__footer">{preset && <button type="button" className="delete-session-button" onClick={onDelete} disabled={saving}><Trash2 size={14} />Delete</button>}<span className="preset-editor__footer-spacer" /><button type="button" className="button-quiet" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="button-secondary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</button></footer>
      </section>
    </div>
  );
}

function DeletePresetDialog({ preset, onClose, onDeleted }: { preset: AssessmentPreset; onClose: () => void; onDeleted: () => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      await repositories.presets.remove(preset.id);
      await onDeleted();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The preset could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-preset-title">
      <section className="finish-dialog reset-workspace-dialog">
        <header><div className="finish-icon finish-icon--danger"><Trash2 size={18} /></div><div><span>Destructive action</span><h2 id="delete-preset-title">Delete “{preset.name}”?</h2></div></header>
        <p>This removes the preset and all of its criteria. Presets used by a session or recorded evidence cannot be deleted, so that history remains intact.</p>
        <div className="reset-workspace-dialog__warning"><AlertTriangle size={16} /><span>For a preset already used in class, uncheck its availability instead of deleting it.</span></div>
        <label className="reset-workspace-dialog__confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I understand that this unused preset and its criteria will be deleted.</label>
        {error && <p className="session-dialog__error" role="alert">{error}</p>}
        <footer><button type="button" className="button-quiet" onClick={onClose} disabled={deleting}>Cancel</button><button type="button" className="delete-session-button" onClick={() => void remove()} disabled={!confirmed || deleting}><Trash2 size={14} />{deleting ? "Deleting…" : "Delete"}</button></footer>
      </section>
    </div>
  );
}

function ResetWorkspaceDialog({ onClose, onExport, onReset }: { onClose: () => void; onExport: () => Promise<void>; onReset: () => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function reset() {
    if (!confirmed) return;
    setResetting(true);
    try {
      await onReset();
      onClose();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-workspace-title">
      <section className="finish-dialog reset-workspace-dialog">
        <header><div className="finish-icon finish-icon--danger"><AlertTriangle size={18} /></div><div><span>Destructive action</span><h2 id="reset-workspace-title">Reset local workspace?</h2></div></header>
        <p>This permanently removes every local class, student, session, attendance record and assessment observation. RubriLab will then restore only its fictional starter workspace.</p>
        <div className="reset-workspace-dialog__warning"><AlertTriangle size={16} /><span>This cannot be undone in RubriLab. Export a backup before continuing.</span></div>
        <label className="reset-workspace-dialog__confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I understand that my local records will be deleted.</label>
        <footer><button type="button" className="button-quiet" onClick={onClose} disabled={resetting}>Cancel</button><button type="button" className="button-secondary" onClick={() => void onExport()} disabled={resetting}><Download size={14} />Backup</button><button type="button" className="delete-session-button" onClick={() => void reset()} disabled={!confirmed || resetting}><RotateCcw size={14} />{resetting ? "Resetting…" : "Reset"}</button></footer>
      </section>
    </div>
  );
}

export function SettingsView({ data, onReload }: { data: LabData; onReload: () => Promise<void> }) {
  const [editingPreset, setEditingPreset] = useState<AssessmentPreset | null>(null);
  const [showNewPreset, setShowNewPreset] = useState(false);
  const [deletePreset, setDeletePreset] = useState<AssessmentPreset | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  async function exportData() {
    const snapshot = await repositories.exportSnapshot();
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "rubrilab-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function resetWorkspace() {
    await repositories.resetDemo();
    await onReload();
  }

  return (
    <div className="view-stack">
      <div className="view-intro">
        <div><span className="eyebrow">Workspace configuration</span><h1>Settings</h1><p>Subject presets are starting points and can evolve without changing historical evidence.</p></div>
      </div>
      <section className="surface">
        <div className="surface__header">
          <div><h2>Classroom data</h2><p>Import the school roster in CSV or JSON with classes, students and laboratory groups.</p></div>
          <div className="surface__actions"><button className="button-secondary" type="button" onClick={() => setShowImport(true)}><Upload size={15} />Import</button></div>
        </div>
      </section>
      <section className="surface">
        <div className="surface__header"><div><h2>Assessment presets</h2><p>Configure the criteria available for teams and individuals in future sessions.</p></div><button type="button" className="button-secondary" onClick={() => setShowNewPreset(true)}><Plus size={15} />New</button></div>
        <div className="preset-grid">
          {data.presets.map((preset) => {
            const criteria = preset.criterionIds
              .map((id) => data.criteria.find((criterion) => criterion.id === id))
              .filter((criterion) => criterion !== undefined);
            const useCount = data.sessions.filter((session) => session.teamPresetId === preset.id || session.individualPresetId === preset.id).length;
            return (
              <article className="preset-card" key={preset.id}>
                <div className="preset-card__head">
                  <div><span className="preset-scope">{preset.scope}</span><h3>{preset.name}</h3></div>
                      <span className="active-check"><Check size={13} />{preset.active ? (useCount ? `Used in ${useCount}` : "Available") : "Hidden"}</span>
                    </div>
                    <ol>{criteria.map((criterion) => <li key={criterion.id}><span>{criterion.position + 1}</span>{criterion.name}</li>)}</ol>
                    <div className="preset-card__actions"><button type="button" className="preset-card__edit" onClick={() => setEditingPreset(preset)}><Pencil size={14} />Edit</button><button type="button" className="preset-card__delete" onClick={() => setDeletePreset(preset)}><Trash2 size={14} />Delete</button></div>
                  </article>
            );
          })}
        </div>
      </section>
      {editingPreset && <PresetEditorDialog preset={editingPreset} data={data} onClose={() => setEditingPreset(null)} onSaved={onReload} onDelete={() => { setDeletePreset(editingPreset); setEditingPreset(null); }} />}
      {showNewPreset && <PresetEditorDialog data={data} onClose={() => setShowNewPreset(false)} onSaved={onReload} />}
      {deletePreset && <DeletePresetDialog preset={deletePreset} onClose={() => setDeletePreset(null)} onDeleted={onReload} />}
      {showResetConfirmation && <ResetWorkspaceDialog onClose={() => setShowResetConfirmation(false)} onExport={exportData} onReset={resetWorkspace} />}
      {showImport && <StudentImportDialog classrooms={data.classrooms} students={data.students} defaultClassroomId={undefined} onClose={() => setShowImport(false)} onImported={async (summary) => { await onReload(); setImportNotice(`${summary.createdStudents} added · ${summary.updatedStudents} updated${summary.createdClassrooms ? ` · ${summary.createdClassrooms} classes created` : ""}`); window.setTimeout(() => setImportNotice(null), 3500); }} />}
      {importNotice && <p className="session-toast" role="status"><Check size={14} />{importNotice}</p>}
      <section className="surface">
        <div className="surface__header">
          <div><h2>Local data</h2><p>Stored on this device. Back up before resetting.</p></div>
          <div className="surface__actions">
          <button className="button-secondary" type="button" onClick={() => void exportData()}><Download size={15} />Backup</button>
          <button className="button-quiet" type="button" onClick={() => setShowResetConfirmation(true)}><RotateCcw size={15} />Reset</button>
          </div>
        </div>
      </section>
    </div>
  );
}
