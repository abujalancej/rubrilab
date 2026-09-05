export const subjectAreas = [
  "robotics",
  "digital-electronics",
  "3d-printing",
  "generic",
] as const;

export const sessionStatuses = ["draft", "active", "completed"] as const;
export const teamStatuses = [
  "not-started",
  "working",
  "needs-help",
  "finished",
] as const;
export const attendanceStatuses = [
  "present",
  "absent",
  "late",
  "left-early",
  "partial",
] as const;
export const attendanceReasons = [
  "authorised",
  "medical",
  "school-activity",
  "other",
] as const;

export type SubjectArea = (typeof subjectAreas)[number];
export type SessionStatus = (typeof sessionStatuses)[number];
export type TeamOperationalStatus = (typeof teamStatuses)[number];
export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type AttendanceReason = (typeof attendanceReasons)[number];
export type AssessmentScore = 1 | 2 | 3 | 4;
export type TeacherSupportLevel = 0 | 1 | 2 | 3;
export type CriterionScope = "team" | "individual";

export interface Classroom {
  id: string;
  name: string;
  academicYear: string;
  active: boolean;
}

export interface Student {
  id: string;
  classroomId: string;
  firstName: string;
  lastName: string;
  shortName?: string;
  active: boolean;
}

export interface LabSession {
  id: string;
  classroomId: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  subjectArea: SubjectArea;
  status: SessionStatus;
  notes?: string;
}

export interface SessionTeam {
  id: string;
  sessionId: string;
  name: string;
  /** Snapshot of membership for this session; never linked to a persistent team. */
  studentIds: string[];
  operationalStatus: TeamOperationalStatus;
  note?: string;
}

export interface AttendanceEvent {
  id: string;
  timestamp: string;
  kind: "entered" | "present" | "arrived-late" | "left-early" | "returned";
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  reason?: AttendanceReason;
  events: AttendanceEvent[];
  note?: string;
}

export interface Criterion {
  id: string;
  name: string;
  scope: CriterionScope;
  subjectArea?: SubjectArea;
  presetId: string;
  position: number;
  active: boolean;
}

export interface AssessmentPreset {
  id: string;
  name: string;
  subjectArea: SubjectArea;
  scope: CriterionScope;
  criterionIds: string[];
  active: boolean;
}

export interface TeamObservation {
  id: string;
  teamId: string;
  sessionId: string;
  criterionId: string;
  /** Missing means “Not observed”; zero is invalid. */
  score?: AssessmentScore;
  note?: string;
  timestamp: string;
}

export interface TeacherAssistance {
  id: string;
  teamId: string;
  sessionId: string;
  level: TeacherSupportLevel;
  interventionCount?: number;
  note?: string;
  timestamp: string;
}

export interface PracticalResult {
  id: string;
  teamId: string;
  sessionId: string;
  score?: AssessmentScore;
  note?: string;
  timestamp: string;
}

export interface IndividualObservation {
  id: string;
  studentId: string;
  sessionId: string;
  criterionId: string;
  score?: AssessmentScore;
  note?: string;
  timestamp: string;
}

export const behaviourCategories = [
  "distracted",
  "repeated-distraction",
  "distracts-team",
  "interrupts-class",
  "inappropriate-equipment-use",
  "does-not-follow-instructions",
  "unsafe-behaviour",
  "conflict-with-classmates",
  "inappropriate-phone-use",
  "helps-teammates",
  "takes-initiative",
  "responsible-equipment-use",
  "supports-another-student",
  "good-attitude",
  "other",
] as const;

export interface BehaviourObservation {
  id: string;
  studentId: string;
  sessionId: string;
  type: "positive" | "incident";
  category: (typeof behaviourCategories)[number];
  note?: string;
  timestamp: string;
}

export interface LabSnapshot {
  classrooms: Classroom[];
  students: Student[];
  sessions: LabSession[];
  teams: SessionTeam[];
  attendance: AttendanceRecord[];
  presets: AssessmentPreset[];
  criteria: Criterion[];
  teamObservations: TeamObservation[];
  teacherAssistance: TeacherAssistance[];
  practicalResults: PracticalResult[];
  individualObservations: IndividualObservation[];
  behaviourObservations: BehaviourObservation[];
}
