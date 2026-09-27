import type { Classroom, Student } from "@/src/domain/model";

export interface ImportedStudentRow {
  externalId?: string;
  firstName: string;
  lastName: string;
  className?: string;
  groupName: string;
}

export interface StudentImportParseResult {
  rows: ImportedStudentRow[];
  errors: string[];
}

export interface StudentImportPlan {
  classrooms: Classroom[];
  students: Student[];
  createdStudents: number;
  updatedStudents: number;
  createdClassrooms: number;
}

const aliases = {
  externalId: ["id", "studentid", "alumnoid", "alumneid", "nia", "expediente", "identificador"],
  firstName: ["firstname", "nombre", "nom"],
  lastName: ["lastname", "apellidos", "apellido", "cognoms", "cognom"],
  firstLastName: ["primerapellido", "apellido1", "cognom1"],
  secondLastName: ["segundoapellido", "apellido2", "cognom2"],
  fullName: ["student", "alumno", "alumne", "nombrecompleto", "nomcomplet", "fullname"],
  groupName: ["group", "grupo", "grup", "agrupacion", "agrupacio", "team", "equipo", "subgrupo"],
  className: ["class", "clase", "classe", "classroom", "curso", "grupclasse", "grupoclase"],
} as const;

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function clean(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function pick(record: Record<string, unknown>, names: readonly string[]): string {
  const normalized = new Map(Object.entries(record).map(([key, value]) => [normalizeKey(key), value]));
  for (const name of names) {
    const value = clean(normalized.get(name));
    if (value) return value;
  }
  return "";
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  if (value.includes(",")) {
    const [lastName, ...rest] = value.split(",");
    return { firstName: rest.join(" ").trim(), lastName: lastName.trim() };
  }
  const parts = value.trim().split(/\s+/);
  if (parts.length < 2) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "" };
}

function toStudentRow(record: Record<string, unknown>): ImportedStudentRow {
  let firstName = pick(record, aliases.firstName);
  let lastName = pick(record, aliases.lastName);
  if (!lastName) {
    lastName = [pick(record, aliases.firstLastName), pick(record, aliases.secondLastName)].filter(Boolean).join(" ");
  }
  if (!firstName || !lastName) {
    const split = splitFullName(pick(record, aliases.fullName));
    firstName ||= split.firstName;
    lastName ||= split.lastName;
  }
  return {
    externalId: pick(record, aliases.externalId) || undefined,
    firstName,
    lastName,
    className: pick(record, aliases.className) || undefined,
    groupName: pick(record, aliases.groupName),
  };
}

function countDelimiter(line: string, delimiter: string): number {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    else if (!quoted && line[index] === delimiter) count += 1;
  }
  return count;
}

function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].sort((a, b) => countDelimiter(firstLine, b) - countDelimiter(firstLine, a))[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function validateRows(records: Record<string, unknown>[]): StudentImportParseResult {
  const rows: ImportedStudentRow[] = [];
  const errors: string[] = [];
  records.forEach((record, index) => {
    const row = toStudentRow(record);
    const missing = [!row.firstName && "first name", !row.lastName && "last name", !row.groupName && "group"].filter(Boolean);
    if (missing.length) errors.push(`Row ${index + 2}: missing ${missing.join(", ")}.`);
    else rows.push(row);
  });
  return { rows, errors };
}

export function parseStudentImport(text: string, fileName: string): StudentImportParseResult {
  if (fileName.toLocaleLowerCase().endsWith(".json")) {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return { rows: [], errors: ["The JSON file is not valid."] };
    }
    if (!Array.isArray(value) && value && typeof value === "object") {
      const root = value as Record<string, unknown>;
      value = root.students ?? root.alumnos ?? root.alumnes ?? root.records ?? root.data;
    }
    if (!Array.isArray(value)) return { rows: [], errors: ["JSON must contain a list of students."] };
    return validateRows(value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)));
  }

  const data = parseDelimited(text.replace(/^\uFEFF/, ""));
  if (data.length < 2) return { rows: [], errors: ["The CSV file has no student rows."] };
  const [headers, ...values] = data;
  const records = values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
  return validateRows(records);
}

function normalizedIdentity(value: string): string {
  return normalizeKey(value);
}

export function buildStudentImportPlan(
  rows: ImportedStudentRow[],
  existingClassrooms: Classroom[],
  existingStudents: Student[],
  defaultClassroomId: string | undefined,
  academicYear: string,
): StudentImportPlan {
  const classrooms = [...existingClassrooms];
  const students = [...existingStudents];
  const changedStudents: Student[] = [];
  const changedClassrooms: Classroom[] = [];
  let createdStudents = 0;
  let updatedStudents = 0;

  for (const row of rows) {
    let classroom = row.className
      ? classrooms.find((item) => normalizedIdentity(item.name) === normalizedIdentity(row.className ?? ""))
      : classrooms.find((item) => item.id === defaultClassroomId);
    if (!classroom && row.className) {
      classroom = { id: `class-${crypto.randomUUID()}`, name: row.className, academicYear, active: true };
      classrooms.push(classroom);
      changedClassrooms.push(classroom);
    }
    if (!classroom) throw new Error("Choose a class, or include a class column in every row.");

    const externalMatch = row.externalId
      ? students.find((item) => item.externalId && normalizedIdentity(item.externalId) === normalizedIdentity(row.externalId ?? ""))
      : undefined;
    const nameMatch = students.find((item) => item.classroomId === classroom?.id
      && normalizedIdentity(item.firstName) === normalizedIdentity(row.firstName)
      && normalizedIdentity(item.lastName) === normalizedIdentity(row.lastName));
    const existing = externalMatch ?? nameMatch;
    const student: Student = existing ? {
      ...existing,
      externalId: row.externalId ?? existing.externalId,
      classroomId: classroom.id,
      firstName: row.firstName,
      lastName: row.lastName,
      groupName: row.groupName,
      active: true,
    } : {
      id: `student-${crypto.randomUUID()}`,
      externalId: row.externalId,
      classroomId: classroom.id,
      firstName: row.firstName,
      lastName: row.lastName,
      shortName: row.firstName,
      groupName: row.groupName,
      active: true,
    };
    const index = existing ? students.findIndex((item) => item.id === existing.id) : -1;
    if (index >= 0) {
      students[index] = student;
      updatedStudents += 1;
    } else {
      students.push(student);
      createdStudents += 1;
    }
    const changedIndex = changedStudents.findIndex((item) => item.id === student.id);
    if (changedIndex >= 0) changedStudents[changedIndex] = student;
    else changedStudents.push(student);
  }

  return {
    classrooms: changedClassrooms,
    students: changedStudents,
    createdStudents,
    updatedStudents,
    createdClassrooms: changedClassrooms.length,
  };
}
