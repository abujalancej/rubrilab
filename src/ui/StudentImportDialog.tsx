"use client";

import { useState } from "react";
import { FileJson, FileSpreadsheet, Upload, X } from "lucide-react";
import { repositories } from "@/src/data/dexie";
import { buildStudentImportPlan, parseStudentImport, type StudentImportParseResult } from "@/src/data/studentImport";
import type { Classroom, Student } from "@/src/domain/model";

interface ImportSummary {
  createdStudents: number;
  updatedStudents: number;
  createdClassrooms: number;
}

function currentAcademicYear(): string {
  const today = new Date();
  const firstYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return `${firstYear}–${String(firstYear + 1).slice(-2)}`;
}

export function StudentImportDialog({
  classrooms,
  students,
  defaultClassroomId,
  onClose,
  onImported,
}: {
  classrooms: Classroom[];
  students: Student[];
  defaultClassroomId?: string;
  onClose: () => void;
  onImported: (summary: ImportSummary) => Promise<void>;
}) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<StudentImportParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedClassroom = classrooms.find((item) => item.id === defaultClassroomId);

  async function selectFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    if (!file) return;
    if (!/\.(csv|json)$/i.test(file.name)) {
      setError("Choose a .csv or .json file.");
      return;
    }
    try {
      const result = parseStudentImport(await file.text(), file.name);
      if (result.rows.some((row) => !row.className)) {
        result.errors.push("Every row in a classroom package needs a class value.");
      }
      setFileName(file.name);
      setParsed(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The file could not be read.");
    }
  }

  async function importRows() {
    if (!parsed?.rows.length || parsed.errors.length) return;
    setSaving(true);
    setError(null);
    try {
      const plan = buildStudentImportPlan(
        parsed.rows,
        classrooms,
        students,
        defaultClassroomId,
        selectedClassroom?.academicYear ?? currentAcademicYear(),
      );
      await Promise.all(plan.classrooms.map((classroom) => repositories.classrooms.put(classroom)));
      await Promise.all(plan.students.map((student) => repositories.students.put(student)));
      await onImported(plan);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The students could not be imported.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="student-import-title">
      <section className="session-dialog student-import-dialog">
        <header>
          <span className="finish-icon"><Upload size={18} /></span>
          <div><span>Classroom package</span><h2 id="student-import-title">Import classes, students and groups</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close import"><X size={16} /></button>
        </header>

        <p className="session-dialog__hint">
          Import one CSV or JSON package supplied by the school. Every row must identify its class and laboratory group; existing students are matched by school ID, or by name within the class, without creating duplicates.
        </p>

        <div className="import-format-grid">
          <div><FileSpreadsheet size={19} /><strong>CSV</strong><span>Comma, semicolon or tab separated</span></div>
          <div><FileJson size={19} /><strong>JSON</strong><span>List, students, alumnos or alumnes</span></div>
        </div>

        <label className="import-file-control">
          <Upload size={17} />
          <span><strong>{fileName || "Choose a roster file"}</strong><small>.csv or .json · processed only on this device</small></span>
          <input type="file" accept=".csv,.json,text/csv,application/json" onChange={(event) => void selectFile(event.target.files?.[0])} />
        </label>

        <div className="import-columns-note">
          <strong>Required:</strong> first name, last name, class and laboratory group. <strong>Optional:</strong> school ID.
        </div>

        {parsed && (
          <div className="import-preview">
            <div className="import-preview__summary">
              <strong>{parsed.rows.length} valid student{parsed.rows.length === 1 ? "" : "s"}</strong>
              <span>{new Set(parsed.rows.map((row) => row.groupName)).size} groups · {parsed.errors.length} errors</span>
            </div>
            {parsed.rows.length > 0 && (
              <div className="import-preview__table">
                <div><strong>Student</strong><strong>Class</strong><strong>Group</strong></div>
                {parsed.rows.slice(0, 8).map((row, index) => (
                  <div key={`${row.externalId ?? row.firstName}-${index}`}>
                    <span>{row.lastName}, {row.firstName}</span>
                    <span>{row.className ?? selectedClassroom?.name ?? "—"}</span>
                    <strong>{row.groupName}</strong>
                  </div>
                ))}
                {parsed.rows.length > 8 && <p>+ {parsed.rows.length - 8} more students</p>}
              </div>
            )}
            {parsed.errors.length > 0 && (
              <div className="import-errors" role="alert">
                {parsed.errors.slice(0, 5).map((message) => <p key={message}>{message}</p>)}
                {parsed.errors.length > 5 && <p>And {parsed.errors.length - 5} more errors.</p>}
              </div>
            )}
          </div>
        )}

        {error && <p className="session-dialog__error" role="alert">{error}</p>}
        <footer>
          <button className="button-quiet" type="button" onClick={onClose}>Cancel</button>
          <button className="button-secondary" type="button" disabled={saving || !parsed?.rows.length || Boolean(parsed.errors.length)} onClick={() => void importRows()}>
            <Upload size={14} />{saving ? "Importing…" : "Import classroom package"}
          </button>
        </footer>
      </section>
    </div>
  );
}
